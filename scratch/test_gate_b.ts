import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { pool, db } from "../server/db";
import { skippedLowValue } from "../shared/schema";
import { desc } from "drizzle-orm";

async function run() {
  try {
    console.log("Starting Gate B and database integration test...");

    // Mock post simulating a Thai municipal meeting with no incident markers
    const mockPost = {
      title: "การประชุมสภาเทศบาลตำบลวิชิต",
      content: "เปิดการประชุมสภาสมัยสามัญประจำปี 2026 เพื่อหารืองบประมาณประจำปีและรายงานผลการดำเนินงาน",
      sourceUrl: `https://facebook.com/mock-post-test-${Date.now()}`
    };

    console.log("Mock post title:", mockPost.title);
    console.log("Mock post content:", mockPost.content);

    // Gate B Logic
    const MEETING_CEREMONY = ["ประชุม", "ประชุมสภา", "สมัยสามัญ", "พิธี", "มอบ", "แถลง", "เปิดงาน", "ลงพื้นที่"];
    const INCIDENT_MARKERS = ["อุบัติเหตุ", "ชน", "จับ", "จับกุม", "ยิง", "ไฟไหม้", "จม", "เสียชีวิต", "บาดเจ็บ", "ทะเลาะ", "ปล้น", "ขโมย"];

    const combinedCaption = `${mockPost.title || ""} ${mockPost.content || ""}`;
    const detectedMeetingMarkers = MEETING_CEREMONY.filter(marker => combinedCaption.includes(marker));
    const hasMeetingCeremony = detectedMeetingMarkers.length > 0;
    const hasIncident = INCIDENT_MARKERS.some(marker => combinedCaption.includes(marker));

    console.log("\n--- Running Gate B Filter ---");
    console.log("Detected meeting/ceremony markers:", detectedMeetingMarkers);
    console.log("Has incident markers:", hasIncident);

    if (hasMeetingCeremony && !hasIncident) {
      console.log("🎯 Gate B Matched! Skipping post and logging to skipped_low_value.");
      
      const inserted = await db.insert(skippedLowValue).values({
        sourceUrl: mockPost.sourceUrl,
        caption: combinedCaption,
        detectedMarkers: detectedMeetingMarkers
      }).returning();

      console.log("Successfully logged to database table 'skipped_low_value':");
      console.log(JSON.stringify(inserted, null, 2));

      // Retrieve all skipped low value logs from db to verify persistence
      const allSkipped = await db.select().from(skippedLowValue).orderBy(desc(skippedLowValue.timestamp)).limit(5);
      console.log(`\nVerified: skipped_low_value table now has ${allSkipped.length} entries.`);
      console.log("Latest entry:", allSkipped[0]);

    } else {
      console.log("❌ Gate B did not match (post accepted).");
    }

  } catch (error) {
    console.error("Database query failed:", error);
  }
  process.exit(0);
}

run();
