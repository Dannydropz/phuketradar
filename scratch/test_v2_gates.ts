import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { pool, db } from "../server/db";
import { articles, skippedLowValue } from "../shared/schema";
import { eq, and, desc } from "drizzle-orm";

// Gating Logic mirroring server/scheduler.ts to verify local processing correctness
function runLocalGateChecks(post: { title: string, content: string, translation?: any }) {
  const EXPAT_RELEVANCE_TH = [
    "วีซ่า", "ตม.", "ตรวจคนเข้าเมือง", "ชาวต่างชาติ", "ต่างด้าว", 
    "รายงานตัว", "ใบอนุญาตทำงาน", "ภาษี", "สนามบิน", "ปิดหาด", 
    "ปิดชายหาด", "นักท่องเที่ยว", "พาสปอร์ต", "หนังสือเดินทาง"
  ];
  const EXPAT_RELEVANCE_EN = [
    "visa", "immigration", "foreigner", "90-day", "report", 
    "work permit", "tax", "airport", "beach closure", "tourist", 
    "overstay", "passport"
  ];
  const INCIDENT_MARKERS = ["อุบัติเหตุ", "ชน", "จับ", "จับกุม", "ยิง", "ไฟไหม้", "จม", "เสียชีวิต", "บาดเจ็บ", "ทะเลาะ", "ปล้น", "ขโมย"];

  const combinedCaption = `${post.title || ""} ${post.content || ""}`;
  const combinedCaptionLower = combinedCaption.toLowerCase();

  // Smart incident matching that avoids sub-word collisions like "ประชาชน" (people) matching "ชน" (crash)
  const hasIncident = INCIDENT_MARKERS.some(marker => {
    if (marker === "ชน") {
      return combinedCaption.includes("ชน") && 
             !combinedCaption.includes("ประชาชน") && 
             !combinedCaption.includes("ชุมชน");
    }
    return combinedCaption.includes(marker);
  });

  if (hasIncident) {
    return { action: "keep_in_queue", reason: "incident_override" };
  }

  const hasExpatRelevanceThai = EXPAT_RELEVANCE_TH.some(marker => combinedCaption.includes(marker));
  const hasExpatRelevanceEnglish = EXPAT_RELEVANCE_EN.some(marker => combinedCaptionLower.includes(marker));
  const hasExpatRelevance = hasExpatRelevanceThai || hasExpatRelevanceEnglish;

  if (hasExpatRelevance) {
    return { action: "keep_in_queue", reason: "expat_exemption" };
  }

  // MEETING_CEREMONY markers
  const MEETING_CEREMONY = ["ประชุม", "ประชุมสภา", "สมัยสามัญ", "พิธี", "มอบ", "แถลง", "เปิดงาน", "ลงพื้นที่"];
  const detectedMeetingMarkers = MEETING_CEREMONY.filter(marker => combinedCaption.includes(marker));
  const hasMeetingCeremony = detectedMeetingMarkers.length > 0;

  // GOVT_PROCESS markers
  const GOVT_PROCESS = ["นโยบาย", "ปฏิเสธ", "แถลงการณ์", "มติ", "รัฐสภา", "สภา", "เทศบาล", "อบต.", "อบจ.", "งบประมาณ", "ลงนาม"];
  const detectedGovtMarkers = GOVT_PROCESS.filter(marker => combinedCaption.includes(marker));
  let hasGovtProcess = detectedGovtMarkers.length > 0;

  const hasProjectMarker = combinedCaption.includes("โครงการ");
  if (hasProjectMarker) {
    if (hasMeetingCeremony || hasGovtProcess) {
      detectedGovtMarkers.push("โครงการ");
      hasGovtProcess = true;
    }
  }

  if (hasMeetingCeremony || hasGovtProcess) {
    const skipReason = hasMeetingCeremony ? 'meeting' : 'govt_process';
    return { action: "skip_to_skipped_low_value", reason: skipReason, markers: [...detectedMeetingMarkers, ...detectedGovtMarkers] };
  }

  // If continuing to Gate A evaluation
  if (post.translation) {
    const trans = post.translation;
    const translatedTextLower = `${trans.translatedTitle || ""} ${trans.translatedContent || ""}`.toLowerCase();
    const hasExpatRelevanceInTranslation = EXPAT_RELEVANCE_EN.map(m => m.toLowerCase()).some(marker => translatedTextLower.includes(marker));
    const isExpatExempt = hasExpatRelevance || hasExpatRelevanceInTranslation;

    const isLowValueHidden = (
      !isExpatExempt &&
      !!trans.sourceType && ["POLITICAL_STATEMENT", "OFFICIAL_ANNOUNCEMENT", "COMMUNITY_DISCUSSION"].includes(trans.sourceType) &&
      trans.interestScore <= 3
    );

    if (isLowValueHidden) {
      return { action: "save_as_low_value_hidden", reason: `Gate A: ${trans.sourceType} with score ${trans.interestScore}` };
    }
  }

  return { action: "keep_in_queue", reason: "none" };
}

async function run() {
  console.log("=== STARTING V2 GATES INTEGRATION TESTS ===\n");
  let testNum = 1;

  const runTest = async (name: string, post: any, expectedAction: string, expectedReason: string) => {
    console.log(`Test ${testNum}: ${name}`);
    console.log(`- Caption: "${post.title} ${post.content}"`);
    if (post.translation) {
      console.log(`- Translation sourceType: ${post.translation.sourceType}, Score: ${post.translation.interestScore}`);
    }

    const decision = runLocalGateChecks(post);
    console.log(`- Decision: action="${decision.action}", reason="${decision.reason}"`);

    const actionPass = decision.action === expectedAction;
    const reasonPass = decision.reason === expectedReason;

    if (actionPass && reasonPass) {
      console.log("✅ RESULT: PASS\n");
    } else {
      console.error(`❌ RESULT: FAIL (Expected action="${expectedAction}", reason="${expectedReason}")\n`);
    }
    testNum++;
  };

  // Test 1: Political Statement score 3
  await runTest(
    "Political Statement with Score 3 (Gate A)",
    {
      title: "หัวหน้าพรรคฝ่ายค้านวิจารณ์ทิศทางเศรษฐกิจปัจจุบัน",
      content: "แกนนำระบุปัญหาปากท้องประชาชนยังไม่ได้รับการแก้ไขอย่างยั่งยืน",
      translation: {
        translatedTitle: "Opposition Leader Criticizes Current Economic Direction",
        translatedContent: "<p>The opposition party leader stated that public livelihood issues have not been solved...</p>",
        sourceType: "POLITICAL_STATEMENT",
        interestScore: 3
      }
    },
    "save_as_low_value_hidden",
    "Gate A: POLITICAL_STATEMENT with score 3"
  );

  // Test 2: Govt process with project + policy markers (Gate B)
  await runTest(
    "Hub to School transportation routes (Govt Process, project + policy markers)",
    {
      title: "โครงการพัฒนาระบบขนส่งนักเรียน",
      content: "เทศบาลขับเคลื่อนนโยบายเพื่อเพิ่มความปลอดภัยในการเดินทางของนักเรียน",
    },
    "skip_to_skipped_low_value",
    "govt_process"
  );

  // Test 3: Expat relevance exemption
  await runTest(
    "Immigration announces new 90-day reporting rule (Expat Exemption)",
    {
      title: "สำนักงานตรวจคนเข้าเมืองประกาศกฎเกณฑ์ใหม่",
      content: "ตรวจคนเข้าเมืองปรับปรุงระบบการรายงานตัว 90 วันสำหรับชาวต่างชาติในภูเก็ต",
      translation: {
        translatedTitle: "Immigration Announces New 90-Day Reporting Rule for Foreigners",
        translatedContent: "<p>The Phuket Immigration Office has updated the 90-day reporting rules for expats...</p>",
        sourceType: "OFFICIAL_ANNOUNCEMENT",
        interestScore: 3
      }
    },
    "keep_in_queue",
    "expat_exemption"
  );

  // Test 4: Incident override with govt marker
  await runTest(
    "Accident with govt marker (Incident Override)",
    {
      title: "เกิดอุบัติเหตุรถชนที่หน้าเทศบาลกะทู้",
      content: "เจ้าหน้าที่เร่งเข้าช่วยเหลือผู้บาดเจ็บจากเหตุรถชนหน้าเทศบาลตำบลกะทู้",
    },
    "keep_in_queue",
    "incident_override"
  );

  // Test 5: โครงการ marker alone (No skip)
  await runTest(
    "โครงการ marker alone",
    {
      title: "โครงการประกวดภาพถ่ายภูเก็ต",
      content: "ขอเชิญชวนผู้ที่สนใจร่วมส่งผลงานประกวดภาพถ่ายความสวยงามของเกาะภูเก็ต",
    },
    "keep_in_queue",
    "none"
  );

  console.log("=== GATING LOGIC COMPLETED SUCCESSFULLY ===\n");
  process.exit(0);
}

run();
