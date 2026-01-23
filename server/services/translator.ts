import OpenAI from "openai";
import { translate } from "@vitalets/google-translate-api";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranslationResult {
  translatedTitle: string;
  translatedContent: string;
  excerpt: string;
  category: string;
  isActualNews: boolean;
  interestScore: number;
  isDeveloping: boolean;
  embedding?: number[];
  facebookHeadline?: string;
  needsReview?: boolean;
  reviewReason?: string;
}

// BLOCKED KEYWORDS - Auto-reject these stories due to legal/editorial policy
// CRITICAL: Lese majeste laws in Thailand make royal family content extremely risky
const BLOCKED_KEYWORDS = [
  // Thai royal family terms
  "พระราชา", // King
  "ในหลวง", // His Majesty (informal)
  "พระบาทสมเด็จพระเจ้าอยู่หัว", // His Majesty the King (formal)
  "สมเด็จพระนางเจ้า", // Her Majesty the Queen
  "พระราชวงศ์", // Royal family
  "ภูมิพลอดุลยเดช", // King Bhumibol Adulyadej (Rama IX)
  "รัชกาลที่", // Reign/Era (usually precedes royal names)
  "พระมหากษัตริย์", // Monarch
  "สถาบันพระมหากษัตริย์", // Monarchy institution
  "King Bhumibol", // English
  "King Rama", // English
  "Thai King", // English
  "Thai royal", // English
  "monarchy", // English
  "majesty", // English (usually in royal context)
];

// High-priority keywords that boost interest scores (urgent/dramatic news)
// Note: "อุบัติเหตุ" (accident) removed - too generic, boosts infrastructure complaints
// GPT's improved scoring guidance now handles real accidents vs. damage reports
const HOT_KEYWORDS = [
  "ไฟไหม้", // fire
  "จมน้ำ", // drowning
  "จับกุม", // arrest
  "พายุ", // storm
  "ฝนตกหนัก", // heavy rain
  "โจร", // thief/robber
  "เสียชีวิต", // death/died
  "บาดเจ็บ", // injured
  "ตาย", // dead
  "ฆ่า", // kill
  "ยิง", // shoot
  "แทง", // stab
  "ชน", // collision/crash
  "รถชน", // car crash
  "ขับหนี", // hit and run
  "หนีหาย", // fled/escaped
  "สาหัส", // seriously injured
  "ระเบิด", // explosion
  "โจรกรรม", // robbery
  // FOREIGNER KEYWORDS - These stories go viral with expat audience
  "ต่างชาติ", // foreigner
  "ฝรั่ง", // farang (Western foreigner)
  "นักท่องเที่ยว", // tourist
  "ชาวต่างประเทศ", // foreign national
  "ทะเลาะวิวาท", // fight/brawl/quarrel
  "ทำร้ายร่างกาย", // assault/physical attack
  "ปะทะ", // clash/confrontation
  "ทะเลาะ", // quarrel/argue
  "ชกต่อย", // fistfight
  "ตบตี", // slap/hit fight
  // BOAT/MARITIME KEYWORDS - Critical for Phuket tourism news
  // Many tourist incidents occur on boat tours to Phi Phi, Kai Island, Similan, etc.
  "เรือ", // boat (general)
  "เรือเร็ว", // speedboat
  "สปีดโบ๊ท", // speedboat (transliteration)
  "เรือชน", // boat collision
  "เรือล่ม", // boat capsized
  "เรือจม", // boat sinking
  "ล่ม", // capsized
  "อับปาง", // shipwreck
  "speedboat",
  "boat collision",
  "boat accident",
  "capsized",
  "ferry", // ferry incidents
  "longtail", // longtail boat accidents
  "เรือหางยาว", // longtail boat (Thai)
  // DRUG/CRIME KEYWORDS - Critical for proper context interpretation
  "ยาเสพติด", // drugs/narcotics
  "โคเคน", // cocaine
  "ยาบ้า", // methamphetamine/yaba
  "กัญชา", // cannabis/marijuana
  "ยาไอซ์", // ice/crystal meth
  "เฮโรอีน", // heroin
  "แก๊ง", // gang
  "ค้ายา", // drug dealing
  "ขายยา", // selling drugs
  "QR", // QR code (often drug-related stickers)
  "คิวอาร์", // QR code (Thai)
  "สติ๊กเกอร์", // sticker (often drug ads)
  "ติดประกาศ", // posting/sticking notices
  "โฆษณา", // advertisement (illegal product ads)
  "Telegram", // often drug sales channel
  "เทเลแกรม", // Telegram (Thai)
];

// FEEL-GOOD / VIRAL POSITIVE keywords that boost interest scores
// These heartwarming stories go viral and drive engagement - especially with expat audience
const FEEL_GOOD_KEYWORDS = [
  // WILDLIFE / ANIMAL CONSERVATION - Always viral
  "เต่าทะเล", // sea turtle
  "เต่า", // turtle
  "วางไข่", // laying eggs / nesting
  "ฟักไข่", // hatching eggs
  "ลูกเต่า", // baby turtle
  "ปล่อยเต่า", // releasing turtles
  "โลมา", // dolphin
  "ปลาวาฬ", // whale
  "ฉลามวาฬ", // whale shark
  "กระเบนราหู", // manta ray
  "ช้าง", // elephant
  "ลิง", // monkey
  "นก", // bird (general)
  "นกเงือก", // hornbill
  "สัตว์ป่า", // wildlife
  "สัตว์หายาก", // rare animal
  "อนุรักษ์", // conservation
  "ปล่อยคืนธรรมชาติ", // release back to nature
  "ช่วยชีวิตสัตว์", // rescue animal
  "พันธุ์หายาก", // rare species
  "ทะเลสาบ", // lake (often wildlife context)
  "ปะการัง", // coral
  "ฟื้นฟูปะการัง", // coral restoration
  // English wildlife keywords (from translated content)
  "sea turtle",
  "turtle eggs",
  "turtle nest",
  "turtle nesting",
  "baby turtles",
  "hatchling",
  "dolphin",
  "whale",
  "whale shark",
  "manta ray",
  "elephant",
  "wildlife",
  "conservation",
  "endangered",
  "rare species",
  "coral reef",
  "marine life",
  "marine conservation",
  // GOOD SAMARITAN / RESCUE STORIES
  "ช่วยเหลือ", // help/rescue (in positive context)
  "กู้ชีพ", // rescue (life-saving)
  "ช่วยชีวิต", // save life
  "คนดี", // good person
  "น้ำใจ", // kindness/generosity
  "ช่วยนักท่องเที่ยว", // help tourist
  "ช่วยฝรั่ง", // help foreigner
  "ส่งคืน", // return (lost items)
  "ส่งกระเป๋าคืน", // return bag
  "ซื่อสัตย์", // honest
  "ได้คืน", // got back (lost items)
  "good samaritan",
  "hero",
  "saved",
  "rescued",
  "returned wallet",
  "honest",
  "kindness",
  // POSITIVE FOREIGNER INVOLVEMENT
  "ฝรั่งช่วย", // foreigner helps
  "นักท่องเที่ยวช่วย", // tourist helps
  "ต่างชาติช่วย", // foreigner assists
  "expat hero",
  "tourist saves",
  "foreigner helps",
  "foreign volunteer",
  // COMMUNITY POSITIVE NEWS
  "ข่าวดี", // good news
  "ความสำเร็จ", // success
  "รางวัล", // award (in positive context)
  "ชุมชนรวมใจ", // community unites
  "น่ารัก", // cute/lovely (viral animal content)
  "heartwarming",
  "feel-good",
  "viral",
  "amazing",
  "incredible",
];

// Low-priority keywords that lower interest scores (routine/boring news)
const COLD_KEYWORDS = [
  "ประชุม", // meeting
  "มอบหมาย", // assign/delegate
  "สัมมนา", // seminar
  "แถลงข่าว", // press conference
  "โครงการ", // project/program
  "อบรม", // training
  "มอบของ", // giving/donation ceremony
  "พิธี", // ceremony
  "การประชุม", // conference
  "เตรียมความพร้อม", // preparation
  "ตรวจเยี่ยม", // inspection visit
  "ลงพื้นที่", // area visit
  "แก้ไขปัญหา", // solve problem/tackle issue
  "ดูแลเรื่อง", // take care of/address
  "ทำงานเพื่อ", // work to/work on
  "บรรเทา", // alleviate/ease
  "ร่วมกัน", // together/jointly (often in meeting contexts)
  "บริจาค", // donate/donation
  "บริจาคโลหิต", // blood donation
  "รับบริจาค", // receive donation
  "ช่วยเหลือ", // help/assist (charity context)
  "กุศล", // charity/merit
  // PROMOTIONAL/MALL EVENT KEYWORDS - These are NOT news, just marketing
  "มาสคอต", // mascot
  "mascot", // mascot (English)
  "ห้างสรรพสินค้า", // department store/mall
  "ศูนย์การค้า", // shopping center
  "Jungceylon", // Jungceylon mall
  "Central", // Central mall
  "Robinson", // Robinson mall
  "โปรโมชั่น", // promotion
  "ลดราคา", // sale/discount
  "เปิดตัว", // launch/unveil (product/mascot)
  "กิจกรรมส่งเสริม", // promotional activity
  "ถ่ายรูป", // photo opportunity
  "เฉลิมฉลอง", // celebration
  "สนุกสนาน", // fun/enjoyment (event context)
  "การแสดง", // performance/show
  "Hello Phuket", // Hello Phuket event
  "sustainability", // sustainability event
  "ความยั่งยืน", // sustainability (Thai)
  // REAL ESTATE / PROPERTY DEVELOPMENT - Business announcements, NOT breaking news
  // Per scoring guide: "Luxury hotel/villa launch" = Score 3 (business news, NOT breaking)
  "villa", // villa (English)
  "วิลล่า", // villa (Thai)
  "luxury villa", // luxury villa development
  "luxury development", // luxury development
  "property development", // property development
  "real estate", // real estate
  "อสังหาริมทรัพย์", // real estate (Thai)
  "คอนโด", // condo
  "condominium", // condominium
  "residential", // residential development
  "hotel development", // hotel development
  "resort development", // resort development
  "billion baht", // billion baht investment (routine business)
  "พันล้าน", // billion (Thai) - large investment announcements
  "investment", // investment news
  "การลงทุน", // investment (Thai)
  "transform", // area transformation/development
  "premier destination", // real estate marketing language
  "high-end", // high-end property
  "luxury market", // luxury market
  "property launch", // property launch
  "groundbreaking", // groundbreaking ceremony
  "TITLE", // TITLE (real estate developer brand)
  "Boat Pattana", // Boat Pattana (developer)
  // UNIVERSITY / STUDENT ANNOUNCEMENT KEYWORDS - Routine academic news, NOT breaking
  // Per: "Students win robotics award" = Score 3 (achievement, NOT urgent)
  "นักศึกษา", // student(s)
  "มหาวิทยาลัย", // university
  "ราชภัฏ", // Rajabhat (university type)
  "วิทยาลัย", // college
  "internship", // internship programs
  "intern", // intern placement
  "ฝึกงาน", // internship/training (Thai)
  "ฝึกประสบการณ์", // gain experience (Thai)
  "staffing", // staffing events
  "selected to staff", // selected to work at event
  "selected to work", // selected for job
  "partnership", // university partnership
  "MOU", // Memorandum of Understanding (common for academic agreements)
  "บันทึกข้อตกลง", // MOU (Thai)
  "students from", // students from university
  "university students", // university students
  // FOUNDATION / ORGANIZATIONAL / ADMINISTRATIVE NEWS - Routine governance, NOT breaking news
  // Per scoring guide: "Board appointments", "organizational changes" = Score 2-3 (routine administrative)
  "มูลนิธิ", // foundation (Thai)
  "foundation", // foundation (English)
  "แต่งตั้ง", // appoint/appointment
  "appoint", // appoint (English)
  "appointment", // appointment
  "กรรมการ", // director/board member
  "คณะกรรมการ", // board of directors
  "board of directors", // board of directors
  "temporary representative", // temporary representative
  "ตัวแทน", // representative
  "ลาออก", // resign/resignation
  "resignation", // resignation
  "สมาชิกสภา", // council member
  "องค์กร", // organization
  "organizational", // organizational
  "governance", // governance
  "administrative", // administrative
  "anniversary", // anniversary celebration
  "ครบรอบ", // anniversary (Thai)
  "internal", // internal organizational matters
  "restructuring", // organizational restructuring
  "legal proceedings", // legal proceedings (routine)
  "legal dispute", // legal dispute (internal org)
  "court case", // court case (unless crime)
];

// POLITICS KEYWORDS - Used to cap political stories at score 3 regardless of AI category
// Editorial decision: Politics important locally but low engagement with expat Facebook audience
const POLITICS_KEYWORDS = [
  // Thai political terms
  "เลือกตั้ง", // election
  "ส.ส.", // MP (Member of Parliament)
  "สมาชิกสภาผู้แทนราษฎร", // Member of Parliament (full)
  "นักการเมือง", // politician
  "พรรค", // party (political)
  "หาเสียง", // campaign/canvass
  "ผู้สมัคร", // candidate
  "ลงคะแนน", // vote/voting
  "การเมือง", // politics
  "นายก", // mayor/PM
  "รัฐบาล", // government
  "ฝ่ายค้าน", // opposition
  "สภา", // parliament/council
  "อบจ", // Provincial Administrative Organization
  "อบต", // Subdistrict Administrative Organization
  "เทศบาล", // municipality
  // English political terms (from translated content)
  "election",
  "campaign",
  "campaign atmosphere", // campaign events
  "election campaign",
  "candidate",
  "politician",
  "political party",
  "political event",
  "MP ", // Member of Parliament with space to avoid false matches
  "parliament",
  "voting",
  "vote",
  "voters",
  "ballot",
  "constituency",
  "People's Party", // Thai political party
  "Pheu Thai", // Thai political party
  "Move Forward", // Thai political party
  "Democrat Party", // Thai political party
  "Bhumjaithai", // Thai political party
  "encouraging residents to vote", // campaign messaging
  "encourage to vote",
];

// Phuket location context map for richer rewrites
const PHUKET_CONTEXT_MAP: Record<string, string> = {
  "ป่าตอง": "Patong, a major tourist beach area on Phuket's west coast",
  "Patong": "Patong, a major tourist beach area on Phuket's west coast",
  "กะตะ": "Kata, a family-friendly beach known for surfing",
  "Kata": "Kata, a family-friendly beach known for surfing",
  "ราวัย": "Rawai, a local seafood area in southern Phuket",
  "Rawai": "Rawai, a local seafood area in southern Phuket",
  "กมลา": "Kamala, a quiet beach community north of Patong",
  "Kamala": "Kamala, a quiet beach community north of Patong",
  "เมืองภูเก็ต": "Phuket Town, the island's cultural and administrative center",
  "Phuket Town": "Phuket Town, the island's cultural and administrative center",
  "ฉลอง": "Chalong, a district known for the Big Buddha and pier area",
  "Chalong": "Chalong, a district known for the Big Buddha and pier area",
  "กะรน": "Karon, a long beach popular with families and tourists",
  "Karon": "Karon, a long beach popular with families and tourists",
  "บางเทา": "Bang Tao, home to luxury resorts and Laguna Phuket",
  "Bang Tao": "Bang Tao, home to luxury resorts and Laguna Phuket",
  "สุรินทร์": "Surin, an upscale beach area with fine dining",
  "Surin": "Surin, an upscale beach area with fine dining",
  // PHUKET TOWN STREETS - Named after other Thai cities, DO NOT confuse with those cities!
  "ถนนกรุงเทพ": "Bangkok Road, a major road in PHUKET TOWN (NOT Bangkok city!)",
  "Bangkok Road": "Bangkok Road, a major road in PHUKET TOWN (NOT Bangkok city!)",
  "ถนนกระบี่": "Krabi Road, a road in PHUKET TOWN (NOT Krabi province!)",
  "Krabi Road": "Krabi Road, a road in PHUKET TOWN (NOT Krabi province!)",
  "ถนนพังงา": "Phang Nga Road, a major road in PHUKET TOWN (NOT Phang Nga province!)",
  "Phang Nga Road": "Phang Nga Road, a major road in PHUKET TOWN (NOT Phang Nga province!)",
  "ถนนทวีวงศ์": "Thaweewong Road, the main beach road in Patong",
  "Thaweewong Road": "Thaweewong Road, the main beach road in Patong",
  "ถนนราศฎร์อุทิศ 200 ปี": "Rat Uthit 200 Pee Road, a parallel road in Patong",
  "ถนนบางลา": "Bangla Road, Patong's famous walking street and nightlife area",
  "Bangla Road": "Bangla Road, Patong's famous walking street and nightlife area",
  "ซอยบางลา": "Bangla Road/Soi Bangla, Patong's famous nightlife strip",
  "ถนนเทพกษัตรี": "Thepkasattri Road, the main highway running north-south through Phuket",
  "Thepkasattri Road": "Thepkasattri Road, the main highway running north-south through Phuket",
  "ถนนวิชิต": "Wichit Road, a major road in Phuket Town",
  "ถนนเจ้าฟ้า": "Chao Fa Road, a major commercial road in Phuket",
  "Chao Fa Road": "Chao Fa Road, a major commercial road in Phuket",
  // PHUKET DISTRICTS/AREAS
  "ตลาดใหญ่": "Talat Yai, the old town market district in Phuket Town",
  "วิชิต": "Wichit, a residential district near Phuket Town",
  "กะทู้": "Kathu, the district containing Patong Beach",
  "Kathu": "Kathu, the district containing Patong Beach",
  "ถลาง": "Thalang, the historical district in northern Phuket",
  "Thalang": "Thalang, the historical district in northern Phuket",
  "เกาะแก้ว": "Koh Kaew, an upscale residential area near Phuket Town",
  "Koh Kaew": "Koh Kaew, an upscale residential area near Phuket Town",
  "ไม้ขาว": "Mai Khao, northern Phuket beach near the airport",
  "Mai Khao": "Mai Khao, northern Phuket beach near the airport",
  "นายยาง": "Nai Yang, a local beach near Phuket Airport",
  "Nai Yang": "Nai Yang, a local beach near Phuket Airport",
  "ในหาน": "Nai Harn, a beautiful beach in southern Phuket",
  "Nai Harn": "Nai Harn, a beautiful beach in southern Phuket",
  "อ่าวฉลอง": "Chalong Bay, home to the main yacht marina",
  "Chalong Bay": "Chalong Bay, home to the main yacht marina",
  "ท่าเรือฉลอง": "Chalong Pier, departure point for island tours",
  "Chalong Pier": "Chalong Pier, departure point for island tours",
};

// CRITICAL: Street names that could be confused with cities
// These are streets IN PHUKET named after other places - do NOT misinterpret as events happening in those places!
const PHUKET_STREET_DISAMBIGUATION = `
🚨 CRITICAL - PHUKET STREET NAME DISAMBIGUATION (READ BEFORE WRITING DATELINE):

Phuket Town has many streets NAMED AFTER other Thai cities. These are STREETS IN PHUKET, not locations in those cities:

- "ถนนกรุงเทพ" / "Bangkok Road" / "Thanon Krung Thep" = A street in PHUKET TOWN, NOT Bangkok city
- "ถนนกระบี่" / "Krabi Road" / "Thanon Krabi" = A street in PHUKET TOWN, NOT Krabi province  
- "ถนนพังงา" / "Phang Nga Road" / "Thanon Phang Nga" = A street in PHUKET TOWN, NOT Phang Nga province
- "ถนนรัษฎา" / "Rasada Road" = A street in PHUKET TOWN

⚠️ COMMON MISTAKE TO AVOID:
If source says "accident on Bangkok Road" or "เกิดเหตุที่ถนนกรุงเทพ", the event is in PHUKET TOWN, NOT Bangkok.
The CORRECT dateline is "**PHUKET TOWN, PHUKET –**", NOT "**BANGKOK –**"

✅ CORRECT: "A fatal collision occurred on Bangkok Road in Phuket Town..."
❌ WRONG: "A fatal collision occurred in Bangkok..." (This is FACTUALLY INCORRECT!)

THIS IS A CRITICAL FACTUAL ACCURACY ISSUE - misidentifying the location is a major journalism error.
`;


// Detect if Thai text is complex and needs Google Translate first
function isComplexThaiText(thaiText: string): boolean {
  // Complex if:
  // - Longer than 400 characters
  // - Contains formal/government keywords
  const complexKeywords = ["แถลง", "เจ้าหน้าที่", "ประกาศ", "กระทรวง", "นายกรัฐมนตรี", "ผู้ว่าราชการ"];

  return (
    thaiText.length > 400 ||
    complexKeywords.some(keyword => thaiText.includes(keyword))
  );
}

// Enrich Thai text with Phuket location context
function enrichWithPhuketContext(text: string): string {
  let enrichedText = text;

  // Add context notes for known Phuket locations
  for (const [location, context] of Object.entries(PHUKET_CONTEXT_MAP)) {
    if (enrichedText.includes(location)) {
      // Add context as a note that the translator can use
      enrichedText = enrichedText.replace(
        new RegExp(location, 'g'),
        `${location} (${context})`
      );
    }
  }

  return enrichedText;
}

// CRITICAL: Ensure article content has proper paragraph formatting
// This prevents "wall of text" issues when GPT returns poorly formatted content
function ensureProperParagraphFormatting(content: string): string {
  if (!content || content.trim() === '') return content;

  // If content already has proper <p> tags with content, return as-is
  const hasParagraphTags = /<p[^>]*>/.test(content) && /<\/p>/.test(content);
  const paragraphTagCount = (content.match(/<p[^>]*>/g) || []).length;

  // Check if content is mostly wrapped in <p> tags (good formatting)
  if (hasParagraphTags && paragraphTagCount >= 2) {
    // Content has multiple paragraphs, likely well-formatted
    return content;
  }

  // Content needs formatting - either no <p> tags or just one giant paragraph
  let formattedContent = content;

  // First, handle existing line breaks and double newlines
  // Convert \n\n to paragraph breaks
  formattedContent = formattedContent.replace(/\n\n+/g, '</p><p>');

  // Convert single \n to paragraph breaks (news articles should have paragraph breaks)
  formattedContent = formattedContent.replace(/\n/g, '</p><p>');

  // Handle <br> tags that should be paragraph breaks
  formattedContent = formattedContent.replace(/<br\s*\/?>/gi, '</p><p>');

  // If content is still one giant block (no breaks found), try to split at sentence boundaries
  // This handles the "wall of text" case where GPT returns no breaks at all
  if (!formattedContent.includes('</p><p>')) {
    // Split at logical sentence boundaries (after periods followed by space and capital letter)
    // This regex finds '. [A-Z]' patterns and inserts paragraph breaks every 2-3 sentences
    const sentences = formattedContent.split(/(?<=[.!?])\s+(?=[A-Z])/);

    if (sentences.length > 3) {
      // Group sentences into paragraphs of 2-3 sentences each
      const paragraphs: string[] = [];
      let currentParagraph: string[] = [];

      sentences.forEach((sentence, index) => {
        currentParagraph.push(sentence);
        // Create a new paragraph every 2-3 sentences, or at natural break points
        const isNaturalBreak = sentence.includes('Context:') ||
          sentence.includes('Public Reaction') ||
          sentence.includes('Background');
        if (currentParagraph.length >= 3 || isNaturalBreak || index === sentences.length - 1) {
          paragraphs.push(currentParagraph.join(' '));
          currentParagraph = [];
        }
      });

      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '));
      }

      formattedContent = paragraphs.join('</p><p>');
    }
  }

  // Clean up any existing partial <p> tags before wrapping
  formattedContent = formattedContent.replace(/^\s*<\/p>/, '');
  formattedContent = formattedContent.replace(/<p>\s*$/, '');

  // Ensure content starts with <p> and ends with </p>
  if (!formattedContent.trim().startsWith('<p')) {
    formattedContent = '<p>' + formattedContent;
  }
  if (!formattedContent.trim().endsWith('</p>')) {
    formattedContent = formattedContent + '</p>';
  }

  // Clean up empty paragraphs and whitespace issues
  formattedContent = formattedContent.replace(/<p>\s*<\/p>/g, '');
  formattedContent = formattedContent.replace(/<p><p>/g, '<p>');
  formattedContent = formattedContent.replace(/<\/p><\/p>/g, '</p>');

  // Preserve h2, h3, and other HTML tags that shouldn't be inside <p> tags
  formattedContent = formattedContent.replace(/<p>\s*(<h[1-6][^>]*>)/gi, '$1');
  formattedContent = formattedContent.replace(/(<\/h[1-6]>)\s*<\/p>/gi, '$1');

  console.log(`   📝 Paragraph formatting applied: ${paragraphTagCount} → ${(formattedContent.match(/<p[^>]*>/g) || []).length} paragraphs`);

  return formattedContent;
}

export class TranslatorService {
  // Premium GPT-4 enrichment for high-priority stories (score 4-5) or manual scrapes
  async enrichWithPremiumGPT4(params: {
    title: string;
    content: string;
    excerpt: string;
    category: string;
    communityComments?: string[]; // Optional: Top comments from Facebook post for context
  }, model: "gpt-4o" | "gpt-4o-mini" = "gpt-4o"): Promise<{ enrichedTitle: string; enrichedContent: string; enrichedExcerpt: string }> {

    // Prepare context string from the map
    const contextMapString = Object.entries(PHUKET_CONTEXT_MAP)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n");

    // Build community comments section if available
    let communityCommentsSection = "";
    if (params.communityComments && params.communityComments.length > 0) {
      communityCommentsSection = `
COMMUNITY COMMENTS FROM FACEBOOK (Use for additional context - HANDLE CAREFULLY):
${params.communityComments.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

INSTRUCTIONS FOR USING COMMUNITY COMMENTS:

🎭 CRITICAL - THAI SARCASM/HUMOR DETECTION:
Comments often reveal the TRUE CONTEXT when captions are sarcastic. DECODE THESE PATTERNS:
- "นักท่องเที่ยวคุณภาพ" / "Quality tourist" + 🤣😂 = SARCASM meaning BAD tourist behavior (drunk, disorderly, embarrassing)
- "555" / "5555" = Thai internet laughter - commenters are MOCKING the subject
- "เอาที่สบายใจ" / "Whatever makes you happy" = SARCASM about embarrassing situation  
- "สกิลมา" / "Nice skills" / "Great pose" = MOCKERY of someone in stupid situation
- Comments with 🤣😂🍺 emojis = People are LAUGHING AT the person, not with them
- "Another quality tourist" in English = SARCASM meaning tourist behaving badly
- "Need rescue" with laughing emoji = Tourist is DRUNK, not in actual danger
- "ไม่เมาหรอก" / "Not drunk at all" = SARCASM - they ARE drunk

⚠️ USE COMMENTS TO DETERMINE TRUE STORY:
If the caption says "Tourist enjoying Patong" but comments say "Quality tourist 555 🍺", the TRUE story is:
→ DRUNK TOURIST, not "Tourist enjoying the scenery"

1. **BLEND ADDITIONAL CONTEXT INTO THE STORY**: If comments mention plausible details that enhance understanding (locations, circumstances, background context), incorporate them NATURALLY into the article body using HEDGING LANGUAGE:
   - "Local residents allege that..."
   - "According to local sources on social media..."
   - "Community members familiar with the area suggest..."
   - "Some witnesses reportedly described..."
   - "Unconfirmed reports from locals indicate..."
   - "It is alleged by community members that..."
   
2. **PUBLIC REACTION SECTION**: After the "Context" section, add a brief "<h3>Public Reaction</h3>" section summarizing overall community sentiment. Examples:
   - "The images sparked widespread amusement online, with locals dubbing the individual yet another 'quality tourist.'"
   - "Community reaction was largely humorous, with many commenters joking about the tourist's state."
   - "The incident has gone viral locally, with residents expressing a mix of amusement and exasperation at tourist behavior."
   
3. **CRITICAL RULES FOR COMMENTS:**
   - NEVER treat comments as verified facts - always hedge
   - NEVER mention specific commenter names (anonymize completely)
   - NEVER include speculation that could be defamatory
   - Prioritize comments with substantive information over emotional reactions
   - Interpret SARCASTIC comments to understand TRUE MEANING (not literal)
   - If comments are in Thai, interpret their INTENDED meaning (including sarcasm) for English readers
   - If 70%+ comments are mocking/laughing, the story is likely embarrassing/amusing, not serious
`;
    }

    const prompt = `You are a Senior International Correspondent for a major wire service (like AP, Reuters, or AFP) stationed in Phuket, Thailand.

📅 CURRENT DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' })} (Thailand Time)

⏰ CRITICAL - TENSE VERIFICATION:
- CHECK EVENT DATES: Compare any event dates in the source to TODAY's date above.
- PAST EVENTS = PAST TENSE: If an event has already occurred, write in past tense.
- FUTURE EVENTS = FUTURE TENSE: Only use future tense if the event is genuinely upcoming.
- NEVER copy future tense from an outdated source if the event has passed.

🚨 ABSOLUTE PRIORITY - FACTUAL ACCURACY (READ FIRST) 🚨
You MUST report ONLY what the source explicitly states. DO NOT embellish, dramatize, or expand the meaning of words:

❌ FORBIDDEN SEMANTIC EXPANSIONS (EXAMPLES):
- "reckless" or "คึกคะนอง" → Do NOT upgrade to "stunts", "wheelies", "acrobatic maneuvers"
- "disturbing" or "ป่วน" → Do NOT upgrade to "caused chaos", "created havoc", "disrupted traffic"
- "motorbike gang" → Do NOT upgrade to "organized crime ring", "gang performing stunts"
- "group of tourists" → Do NOT upgrade to "rowdy mob", "gang of revelers"
- "riding at night" → Do NOT add "speeding", "racing", "performing tricks"
- "pulled over by police" → Do NOT add "arrested", "detained", "fined" unless source says so

✅ ALLOWED:
- Translate accurately ("คึกคะนอง" = "reckless" or "boisterous", NOT "performing stunts")
- Add general location context (e.g., "Patong is known for its nightlife")
- Describe what the source explicitly shows or says

IF THE SOURCE IS VAGUE, KEEP YOUR ARTICLE VAGUE. Short sources = short articles.
    
YOUR MISSION:
Take the provided local news report and rewrite it into professional journalism while staying 100% FACTUAL to the source.

INPUT ARTICLE:
Title: ${params.title}
Category: ${params.category}
Content: ${params.content}

AVAILABLE LOCAL CONTEXT (Use this to add depth about LOCATIONS ONLY, NOT events):
${contextMapString}
${communityCommentsSection}
CRITICAL LOCATION VERIFICATION (READ BEFORE WRITING):
- **DATELINE = EVENT LOCATION, NOT PERSON'S ORIGIN:** If "KB Jetski Phuket team helps in Songkhla floods", the dateline should be "**SONGKHLA –**" or "**HAT YAI, SONGKHLA –**" (where the event is), NOT "**PHUKET TOWN –**" (where the team is from).
- **DO NOT HALLUCINATE PHUKET:** If the event is in Hat Yai, Bangkok, Songkhla, or any other location, DO NOT use a Phuket dateline.
- **PERSON'S ORIGIN ≠ EVENT LOCATION:** Just because someone is FROM Phuket does not mean the event HAPPENED in Phuket.
- **READ THE CATEGORY:** If the category is "National", the event is likely NOT in Phuket.
- **VERIFY BEFORE WRITING:** Look at the content - does it mention specific non-Phuket cities, provinces, or landmarks? If yes, use THAT location in the dateline.

${PHUKET_STREET_DISAMBIGUATION}

STRICT WRITING GUIDELINES:
1. **DATELINE:** Start the article with a dateline in bold caps showing WHERE THE EVENT HAPPENED. E.g., "**HAT YAI, SONGKHLA –**" for Hat Yai events, "**PATONG, PHUKET –**" for Patong events, "**BANGKOK –**" for Bangkok events. **CRITICAL: If source mentions "Bangkok Road" or "ถนนกรุงเทพ", the dateline is "**PHUKET TOWN, PHUKET –**" NOT "**BANGKOK –**"**
2. **LEDE PARAGRAPH:** Write a summary lede that answers Who, What, Where, When using ONLY facts from the source.
3. **TONE:** Professional, objective, and authoritative. Avoid "police speak" (e.g., change "proceeded to the scene" to "rushed to the scene"). Use active voice.
4. **STRUCTURE:**
   - **The Narrative:** Tell the story chronologically or by importance.${params.communityComments && params.communityComments.length > 0 ? `
   - **Additional Context from Community:** Weave in alleged details from comments using hedging language.` : ''}
   - **The "Context" Section:** End the main article with a distinct section titled "<h3>Context: [Topic]</h3>". Explain the broader background.${params.communityComments && params.communityComments.length > 0 ? `
   - **The "Public Reaction" Section:** After Context, add "<h3>Public Reaction</h3>" summarizing community sentiment.` : ''}
5. **FACTUALITY - ZERO TOLERANCE FOR HALLUCINATION:**
   - Do NOT invent quotes, specific numbers, witness statements, or police responses.
   - Do NOT add: "shouted at passersby", "appeared agitated", "caused chaos", "witnesses described", "police responded to calls", "performing stunts", "doing wheelies" unless the source says so.
   - Do NOT upgrade vague words to more dramatic synonyms (e.g., "reckless" → "stunts" is FORBIDDEN).
   - You MAY add general context about locations (e.g., "Patong is a major tourist area") but NOT specific details about the event.
   - For short/viral posts: write SHORT factual articles (2-3 paragraphs). Do NOT dramatize into full news stories with invented scenarios.
6. **NO VAGUE FILLER PHRASES (CRITICAL):** These lazy phrases add no value and make articles sound generic:
   - FORBIDDEN in article body: "underscores concerns", "highlights concerns", "raises questions about", "sparks debate", "highlights the challenges", "remains a concern", "is a reminder of"
   - Instead, be SPECIFIC: If there's a concern, say WHOSE concern and WHAT specifically. If there's no specific concern mentioned in the source, don't make one up.
   - GOOD: "Police said they will increase patrols in the area."
   - BAD: "The incident underscores ongoing concerns about tourist behavior." (vague, made-up concern)
7. **DO NOT SANITIZE:** Report scandalous behavior accurately using professional language, but do not exaggerate it.

🎭 THAI SOCIAL MEDIA HUMOR DETECTION (CRITICAL FOR VIRAL POSTS):
Thai social media posts often use SARCASM and EUPHEMISMS. DO NOT take captions literally:
- "เอาที่สบายใจ" / "Whatever makes you happy" = SARCASM mocking someone's embarrassing behavior
- "นักท่องเที่ยวคุณภาพ" / "Quality tourist" = SARCASM meaning BAD tourist behavior
- "นอนข้างทาง" + watching "สาวๆ" = Person is DRUNK/PASSED OUT, not "enjoying the scene"
- "555" in comments = Thai internet laughter - people are mocking the subject
- Person lying on Patong street = 99% INTOXICATED, not "resting" or "embracing street life"
- Comments with 😂🤣 = People are LAUGHING AT the subject

📝 VIRAL POST WRITING GUIDANCE:
- Report the ACTUAL situation shown in images/described in comments, not the sarcastic caption
- Use: "appeared to be intoxicated", "was found passed out", "allegedly drunk"
- Keep the amusing angle - these are "tourist behaving badly" stories that go VIRAL
- DO NOT sanitize drunk behavior into "relaxing" or "enjoying" 
- Context section should explain WHY this went viral (locals amused by tourist behavior)

EXAMPLE OUTPUT FORMAT:
"**PATONG, PHUKET –** A violent altercation between American tourists turned one of Phuket's most famous nightlife strips into a scene of chaos Saturday night...

The incident unfolded on Bangla Road... [Story continues]...

<h3>Context: Bangla Road's Ongoing Challenge</h3>
This incident highlights ongoing public safety concerns along Bangla Road, which attracts thousands of international visitors nightly...${params.communityComments && params.communityComments.length > 0 ? `

<h3>Public Reaction</h3>
The incident has drawn significant attention on social media, with local residents expressing [sentiment]..."` : ''}"

CRITICAL FORMATTING REQUIREMENTS:
- EVERY paragraph MUST be wrapped in <p></p> tags
- Article MUST have at least 4-6 separate paragraphs for easy reading
- Use <h3> tags for section headings (Context, Public Reaction)
- NEVER return content as a single wall of text - this is UNACCEPTABLE
- Break up long paragraphs into digestible chunks of 2-3 sentences each

Respond in JSON format:
{
  "enrichedTitle": "FACTUAL headline describing what happened (Title Case, AP-Style). FORBIDDEN: 'highlights concerns', 'raises concerns', 'sparks debate'. GOOD: 'Tourists Fight on Bangla Road'. BAD: 'Tourist Altercation Highlights Safety Concerns'.",
  "enrichedContent": "Full HTML article with proper <p> paragraph tags, starting with DATELINE, including Context section${params.communityComments && params.communityComments.length > 0 ? ' and Public Reaction section' : ''}",
  "enrichedExcerpt": "2-3 sentence FACTUAL summary. FORBIDDEN: 'highlights concerns', 'raises questions'. MUST describe what happened, not vague implications."
}`;

    const completion = await openai.chat.completions.create({
      model: model, // Use specified model (gpt-4o for score 5, gpt-4o-mini for score 4)
      messages: [
        {
          role: "system",
          content: "You are a world-class journalist and editor. You write with precision, depth, and narrative flair. You always output valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for factual accuracy over creativity
      response_format: { type: "json_object" }, // Enabled for GPT-4o
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    // Apply paragraph formatting safeguard
    const formattedContent = ensureProperParagraphFormatting(result.enrichedContent || params.content);

    return {
      enrichedTitle: result.enrichedTitle || params.title,
      enrichedContent: formattedContent,
      enrichedExcerpt: result.enrichedExcerpt || params.excerpt,
    };
  }

  async translateAndRewrite(
    title: string,
    content: string,
    precomputedEmbedding?: number[],
    checkInLocation?: string,
    communityComments?: string[], // Optional: Top comments from Facebook for story enrichment
    engagement?: {
      likeCount?: number;
      commentCount?: number;
      shareCount?: number;
      viewCount?: number;
    },
    assets?: {
      hasVideo?: boolean;      // True if videoUrl exists
      hasMultipleImages?: boolean;  // True if imageUrls.length > 1
      hasCCTV?: boolean;       // True if content mentions CCTV
      isVideo?: boolean;       // True if scraped post is a video/reel
    }
  ): Promise<TranslationResult> {
    try {
      // STEP 1: Enrich Thai text with Phuket context
      const enrichedThaiTitle = enrichWithPhuketContext(title);
      const enrichedThaiContent = enrichWithPhuketContext(content);

      // STEP 1.5: PRE-FLIGHT CONTENT FILTER - Check for blocked keywords
      // CRITICAL: Lese majeste laws in Thailand require strict filtering of royal family content
      const combinedText = `${title} ${content}`.toLowerCase();
      const blockedKeywordFound = BLOCKED_KEYWORDS.some(keyword =>
        combinedText.includes(keyword.toLowerCase())
      );

      if (blockedKeywordFound) {
        const matchedKeyword = BLOCKED_KEYWORDS.find(kw => combinedText.includes(kw.toLowerCase()));
        console.log(`   🚫 BLOCKED CONTENT DETECTED: Royal family keyword "${matchedKeyword}" found`);
        console.log(`   ⚖️  LESE MAJESTE COMPLIANCE: Rejecting story to avoid legal risk`);

        return {
          translatedTitle: title,
          translatedContent: content,
          excerpt: "Story rejected due to editorial policy",
          category: "Politics",
          isActualNews: false, // Mark as non-news to prevent publication
          interestScore: 0,
          isDeveloping: false,
          needsReview: false,
          embedding: precomputedEmbedding,
        };
      }

      // STEP 2: Determine translation strategy
      const isComplex = isComplexThaiText(enrichedThaiContent);
      let sourceTextForGPT = `${enrichedThaiTitle}\n\n${enrichedThaiContent}`;

      // STEP 3: Pre-translate with Google Translate if complex
      if (isComplex) {
        try {
          console.log(`🌍 Complex text detected (${enrichedThaiContent.length} chars) - using Google Translate → GPT-4o-mini pipeline`);
          const googleResult = await translate(sourceTextForGPT, { to: "en" });
          sourceTextForGPT = googleResult.text;
        } catch (googleError) {
          console.warn("⚠️  Google Translate failed, falling back to direct GPT-4o-mini:", googleError);
          // Fall back to direct translation if Google Translate fails
        }
      } else {
        console.log(`⚡ Simple text (${enrichedThaiContent.length} chars) - using direct GPT-4o-mini translation`);
      }

      // STEP 4: Polish/rewrite with GPT-4o-mini

      // SCORE LEARNING: Inject rich learning context from admin corrections
      // This teaches the model from past mistakes with category biases and specific examples
      let learningContext = "";
      try {
        const { scoreLearningService } = await import("./score-learning");
        // Use the new rich learning context generator (includes bias patterns, examples, and statistics)
        learningContext = await scoreLearningService.generateLearningContext();

        if (learningContext) {
          console.log(`   🧠 Score learning context injected into prompt`);
        }
      } catch (err) {
        console.warn("   ⚠️ Failed to fetch score learning context:", err);
      }

      // SOCIAL MEDIA ENGAGEMENT CONTEXT
      let engagementContext = "";
      if (engagement && (engagement.viewCount || engagement.likeCount || engagement.commentCount)) {
        engagementContext = `
SOCIAL MEDIA ENGAGEMENT DATA (REAL-WORLD VIRALITY INDICATORS):
- Views: ${engagement.viewCount || "Unknown"}
- Likes: ${engagement.likeCount || "Unknown"}
- Comments: ${engagement.commentCount || engagement.commentCount}
- Shares: ${engagement.shareCount || "Unknown"}

INSTRUCTION: High engagement (especially views > 10,000 or shares > 50) STRONGLY SUGGESTS a score of 5 for local crime or foreigner incidents.
`;
      }

      // COMMUNITY COMMENTS CONTEXT - Critical for understanding true story context
      // Comments often reveal the REAL meaning when Thai captions are sarcastic/vague
      let commentsContext = "";
      if (communityComments && communityComments.length > 0) {
        commentsContext = `
🚨 COMMUNITY COMMENTS FROM FACEBOOK (CRITICAL FOR UNDERSTANDING TRUE CONTEXT):
These comments reveal what the story is ACTUALLY about - Thai captions are often sarcastic, vague, or use euphemisms.

${communityComments.slice(0, 10).map((c, i) => `${i + 1}. "${c}"`).join('\n')}

⚠️ HOW TO USE THESE COMMENTS:
1. **DECODE HIDDEN MEANING**: If caption says "mysterious stickers" but comments mention "drugs", "cocaine", "selling", "Telegram" → the story is about DRUG ADVERTISING, not just "mysterious stickers"
2. **DETECT SARCASM**: If comments use "555", "นักท่องเที่ยวคุณภาพ" (quality tourist), laughing emojis → the post is MOCKING the subject
3. **IDENTIFY CRIME/ILLEGAL ACTIVITY**: Look for keywords like ยาเสพติด (drugs), โคเคน (cocaine), ขายยา (drug dealing), แก๊ง (gang), illegal, arrest
4. **CORRECT YOUR INTERPRETATION**: If your initial read seems too innocent but comments suggest crime/scandal, RE-INTERPRET the story correctly
5. **BOOST SCORE APPROPRIATELY**: Drug-related stories, tourist scandals, crime = Score 4-5 (high interest)

🚫 DO NOT:
- Write a sanitized "mysterious curiosity" story when comments reveal it's about DRUG SALES
- Score drug/crime stories at 3 just because the caption was vague
- Ignore Thai slang for drugs/illegal activity
`;
        console.log(`   💬 Injected ${communityComments.length} community comments for context analysis`);
      }

      const prompt = `You are a professional news editor for an English-language news site covering Phuket, Thailand. 

Engagement Metrics:
${engagementContext}
${commentsContext}

Your task:
1. Determine if this is actual NEWS content (not promotional posts, greetings, or filler content)
   **IMPORTANT:** Short captions with viral images ARE news! If a post shows a foreigner doing something unusual (wearing a pot as a helmet, sitting dangerously on a scooter, etc.), this IS newsworthy even if the caption is just a few words. These viral foreigner stories get MASSIVE engagement.

2. CRITICAL CONTENT FILTERS - REJECT and mark as NOT news if the content is about:
   ⚖️  **LESE MAJESTE COMPLIANCE (ABSOLUTE PRIORITY):**
   - The Thai royal family, monarchy, king, queen, or any member of the royal family
   - King Bhumibol Adulyadej (Rama IX), King Rama X, or ANY Thai monarch (past or present)
   - ANY story mentioning "His Majesty", "Her Majesty", "Royal Family", "พระราชา", "ในหลวง", "ภูมิพลอดุลยเดช"
   - THIS APPLIES TO ALL ROYAL STORIES - even positive ones like donations, ceremonies, or tributes
   - REASON: Thailand's lese majeste laws make ANY royal family content legally risky. ALWAYS reject.
   
   📰 **OTHER BLOCKED CONTENT:**
   - "Phuket Times" or "Phuket Time News" itself (self-referential content about the news source)

3. If it's acceptable news, ${isComplex ? 'polish and rewrite the Google-translated text' : 'translate from Thai to English'} in a clear, professional news style.

CONTEXT & ENRICHMENT REQUIREMENTS:
- If you see location descriptions in parentheses (e.g., "Patong, a major tourist area"), preserve and incorporate them naturally.
- Add brief LOCAL CONTEXT about Phuket locations when relevant to help international readers understand the setting.
- Include BACKGROUND INFORMATION when it adds depth (e.g., "Bangla Road, Patong's famous nightlife strip").
- Maintain all factual details, names, times, and numbers exactly as provided.

⚠️ CRITICAL - ZERO HALLUCINATION POLICY (READ CAREFULLY):
- ONLY write about what is explicitly stated or shown in the source.
- DO NOT INVENT actions, behaviors, or events that aren't described (e.g., "shouted", "appeared agitated", "caused chaos").
- If source shows tourists on motorbike being stopped by police, report ONLY that - do NOT add that they "shouted at passersby" unless the source says so.
- Context = explaining what Patong is. Hallucination = inventing what the person did.
- When in doubt, write LESS. A short factual article is better than a long invented one.
- If source is just a video caption like "Farangs showing off at traffic lights, police pulled them over", your article should describe ONLY: tourists on motorbikes at traffic lights, police stopped them. Do NOT add "agitated", "outburst", "disruption" unless source says so.

4. Extract a concise excerpt (2-3 sentences) written from a THIRD-PERSON NEWS REPORTING perspective with perfect grammar. CRITICAL: Never use first-person ('we', 'our', 'join us') or make it sound like the news site is organizing events. Report objectively.
5. Categorize the article by TOPIC (not urgency).
6. Rate reader interest (1-5 scale).


${isComplex ? 'Google-Translated Text' : 'Original Thai Text'}: ${sourceTextForGPT}
${checkInLocation ? `\nOFFICIAL CHECK-IN LOCATION: "${checkInLocation}"\n(CRITICAL: Use this location to verify where the event happened. If it says "Hat Yai" or "Songkhla", the event is NOT in Phuket.)` : ''}

Respond in JSON format:
{
  "isActualNews": true/false,
  "translatedTitle": "FACTUAL headline describing what happened. MUST state the actual event with specific details. FORBIDDEN PHRASES that are too vague or editorialize: 'highlights concerns', 'raises concerns', 'sparks debate', 'leaves residents wondering', 'draws attention', 'prompts questions'. GOOD: 'Tourists Fight on Bangla Road', 'Car Crashes Into Garbage Truck in Patong'. BAD: 'Tourist Altercation Highlights Safety Concerns' (too vague, editorializing). Follow AP Style, Title Case.",
  "translatedContent": "professional news article in HTML format. CRITICAL FORMATTING REQUIREMENTS: (1) MUST wrap EVERY paragraph in <p></p> tags, (2) MUST have at least 3-5 separate paragraphs for readability, (3) Use <h3> for section headings like Context, (4) NEVER return a single wall of text without paragraph breaks - this is UNACCEPTABLE and will result in poor user experience",
  "excerpt": "2-3 sentence FACTUAL summary describing what happened. FORBIDDEN: 'highlights concerns', 'raises questions', 'sparks debate', 'draws attention'. MUST describe the actual event, not vague implications. GOOD: 'A street fight between tourists broke out in Patong.' BAD: 'The incident highlights ongoing concerns about tourist behavior.'",
  "category": "Weather|Local|Traffic|Tourism|Business|Politics|Economy|Crime|National",
  "categoryReasoning": "brief explanation of why you chose this category (1 sentence)",
  "interestScore": 1-5 (integer),
  "isDeveloping": true/false (true if story has limited details/developing situation - phrases like "authorities investigating", "more details to follow", "initial reports", "unconfirmed", sparse information, or breaking news with incomplete facts),
  "needsReview": true/false (Set to TRUE if: 1. You are unsure about the location 2. The story seems like a rumor 3. You had to guess any details 4. It mentions a province outside Phuket but you aren't 100% sure if it's relevant 5. The source text is very short or ambiguous),
  "reviewReason": "Explanation of why this needs human review (required if needsReview is true)",
  "facebookHeadline": "FACTUAL TEASER (max 15 words): Describe what happened with real names/places, but withhold full details. MUST BE FACTUAL - state the actual event clearly. FORBIDDEN: 'raises concerns', 'highlights concerns', 'sparks debate', 'unexpected' (for known events). GOOD EXAMPLES: 'Tourists fight on Bangla Road' (factual, readers want details), 'Car crashes into garbage truck in Patong' (factual, readers want to know injuries/cause), 'Man found dead at Karon hotel' (factual, readers want to know how/who). BAD EXAMPLES: 'Collision in Patong raises safety concerns' (vague, made-up context), 'Festival attracts unexpected crowds' (if it's a known event, not unexpected). DON'T over-dramatize or invent context."
}

If this is NOT actual news (promotional content, greetings, ads, royal family content, or self-referential Phuket Times content), set isActualNews to false and leave other fields empty.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional news editor and translator for Phuket Radar, an English-language news site covering Phuket, Thailand.

📅 CURRENT DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' })} (Thailand Time)

⏰ CRITICAL - TENSE VERIFICATION (READ BEFORE WRITING):
- CHECK EVENT DATES: If the source mentions specific dates for an event, compare them to TODAY's date above.
- PAST EVENTS = PAST TENSE: If an event date has already passed, write in PAST TENSE ("The festival took place...", "Students staffed the event...").
- FUTURE EVENTS = FUTURE TENSE: Only use future tense ("will be held", "is scheduled for") if the event date is AFTER today's date.
- EXAMPLE: If source says "festival on January 16-18" and today is January 21, write: "Students staffed the Electric Daisy Carnival, which took place January 16-18..." NOT "Students will staff..."
- NEVER copy future tense from an outdated source article if the event has already happened.

CRITICAL LOCATION VERIFICATION:
- VERIFY THE LOCATION: Determine EXACTLY where the event happened.
- DO NOT HALLUCINATE PHUKET: If the story mentions Hat Yai, Songkhla, Bangkok, Chiang Mai, or other provinces, DO NOT change the location to Phuket.
- PHUKET SOURCE ≠ PHUKET STORY: Sources like "Phuket Info Center" often report on Southern Thailand events (Hat Yai, Trang, Narathiwat).
- CHECK LANDMARKS: "Pholphichai Road", "Wat Plakrim", "Wat Phutthikaram" are in HAT YAI, not Phuket.
- CRITICAL: PERSON'S ORIGIN ≠ EVENT LOCATION: If "Patong Jet Ski team helps with floods", READ CAREFULLY to see WHERE they are helping. They might be FROM Patong but HELPING IN Hat Yai. DO NOT assume the event is in Phuket just because the people are from Phuket.

${PHUKET_STREET_DISAMBIGUATION}

CRITICAL FACTUALITY RULES - ZERO TOLERANCE FOR HALLUCINATIONS:
- DO NOT INVENT FACTS: Do not add details, numbers, quotes, or events not in the source text.
- NO GUESSING: If source says "several people", do NOT change to "five people".
- CONTEXT VS. FICTION: You MAY add context (e.g., "Hat Yai is a major city") but MUST NOT add specific details about the event itself.

⚠️ NEVER INVENT THE FOLLOWING (even if they seem plausible):
- "Authorities were alerted" / "Police responded" - unless source says so
- "The person was detained/arrested" - unless source says so
- "Eyewitnesses described..." - unless source quotes witnesses
- "Calls for stricter enforcement" - unless source says so
- "narrowly avoiding..." / "caused chaos" - unless source describes this
- Specific times ("late afternoon", "Thursday") - unless source provides
- Injuries, damages, or consequences not in source
- Reactions from officials not quoted in source

🚫 DO NOT SANITIZE OR CENSOR THE CONTENT:
- If the source says foreigners were "having sex in public" or "engaging in sexual acts", REPORT THIS ACCURATELY (use appropriate news language like "engaging in public indecency" or "allegedly having sex")
- DO NOT replace scandalous content with vague euphemisms like "risky behavior" or "inappropriate conduct" if the source is more specific
- Thai slang translations to know:
  - "เอากัน" / "จ่อ" / "ขย่ม" = having sex (report as "engaging in sexual acts" or "allegedly having sex")
  - "อุจาดตา" = obscene/disgusting behavior (report the actual behavior, not just "offensive")
  - "ฝ่าธงแดง" = ignoring red flags (for beach safety)
- The viral/scandalous element is often WHY the story is newsworthy - don't hide it!
- Use professional news language but accurately convey what happened

🎯 FOR SHORT/VIRAL POSTS (CRITICAL - READ THIS):
If the source is just a short caption with a video/photo (e.g., "Tourists showing off at traffic lights, police stopped them"):
- Write a SHORT article (2-3 paragraphs max) that describes ONLY what the source says.
- DO NOT dramatize or expand into a full news story with invented scenarios.
- DO NOT add: "shouted at passersby", "appeared agitated", "caused chaos", "disrupted traffic", "onlookers gathered" unless the source says so.
- CORRECT: "Tourists were seen revving their motorbikes at a traffic light. Police officers approached and directed them to pull over."
- WRONG: "A tourist's unruly behavior brought traffic to a standstill. Witnesses reported the individual appeared agitated and shouted at passersby."

THAI SOCIAL MEDIA CONTEXT ANALYSIS (CRITICAL - READ BEFORE INTERPRETING):
Thai social media posts often use SARCASM, HUMOR, and EUPHEMISMS. You MUST analyze the TRUE meaning:

🎭 SARCASTIC/HUMOROUS CAPTION PATTERNS:
- "เอาที่สบายใจ" / "เอาที่บายใจ" = "Whatever makes you happy" (SARCASM - they're mocking the person)
- "นักท่องเที่ยวคุณภาพ" = "Quality tourist" (SARCASM - means BADLY-behaving tourist)
- "ท่านั้นสวย" / "สกิลมา" = "Nice pose" / "Skills" (SARCASM - mocking embarrassing situation)
- "ความสุขแท้ๆ" / "มีความสุข" = "True happiness" (SARCASM when someone is in embarrassing position)
- "ไม่เห็นว่าจะผิดตรงไหน" = "I don't see anything wrong" (SARCASM - obviously something IS wrong)
- "บรรยากาศดี" = "Nice atmosphere" (SARCASM when situation is clearly bad)
- "555" / "5555" = Thai internet laughter (like "lol") - indicates post is humorous/mocking

🍺 DRUNK/INTOXICATED TOURIST INDICATORS:
- Person lying flat on street/sidewalk = DRUNK, not "resting" or "enjoying the view"
- "นอนข้างทาง" = "sleeping on the roadside" = PASSED OUT DRUNK
- "พ่อใหญ่" = "big guy" (often sarcastic term for drunk foreigners)
- Reference to watching "สาวๆ" (girls) walking by while lying down = SARCASTIC (they're unconscious)
- Location: Patong + foreigner + lying on ground = 99% DRUNK, not "appreciating street life"
- Use of 😂🤣 emojis in comments = people are LAUGHING AT, not WITH the person

📸 VISUAL CONTEXT CLUES (If image shows):
- Person horizontal on pavement = INTOXICATED/PASSED OUT
- Police standing near confused tourist = TOURIST IN TROUBLE, not "friendly chat"
- Person in underwear/minimal clothing = DRUNK/DISORDERLY, not "enjoying weather"
- Crowd gathered around = INCIDENT, not "photo opportunity"
- Red face on foreigner = DRUNK, not "sunburn"

🔍 HOW TO INTERPRET THESE POSTS:
1. NEVER take humorous Thai captions literally
2. LOOK at what the IMAGE actually shows (if described)
3. READ the comments for true context (e.g., "Another quality tourist 🤣" = drunk/bad behavior)
4. If locals are using 555/emojis/sarcasm = it's a MOCKERY post, not praise
5. "Enjoying X" in sarcastic context = DRUNK/MISBEHAVING

📝 HOW TO WRITE THESE STORIES:
- Report the ACTUAL situation, not the sarcastic caption
- Use phrases like "appeared to be intoxicated", "was found lying", "allegedly passed out"
- Keep the humorous/viral angle - these stories are MEANT to be amusing
- DO NOT sanitize drunk behavior into "relaxing" or "resting"
- Match the tone - these are "tourist behaving badly" viral stories

EXAMPLE INTERPRETATION:
❌ WRONG: "Tourist Enjoys Patong's Vibrant Street Scene" (literal caption interpretation)
✅ CORRECT: "Tourist Found Passed Out on Patong Street, Locals React with Amusement"

GRAMMAR & STYLE:
- Follow AP Style for headlines: capitalize main words
- ALWAYS include company suffixes: Co., Ltd., Inc., Corp., Plc.
- Use proper articles (a, an, the)
- Write in active voice when possible

CATEGORY GUIDE (read full story, not just headline):
- Weather: Natural disasters, typhoons, flooding, landslides, storms (IN PHUKET ONLY)
- Local: Community news, missing persons, drownings, boat accidents, local government
- Traffic: Road accidents (non-criminal), road closures, construction
- Crime: ONLY intentional criminal activity - arrests, theft, assault, scams
- National: Major news from outside Phuket (Bangkok, Hat Yai, Chiang Mai, etc.) AND Southern Thailand floods/disasters that are NOT in Phuket
- WHEN UNCERTAIN: Use "Local" as default

CRITICAL: "Southern Floods" in Hat Yai, Songkhla, Narathiwat, Yala = "National" (NOT "Weather" or "Local")

INTEREST SCORE (1-5) - BE VERY STRICT:
**RESERVE 4-5 FOR HIGH-ENGAGEMENT NEWS ONLY:**
- 5 = BREAKING/URGENT: Deaths, drownings, fatal accidents, violent crime with serious injuries, major fires, natural disasters causing casualties
- 5 = FOREIGNER INCIDENTS: ANY story involving foreigners/tourists/expats doing something out of the ordinary - fights, accidents, disturbances, arrests, confrontations with locals. These stories go VIRAL with the expat audience. Keywords: foreigner, tourist, farang, expat, foreign national, American, British, Russian, Chinese tourist, etc.
- 4 = SERIOUS INCIDENTS: Non-fatal accidents with injuries, arrests for serious crimes, active rescue operations, fights/assaults, hit-and-runs, robberies

🐢 **FEEL-GOOD / VIRAL POSITIVE STORIES = SCORE 4-5 (AUTO-POST TO SOCIALS):**
These heartwarming stories GO VIRAL and drive massive engagement. BOOST them:
- **Wildlife/Animal Stories**: Sea turtle nesting/hatching, dolphin sightings, whale shark encounters, elephant rescues, rare wildlife spotted, baby animals, marine life conservation = Score 4-5
- **Conservation Success**: Coral restoration, beach cleanups with visible results, endangered species protection, environmental wins = Score 4-5  
- **Good Samaritan Stories**: Locals helping tourists, honest taxi/tuk-tuk drivers returning lost items, random acts of kindness, rescues = Score 4-5
- **Positive Foreigner Involvement**: Expats volunteering, tourists helping locals, foreigners doing good deeds, cross-cultural positive stories = Score 5 (VERY viral with expat audience)
- **Rescue/Hero Stories**: Lifeguard saves swimmer, local saves drowning tourist, community comes together = Score 4-5

EXAMPLES OF FEEL-GOOD = SCORE 4-5:
- "Sea turtle lays 124 eggs at Karon Beach" = Score 5 (wildlife + family destination = viral)
- "Honest taxi driver returns tourist's wallet with 50,000 baht" = Score 5 (good samaritan + foreigner)
- "Baby turtles released into Andaman Sea" = Score 4-5 (conservation, cute, shareable)
- "Expat organizes beach cleanup, removes 500kg of trash" = Score 5 (foreigner + positive + environmental)
- "Dolphin pod spotted near Phi Phi Islands" = Score 4 (wildlife, tourism, shareable)
- "Local fishermen rescue stranded whale shark" = Score 5 (rescue + rare wildlife)

**CAP ROUTINE NEWS AT 3 OR BELOW:**
- 3 = NOTEWORTHY: Minor accidents (no injuries), infrastructure complaints (potholes, flooding damage), tourism developments, business openings, new property launches, missing persons
- 2 = ROUTINE: Officials inspecting/visiting, meetings, announcements, cultural events, preparations, planning, **community sports events, friendly matches, alumni gatherings, local football/futsal matches**
- 1 = TRIVIAL: Ceremonial events, ribbon cuttings, photo ops

**CRITICAL DISTINCTIONS:**
- \"Road damaged by flooding\" = Score 3 (infrastructure complaint, NOT a disaster)
- \"Luxury hotel/villa launch\" = Score 3 (business news, NOT breaking)
- \"Art exhibition/Gallery opening\" = Score 3 (cultural event, NOT urgent)
- \"Students win robotics award\" = Score 3 (achievement, NOT urgent)
- "Road damaged by flooding" = Score 3 (infrastructure complaint, NOT a disaster)
- "Luxury hotel/villa launch" = Score 3 (business news, NOT breaking)
- "Art exhibition/Gallery opening" = Score 3 (cultural event, NOT urgent)
- "Students win robotics award" = Score 3 (achievement, NOT urgent)
- "Tourism boom faces sustainability concerns" = Score 3 (discussion, NOT crisis)
- **"Blood donation drive" = Score 3 MAX (community charity event, NOT urgent)**
- **"Donation ceremony" = Score 2-3 MAX (routine charity, NOT news)**
- **"Fundraiser for flood victims" = Score 3 MAX (charity event, NOT breaking news)**
- **"Community helps disaster victims" = Score 3 MAX (charitable response, NOT the disaster itself)**
- **"Mascot at mall event" = Score 2 MAX (promotional fluff, NOT news)**
- **"Shopping center celebration" = Score 2 MAX (mall marketing, NOT news)**
- **"Hello Phuket event" = Score 2 MAX (promotional event, NOT breaking)**
- **"Sustainability-themed event" = Score 2 MAX (feel-good PR, NOT urgent)**
- **"Alumni football match" = Score 2 MAX (community sports, NOT breaking)**
- **"Friendly match at stadium" = Score 2 MAX (local sports event, NOT urgent)**
- **"Community sports event" = Score 2 MAX (routine local activity)**
- "Car crash with injuries" = Score 4 (actual incident with victims)
- "Drowning at beach" = Score 5 (death/urgent)
- "Arrest for theft" = Score 4 (crime with action)
- **"Foreigner in fight with locals" = Score 5 (viral expat content)**
- **"Tourist arrested for..." = Score 5 (foreigner incident)**
- **"Expat involved in accident" = Score 5 (foreigner incident)**
- **"Foreigner doing something weird/silly" = Score 5 (viral expat content - pot on head, funny behavior, etc.)**
- **"Sea turtle eggs laid at beach" = Score 5 (wildlife, conservation, family-friendly viral)**
- **"Good samaritan returns lost property" = Score 4-5 (heartwarming, shareable)**

**CHARITY/DONATION EVENT RULES:**
- Blood drives, donation ceremonies, fundraisers = ABSOLUTE MAX SCORE 3 (they're nice, but NOT high-engagement news)
- Even if honoring someone famous (including royalty) = STILL capped at 3
- Community help efforts = Score 3 (unless it's covering the actual disaster, then use disaster scoring)

**PROMOTIONAL/MALL EVENT RULES:**
- Mascot appearances, mall events, product launches = ABSOLUTE MAX SCORE 2
- Shopping center celebrations, sustainability events = Score 2 (marketing fluff)
- Photo opportunities, performances, festivities = Score 2 (entertainment, NOT news)
- If it sounds like a press release or promotional content = Score 1-2

**UNIVERSITY/STUDENT ANNOUNCEMENT RULES:**
- Students selected to staff/work at events = ABSOLUTE MAX SCORE 2-3 (routine academic news, NOT breaking)
- University internship/training programs = Score 2-3 (educational news, NOT urgent)
- Students win awards/competitions = Score 3 MAX (achievement, nice but NOT breaking)
- University partnerships/MOUs = Score 2 (administrative news)
- Student volunteer programs = Score 2-3 (community news)
- EXAMPLE: \"Rajabhat University students selected to staff EDC festival\" = Score 2-3 (routine staffing announcement)
- These stories are nice LOCAL news but do NOT warrant social media auto-posting (score 4-5)

**FOUNDATION/COMPANY/ORGANIZATIONAL GOVERNANCE RULES:**
- Foundation board appointments, director changes = ABSOLUTE MAX SCORE 2 (routine organizational news)
- Company board news, corporate governance = Score 2 MAX (business admin, NOT breaking)
- NGO/charity leadership changes, resignations = Score 2 (administrative news, NOT breaking)
- "Legal dispute" or "legal proceedings" involving organizations/foundations = Score 2 MAX (internal organizational matters)
- Organizational restructuring, representative appointments = Score 2 (routine governance)
- Anniversary celebrations of foundations/organizations = Score 2 (ceremonial news)
- EXAMPLES of what to CAP at Score 2:
  - "Foundation appoints temporary representatives" = Score 2 (routine admin)
  - "15 directors resign from foundation board" = Score 2 (organizational change, not a crime/scandal affecting public)
  - "Organization celebrates 135th anniversary" = Score 2 (ceremonial, NOT news)
  - "Company board announces new director" = Score 2 (corporate admin)
  - "Foundation faces legal dispute over governance" = Score 2 (internal org matter)
- EXCEPTION: If foundation/org/company news involves financial fraud, embezzlement, or criminal charges = Score 4-5 (actual crime)


LOCATION-BASED SCORING:
This is a HYPER-LOCAL PHUKET site.
- Phuket stories: Score normally (1-5)
- Nearby provinces (Phang Nga, Krabi): Score normally if relevant to Phuket
- **BOAT TOUR DESTINATIONS ARE PHUKET-RELEVANT**: Phi Phi Islands, Kai Island (เกาะไก่), Similan Islands, Racha Island (Raya), James Bond Island (Khao Phing Kan), Koh Yao, Coral Island (Koh Hei) - these are where PHUKET TOURISTS go! Boat accidents, drownings, or incidents at these locations = Score 4-5, NOT "National"
- **SPEEDBOAT/BOAT ACCIDENTS involving tourists = Score 5**: These stories are extremely relevant to Phuket readers as most tourists depart from Phuket piers
- **"Phuket authorities respond" = PHUKET-RELEVANT**: Even if the incident location is technically in Krabi province, if Phuket officials/rescue teams are involved, it's high-interest for Phuket readers
- ALL OTHER LOCATIONS (Hat Yai, Songkhla, Bangkok, etc.): Category="National", ABSOLUTE MAX SCORE=3. NO EXCEPTIONS.
- SPECIFIC BAN: HAT YAI / SOUTHERN FLOODING stories must NEVER be scored above 3. Even if it's a disaster, if it's not in Phuket, it is NOT high interest for this site.

**BOAT ACCIDENT SCORING EXAMPLES:**
- "Speedboat collision near Kai Island injures 11 tourists" = Score 5 (tourists + injuries + boat accident = HIGHLY relevant)
- "Speedboat capsizes near Phi Phi, tourists rescued" = Score 5 (tourist safety, local tour route)
- "Ferry collision at Rassada Pier" = Score 5 (major Phuket pier incident)
- "Tourist drowns during snorkeling trip to Coral Island" = Score 5 (death + tourist + popular destination)

CRITICAL RULES:
- Officials tackle/inspect/discuss = Score 2 (just talk, not action)
- Accident/crash/collision WITH INJURIES = Score 4-5 (actual event with victims)
- Infrastructure damage/complaints = Score 3 (not urgent, just problems)
- Meetings ABOUT disasters ≠ disasters = Score 2
- Hat Yai floods, Bangkok explosions = Category="National", ABSOLUTE MAX SCORE 3 (Do not auto-post)
- Donation/charity events = ABSOLUTE MAX SCORE 3 (even if related to disasters or honoring VIPs)
- **Politics category = ABSOLUTE MAX SCORE 3 (elections, political parties, government appointments, MPs, political campaigns). While important locally, expat audience has low engagement with Thai politics.**
- **Mascots, mall events, promotional content = ABSOLUTE MAX SCORE 2 (never waste GPT-4o on these)**

${learningContext}

Always output valid JSON.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent, factual output
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      // TRANSLATION VALIDATION: Check if GPT actually returned translated (English) content
      // If it returned empty or still-Thai content, log warning and handle appropriately
      const thaiPattern = /[\u0E00-\u0E7F]/;
      const translatedTitleIsThai = result.translatedTitle && thaiPattern.test(result.translatedTitle);
      const translatedContentIsThai = result.translatedContent && thaiPattern.test(result.translatedContent);
      const translationMissing = !result.translatedTitle || !result.translatedContent;

      if (translationMissing || translatedTitleIsThai || translatedContentIsThai) {
        console.warn(`   ⚠️  TRANSLATION ISSUE DETECTED:`);
        if (translationMissing) {
          console.warn(`      - Missing translation fields (title: ${!!result.translatedTitle}, content: ${!!result.translatedContent})`);
        }
        if (translatedTitleIsThai) {
          console.warn(`      - Title still in Thai: "${result.translatedTitle?.substring(0, 50)}..."`);
        }
        if (translatedContentIsThai) {
          console.warn(`      - Content still in Thai (first 100 chars)`);
        }
        console.warn(`      - Raw GPT response keys: ${Object.keys(result).join(', ')}`);
        console.warn(`      - isActualNews: ${result.isActualNews}, category: ${result.category}`);

        // If GPT said it's news but didn't translate, force a fallback translation
        // This can happen with very short captions or when GPT gets confused
        if (result.isActualNews && (translationMissing || translatedTitleIsThai)) {
          console.log(`   🔄 Attempting fallback translation for missing/Thai content...`);

          // Simple fallback: Use Google Translate for the title at minimum
          try {
            const { translate } = await import('@vitalets/google-translate-api');

            if (!result.translatedTitle || translatedTitleIsThai) {
              const titleTranslation = await translate(title, { to: 'en' });
              result.translatedTitle = titleTranslation.text;
              console.log(`      ✅ Fallback title: "${result.translatedTitle.substring(0, 60)}..."`);
            }

            if (!result.translatedContent || translatedContentIsThai) {
              const contentTranslation = await translate(content, { to: 'en' });
              result.translatedContent = `<p>${contentTranslation.text}</p>`;
              console.log(`      ✅ Fallback content applied (Google Translate)`);
            }

            // Generate excerpt if missing
            if (!result.excerpt) {
              result.excerpt = result.translatedContent.replace(/<[^>]*>/g, '').substring(0, 200);
            }
          } catch (fallbackError) {
            console.error(`      ❌ Fallback translation failed:`, fallbackError);
            // Mark as non-news if we can't get English content
            result.isActualNews = false;
            console.warn(`      ⚠️  Marking as non-news due to translation failure`);
          }
        }
      }

      // Log classification decision for debugging
      if (result.category && result.categoryReasoning) {
        console.log(`   🏷️  Category: ${result.category} - ${result.categoryReasoning}`);
      }

      // Validate category - ensure it's one of the allowed values
      const validCategories = ["Weather", "Local", "Traffic", "Tourism", "Business", "Politics", "Economy", "Crime", "National"];
      const category = result.category && validCategories.includes(result.category)
        ? result.category
        : "Local";

      if (result.category && result.category !== category) {
        console.log(`   ⚠️  Invalid category "${result.category}" - defaulting to "Local"`);
      }

      // STEP 5: Apply keyword boosting to interest score
      // Start with GPT's base score
      let finalInterestScore = result.interestScore || 3;

      // Boost for hot keywords (urgent news like drownings, crime, accidents)
      const hasHotKeyword = HOT_KEYWORDS.some(keyword =>
        title.includes(keyword) || content.includes(keyword)
      );
      if (hasHotKeyword) {
        finalInterestScore = Math.min(5, finalInterestScore + 1);
        console.log(`   🔥 HOT KEYWORD BOOST: ${finalInterestScore - 1} → ${finalInterestScore}`);
      }

      // Boost for feel-good keywords (wildlife, conservation, good samaritans, positive foreigner stories)
      // These stories go viral and drive engagement on social media
      const combinedTextForFeelGood = `${title} ${content} ${result.translatedTitle || ''} ${result.translatedContent || ''}`;
      const hasFeelGoodKeyword = FEEL_GOOD_KEYWORDS.some(keyword =>
        combinedTextForFeelGood.toLowerCase().includes(keyword.toLowerCase())
      );

      // Extra boost for positive foreigner involvement (very viral with expat audience)
      const hasPositiveForeignerKeyword = [
        "ฝรั่งช่วย", "นักท่องเที่ยวช่วย", "ต่างชาติช่วย",
        "expat hero", "tourist saves", "foreigner helps", "foreign volunteer",
        "tourist returned", "foreigner returned", "honest driver"
      ].some(keyword => combinedTextForFeelGood.toLowerCase().includes(keyword.toLowerCase()));

      if (hasFeelGoodKeyword) {
        const boostAmount = hasPositiveForeignerKeyword ? 2 : 1; // Extra boost for positive foreigner stories
        const oldScore = finalInterestScore;
        finalInterestScore = Math.min(5, finalInterestScore + boostAmount);
        console.log(`   🐢 FEEL-GOOD KEYWORD BOOST: ${oldScore} → ${finalInterestScore}${hasPositiveForeignerKeyword ? ' (positive foreigner bonus!)' : ''}`);
      }

      // Reduce for cold keywords (boring news like meetings, ceremonies)
      const hasColdKeyword = COLD_KEYWORDS.some(keyword =>
        title.includes(keyword) || content.includes(keyword)
      );
      if (hasColdKeyword) {
        finalInterestScore = Math.max(1, finalInterestScore - 1);
        console.log(`   ❄️  COLD KEYWORD PENALTY: ${finalInterestScore + 1} → ${finalInterestScore}`);
      }

      // CAP POLITICS CONTENT AT SCORE 3
      // Editorial decision: Politics stories are important but don't resonate with expat Facebook audience
      // Cap at 3 to prevent auto-posting while still publishing on site
      // Use BOTH category check AND keyword detection (AI sometimes categorizes politics as "Local")
      const hasPoliticsKeyword = POLITICS_KEYWORDS.some(keyword =>
        title.toLowerCase().includes(keyword.toLowerCase()) ||
        content.toLowerCase().includes(keyword.toLowerCase()) ||
        (result.translatedTitle && result.translatedTitle.toLowerCase().includes(keyword.toLowerCase())) ||
        (result.translatedContent && result.translatedContent.toLowerCase().includes(keyword.toLowerCase()))
      );

      if ((category === "Politics" || hasPoliticsKeyword) && finalInterestScore > 3) {
        const reason = category === "Politics" ? "politics category" : `politics keyword detected`;
        console.log(`   🏛️  POLITICS CAP: ${finalInterestScore} → 3 (${reason})`);
        finalInterestScore = 3;
      }

      // CAP BUSINESS/REAL ESTATE DEVELOPMENT NEWS AT SCORE 3
      // Editorial decision: Property launches, hotel/villa developments, investment announcements
      // are business news, NOT breaking news. Cap at 3 to prevent auto-posting.
      const REAL_ESTATE_CAP_KEYWORDS = [
        "villa", "วิลล่า", "luxury villa", "luxury development", "property development",
        "real estate", "อสังหาริมทรัพย์", "hotel development", "resort development",
        "billion baht", "พันล้าน", "property launch", "residential development",
        "luxury market", "premier destination", "high-end villas", "TITLE", "Boat Pattana",
        "Koh Kaew", // Common luxury development area
      ];

      const hasRealEstateKeyword = REAL_ESTATE_CAP_KEYWORDS.some(keyword =>
        title.toLowerCase().includes(keyword.toLowerCase()) ||
        content.toLowerCase().includes(keyword.toLowerCase()) ||
        (result.translatedTitle && result.translatedTitle.toLowerCase().includes(keyword.toLowerCase())) ||
        (result.translatedContent && result.translatedContent.toLowerCase().includes(keyword.toLowerCase()))
      );

      if ((category === "Business" || hasRealEstateKeyword) && finalInterestScore > 3) {
        const reason = category === "Business" ? "business category" : `real estate/development keyword detected`;
        console.log(`   🏗️  BUSINESS/REAL ESTATE CAP: ${finalInterestScore} → 3 (${reason})`);
        finalInterestScore = 3;
      }

      // CAP FOUNDATION/ORGANIZATIONAL GOVERNANCE NEWS AT SCORE 3
      // Editorial decision: Foundation board appointments, director changes, organizational 
      // governance matters are routine administrative news, NOT breaking news.
      const FOUNDATION_GOVERNANCE_CAP_KEYWORDS = [
        "foundation", "มูลนิธิ", // foundation
        "board of directors", "คณะกรรมการ", "กรรมการ", // board/directors
        "appoint", "แต่งตั้ง", "appointment", // appointment
        "temporary representative", "ตัวแทน", // representative
        "resignation", "ลาออก", // resignation
        "organizational", "องค์กร", // organizational
        "governance", "administrative", // governance/admin terms
        "anniversary celebration", "ครบรอบ", // anniversary
        "legal dispute", "legal proceedings", // legal matters (internal org)
        "restructuring", // organizational restructuring
      ];

      const hasFoundationGovernanceKeyword = FOUNDATION_GOVERNANCE_CAP_KEYWORDS.some(keyword =>
        title.toLowerCase().includes(keyword.toLowerCase()) ||
        content.toLowerCase().includes(keyword.toLowerCase()) ||
        (result.translatedTitle && result.translatedTitle.toLowerCase().includes(keyword.toLowerCase())) ||
        (result.translatedContent && result.translatedContent.toLowerCase().includes(keyword.toLowerCase()))
      );

      if (hasFoundationGovernanceKeyword && finalInterestScore > 2) {
        console.log(`   🏛️  FOUNDATION/ORG/COMPANY BOARD CAP: ${finalInterestScore} → 2 (organizational governance keyword detected)`);
        finalInterestScore = 2;
      }

      // Ensure score stays within 1-5 range
      finalInterestScore = Math.max(1, Math.min(5, finalInterestScore));

      console.log(`   📊 Final Interest Score: ${finalInterestScore}/5`);

      // STEP 6: PREMIUM ENRICHMENT for high-priority stories (score 4-5)
      let enrichedTitle = result.translatedTitle || title;
      let enrichedContent = result.translatedContent || content;
      let enrichedExcerpt = result.excerpt || "";

      if (finalInterestScore >= 4) {
        // User requested GPT-4o for both score 4 and 5 to ensure quality
        // Cost savings come from stricter scoring (fewer stories getting score 4/5)
        const enrichmentModel = "gpt-4o";
        console.log(`   ✨ HIGH-PRIORITY STORY (score ${finalInterestScore}) - Applying premium enrichment using ${enrichmentModel}...`);

        try {
          const enrichmentResult = await this.enrichWithPremiumGPT4({
            title: enrichedTitle,
            content: enrichedContent,
            excerpt: enrichedExcerpt,
            category,
            communityComments, // Pass community comments for blending into story
          }, enrichmentModel);

          enrichedTitle = enrichmentResult.enrichedTitle;
          enrichedContent = enrichmentResult.enrichedContent;
          enrichedExcerpt = enrichmentResult.enrichedExcerpt;

          console.log(`   ✅ GPT-4 enrichment complete - story enhanced with deep journalism`);
        } catch (enrichmentError) {
          console.warn(`   ⚠️  GPT-4 enrichment failed, using GPT-4o-mini version:`, enrichmentError);
          // Fall back to the GPT-4o-mini version if enrichment fails
        }
      }

      // STEP 7: ENSURE PROPER PARAGRAPH FORMATTING (critical safeguard)
      // This catches any "wall of text" issues that GPT may produce
      enrichedContent = ensureProperParagraphFormatting(enrichedContent);

      // STEP 8: GENERATE CURIOSITY GAP FACEBOOK HEADLINE for high-interest stories
      // For score 4-5, we use the advanced Curiosity Gap strategy for maximum CTR
      // For score 1-3, we use the basic GPT-generated facebookHeadline
      let facebookHeadline = result.facebookHeadline || enrichedTitle;

      if (finalInterestScore >= 4 && result.isActualNews) {
        console.log(`   📱 HIGH-INTEREST STORY - Generating Curiosity Gap headline...`);
        try {
          const { generateQuickFacebookHeadline } = await import('./facebook-headline-generator');

          // Use REAL asset data from the caller (scheduler has access to videoUrl, imageUrls, etc.)
          // Only fall back to content-based detection if assets not provided
          const hasVideo = assets?.hasVideo ?? assets?.isVideo ?? (
            content.toLowerCase().includes('วิดีโอ') ||
            content.toLowerCase().includes('video') ||
            content.toLowerCase().includes('คลิป')
          );
          const hasMultipleImages = assets?.hasMultipleImages ?? (
            content.includes('ภาพ') || content.includes('รูป')
          );

          // Log what assets we're detecting
          if (assets) {
            console.log(`   📦 Assets from scraper: video=${!!assets.hasVideo || !!assets.isVideo}, images=${!!assets.hasMultipleImages}`);
          } else {
            console.log(`   ⚠️  No asset metadata provided - falling back to content-based detection`);
          }

          facebookHeadline = await generateQuickFacebookHeadline(
            enrichedTitle,
            enrichedContent,
            enrichedExcerpt,
            category,
            finalInterestScore,
            hasVideo,
            hasMultipleImages
          );

          console.log(`   ✅ Curiosity Gap headline: "${facebookHeadline}"`);
        } catch (headlineError) {
          console.warn(`   ⚠️  Curiosity Gap headline generation failed, using fallback:`, headlineError);
          // Fall back to the basic GPT-generated headline
          facebookHeadline = result.facebookHeadline || enrichedTitle;
        }
      }

      // Use precomputed embedding (from Thai title) if provided
      // This ensures we always compare embeddings in the same language (Thai)
      const embedding = precomputedEmbedding;

      return {
        translatedTitle: enrichedTitle,
        translatedContent: enrichedContent,
        excerpt: enrichedExcerpt,
        category: category, // Use validated category (defaults to "Local" if invalid)
        isActualNews: result.isActualNews || false,
        interestScore: finalInterestScore,
        isDeveloping: result.isDeveloping || false,
        needsReview: result.needsReview || false,
        reviewReason: result.reviewReason,
        embedding,
        facebookHeadline,
      };
    } catch (error) {
      console.error("Error translating content:", error);
      throw new Error("Failed to translate content");
    }
  }

  async detectLanguage(text: string): Promise<string> {
    // Simple language detection - check for Thai characters
    const thaiPattern = /[\u0E00-\u0E7F]/;
    return thaiPattern.test(text) ? "th" : "en";
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error("Failed to generate embedding");
    }
  }

  async generateEmbeddingFromTitle(title: string): Promise<number[]> {
    // Generate embedding from the title for semantic duplicate detection
    return this.generateEmbedding(title);
  }

  async generateEmbeddingFromContent(title: string, content: string): Promise<number[]> {
    // Generate embedding from FULL CONTENT (title + body) for more accurate duplicate detection
    // Truncate content to ~8000 chars to stay within embedding model limits (8191 tokens)
    const truncatedContent = content.substring(0, 8000);
    const combinedText = `${title}\n\n${truncatedContent}`;
    return this.generateEmbedding(combinedText);
  }


}

export const translatorService = new TranslatorService();
