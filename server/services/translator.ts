import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { translate } from "@vitalets/google-translate-api";
import { ensureProperParagraphFormatting, enforceSoiNamingConvention } from "../lib/format-utils";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
  isPolitics?: boolean;
  autoBoostScore?: boolean; // Set to false for "boring" stories that shouldn't be boosted to score 4+ even if video/hot
}

export interface ReEnrichmentResult {
  enrichedTitle: string;
  enrichedContent: string;
  enrichedExcerpt: string;
  hasNewInformation: boolean;
  newFactsSummary: string;
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
  "รถชน", // vehicle crash (รถ = vehicle, ชน = collision — NOT specifically car)
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
  // EARTHQUAKE / SEISMIC KEYWORDS - Safety-relevant natural events
  // Earthquakes are inherently newsworthy for southern Thailand / Andaman coast readers
  "แผ่นดินไหว", // earthquake
  "earthquake",
  "สึนามิ", // tsunami
  "tsunami",
  "แรงสั่นสะเทือน", // tremor/vibration
  "tremor",
  "seismic",
  "magnitude",
  "ริกเตอร์", // Richter (Thai)
  "Richter",
  "อาฟเตอร์ช็อก", // aftershock (Thai)
  "aftershock",
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
  // ENGLISH HOT KEYWORDS (for English sources or translated verification)
  "arrest",
  "arrested",
  "detained",
  "foreigner",
  "farang",
  "tourist",
  "expat",
  "shoot",
  "shooting",
  "killed",
  "death",
  "died",
  "drown",
  "drowning",
  "accident",
  "collision",
  "crash",
  "fire",
  "robbery",
  "theft",
  "fight",
  "brawl",
  "assault",
  "drugs",
  "cocaine",
  "prostitution",
  "work permit",
  "illegal work",
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
  // CORPORATE/CEREMONIAL KEYWORDS
  "ceremony", "ceremonies",
  "merit-making", "merit making", "alms-giving", "alms giving", "alms offering",
  "CSR", "corporate social responsibility",
  "charity handover", "scholarship handover", "donation ceremony", "donation drive",
  "opening ceremony", "ribbon cutting", "ribbon-cutting",
  "groundbreaking", "groundbreaking ceremony",
  "gala", "gala dinner", "awards ceremony", "awards night",
  "MOU", "MOU signing", "memorandum of understanding",
  "milestone", "company milestone", "corporate milestone",
  "inaugurated", "inauguration",
  "พิธี", "ทำบุญ", "ครบรอบ", "ตักบาตร", "มอบทุน",
  "เปิดงาน", "กิจกรรมเพื่อสังคม", "วางศิลาฤกษ์", "มอบรางวัล", "งานเลี้ยง",
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
  "ปราศรัย", // speech/rally
  "นโยบาย", // policy
  "คะแนนเสียง", // votes/ballots
  "เพื่อไทย", // Pheu Thai (Thai)
  "ก้าวไกล", // Move Forward (Thai)
  "ประชาชน", // People's Party (Thai)
  "ภูมิใจไทย", // Bhumjaithai (Thai)
  "ประชาธิปัตย์", // Democrat Party (Thai)
  "พลังประชารัฐ", // Palang Pracharath (Thai)
  "รวมไทยสร้างชาติ", // United Thai Nation (Thai)
  // English political terms (from translated content)
  "election",
  "campaign",
  "campaign atmosphere", // campaign events
  "election campaign",
  "candidate",
  "politician",
  "political party",
  "political event",
  "political rally",
  "mini-speech", // "mini-speech" mentioned in user's example
  "Pheu Thai Party", // Pheu Thai Party (full name)
  "Pheu Thai", // Pheu Thai
  "People's Party", // People's Party
  "Move Forward Party", // Move Forward
  "Move Forward",
  "Democrat Party", // Democrat Party
  "Bhumjaithai Party", // Bhumjaithai
  "Bhumjaithai",
  "Palang Pracharath", // Palang Pracharath
  "United Thai Nation", // UTN
  "MP ", // Member of Parliament with space to avoid false matches
  "parliament",
  "voting",
  "vote",
  "voters",
  "ballot",
  "constituency",
  "encouraging residents to vote", // campaign messaging
  "encourage to vote",
];

// LOST PET / MISSING ANIMAL KEYWORDS - Cap at score 2-3
// These are community notice-board type posts, NOT high-interest breaking news
// A missing cat or lost dog is not a crime, accident, or tourist incident
const LOST_PET_CAP_KEYWORDS = [
  // Thai keywords
  "หาย", // lost/missing
  "สูญหาย", // missing/lost (formal)
  "หายไป", // disappeared/went missing
  "ตามหา", // looking for/searching
  "ช่วยตามหา", // help find
  "แมวหาย", // cat missing
  "หมาหาย", // dog missing
  "สุนัขหาย", // dog missing (formal)
  "สัตว์เลี้ยงหาย", // pet missing
  "หลุดจากบ้าน", // escaped from home
  "วิ่งหนี", // ran away
  "หลงทาง", // got lost
  // English keywords (from translated content)
  "missing cat",
  "missing dog",
  "lost cat",
  "lost dog",
  "lost pet",
  "missing pet",
  "help locate",
  "help find",
  "help finding",
  "seeking help locating",
  "family seeks help",
  "owners searching",
  "have you seen",
  "reward for return",
  "escaped from home",
  "ran away from home",
  "beloved pet",
  "furry friend",
  "missing since",
  "last seen wearing", // collar description
  "wearing a collar",
  "red collar",
  "lost and found",
];

// LOCAL ENTERTAINMENT / CONCERT KEYWORDS - Cap at score 2
// Small concerts, live music events with unknown/local acts are NOT high-interest news for expat readers
// Only major international acts or music festivals with wide appeal should score higher
const LOCAL_ENTERTAINMENT_CAP_KEYWORDS = [
  // Thai keywords
  "คอนเสิร์ต", // concert
  "ไลฟ์สด", // live performance
  "เล่นสด", // live music
  "วงดนตรี", // band/music group
  "ศิลปิน", // artist/performer
  "เวทีดนตรี", // music stage
  "โชว์สด", // live show
  "มินิคอนเสิร์ต", // mini concert
  "คอนเสิร์ตสด", // live concert
  // English keywords (from translated content)
  "live concert",
  "live music",
  "live performance",
  "live show",
  "music event",
  "concert event",
  "mini concert",
  "local band",
  "local act",
  "local artist",
  "performing live",
  "energize", // marketing language for small gigs e.g. "Energize Saphan Hin"
  "lively atmosphere", // marketing fluff for small events
  "special deals", // promotional concert language
];

// PAGEANT / COMPETITION / CONTEST cap keywords
// Beauty pageants, costume competitions, community contests are local entertainment,
// NOT high-interest breaking news. Cap at score 3.
const PAGEANT_COMPETITION_CAP_KEYWORDS = [
  // Thai keywords
  "ประกวด", // contest/competition/pageant
  "นางงาม", // beauty queen/pageant
  "นางสาว", // Miss (beauty pageant title)
  "เวทีประกวด", // contest stage
  "การประกวด", // the competition/contest
  "ผู้เข้าแข่งขัน", // contestant
  "ผู้เข้าประกวด", // contestant (pageant)
  "คอสเพลย์", // cosplay
  "แฟนซี", // fancy dress
  "แข่งขัน", // compete/competition
  // English keywords (from translated content)
  "pageant",
  "beauty contest",
  "beauty competition",
  "beauty queen",
  "competition enters",
  "enters competition",
  "cosplay",
  "costume contest",
  "costume competition",
  "fancy dress",
  "talent show",
  "talent competition",
  "contestant",
  "contestants",
  "sailor moon", // cosplay character references
];

// Phuket location context map - CRITICAL DISAMBIGUATION ONLY
// NOTE: We intentionally DO NOT include generic tourist descriptions like "bustling tourist area" or
// "family-friendly beach" - our readers are locals and expats who already know Phuket well.
// These descriptions come off as condescending and "dumbing down" the content.
// We ONLY include context that prevents FACTUAL ERRORS (e.g., street name disambiguation).
const PHUKET_CONTEXT_MAP: Record<string, string> = {
  // PHUKET TOWN STREETS - Named after other Thai cities, DO NOT confuse with those cities!
  // These are the ONLY critical disambiguations needed to prevent location errors
  "ถนนกรุงเทพ": "Bangkok Road in PHUKET TOWN (NOT Bangkok city!)",
  "Bangkok Road": "Bangkok Road in PHUKET TOWN (NOT Bangkok city!)",
  "ถนนกระบี่": "Krabi Road in PHUKET TOWN (NOT Krabi province!)",
  "Krabi Road": "Krabi Road in PHUKET TOWN (NOT Krabi province!)",
  "ถนนพังงา": "Phang Nga Road in PHUKET TOWN (NOT Phang Nga province!)",
  "Phang Nga Road": "Phang Nga Road in PHUKET TOWN (NOT Phang Nga province!)",
  // SAPHAN HIN - "สะพาน" means "bridge" but Saphan Hin is a PLACE NAME, not a bridge!
  // DO NOT translate literally as "bridge" - it's a public park/promenade area in Phuket Town
  "สะพานหิน": "Saphan Hin - a public park and promenade area in PHUKET TOWN (NOT a bridge! สะพาน means bridge but this is a PLACE NAME)",
  "สะพานภูเก็ต": "Saphan Phuket area near Saphan Hin in PHUKET TOWN (NOT a bridge! This is a PLACE NAME - use 'Saphan Hin area')",
  "Saphan Hin": "Saphan Hin - a public park and promenade area in Phuket Town (this is a place name, NOT a bridge)",
  // VEHICLE TYPE DISAMBIGUATION - Prevent "รถ" from being blindly translated as "car"
  // "รถ" alone is ambiguous — only specific compound terms confirm car or motorcycle
  "รถยนต์": "รถยนต์ (CAR / automobile — 4-wheeled motor vehicle)",
  "รถเก๋ง": "รถเก๋ง (SEDAN / passenger car)",
  "รถกระบะ": "รถกระบะ (PICKUP TRUCK)",
  "รถบรรทุก": "รถบรรทุก (TRUCK / lorry)",
  "รถจักรยานยนต์": "รถจักรยานยนต์ (MOTORCYCLE / motorbike — NOT a car)",
  "มอเตอร์ไซค์": "มอเตอร์ไซค์ (MOTORBIKE / motorcycle — NOT a car)",
  "มอไซค์": "มอไซค์ (MOTORBIKE / motorcycle — NOT a car)",
  "สกู๊ตเตอร์": "สกู๊ตเตอร์ (SCOOTER / motorbike — NOT a car)",
  "รถมอเตอร์ไซค์": "รถมอเตอร์ไซค์ (MOTORCYCLE — NOT a car)",
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

🛣️ SOI (ALLEY) NAMING CONVENTION:
- **"Soi" ALWAYS comes BEFORE the name:** In Thai, it is "Soi Bangla", NOT "Bangla Soi". 
- ALWAYS correct instances of "[Name] Soi" to "Soi [Name]" in your output.
- EXAMPLES: "Soi Ta-iad", "Soi Dog", "Soi Bangla", "Soi Romanee".

🏞️ PLACE NAME vs LITERAL TRANSLATION:
- "สะพานหิน" / "Saphan Hin" = A PUBLIC PARK/PROMENADE in PHUKET TOWN, NOT a bridge! "สะพาน" means "bridge" in Thai but "Saphan Hin" is a PROPER NOUN / PLACE NAME. NEVER translate as "bridge" or "Phuket Bridge".
- "สะพานภูเก็ต" = Refers to the Saphan Hin area. Use "Saphan Hin" in English. Do NOT write "Phuket Bridge".
- "งานสะพานหิน" / "event at Saphan Hin" = An event at Saphan Hin park, NOT a "bridge event".

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

// ENFOCE SOI NAMING CONVENTION: Moved to server/lib/format-utils.ts

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
// Moved to server/lib/format-utils.ts for shared use

export class TranslatorService {
  // Premium GPT-4 enrichment for high-priority stories (score 4-5) or manual scrapes
  async enrichWithPremiumGPT4(params: {
    title: string;
    content: string;
    excerpt: string;
    category: string;
    communityComments?: string[]; // Optional: Top comments from Facebook post for context
  }, model: "gpt-4o" | "gpt-4o-mini" = "gpt-4o"): Promise<{ enrichedTitle: string; enrichedContent: string; enrichedExcerpt: string }> {

    // ── Source of Truth for Context Blocks ──────────────────────────────────
    // The detailed context used below is maintained in:
    // server/data/phuket-context-library.md
    // Please update that reference document when adding new context over time.

    // ── Category-conditional context blocks ─────────────────────────────────
    // Each block contains verified Phuket facts the model is PERMITTED to draw from.
    // Only the block matching the article's category is injected (keeps token cost low).
    const CATEGORY_CONTEXT_BLOCKS: Record<string, string> = {
      'Crime': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:
- Emergency: Tourist Police 1155, Police 191, Ambulance 1669, Fire 199
- Stations: Phuket has 8 police stations (Phuket City, Chalong, Patong, Kathu, Thalang, Cherng Talay, Kamala, Wichit). Patong handles most tourist nightlife incidents.
- Legal Context: Foreigners are entitled to consular access. Bail for foreigners is often higher; passport seizure is standard for serious charges.
- Drugs: Severe penalties; Category 1 (meth, heroin, MDMA) possession can carry 1-10 years; trafficking carries life.
- Common Scams/Crimes: Bag snatching (from motorbikes), rental scams, jet ski damage scams, drink spiking.
- Warning: Thai defamation law is criminal. Posting negative reviews can result in criminal charges.
- Naming: If a foreigner is named in a police report, use their nationality ONLY if explicitly stated. Never guess from names.`,

      'Traffic': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:
- Safety: Phuket roads have some of Thailand's highest accident rates, especially for motorbikes.
- Driving Rules: Drive on the LEFT. International Driving Permit (IDP) or Thai license required for foreigners. Helmets mandatory (driver & passenger); drink driving limit 0.05% BAC.
- Known Blackspots: Patong Hill (steep/blind curves), Heroines Monument intersection, Thepkrasattri Road, Chalong Circle, Darasamut & Sam Kong intersections, Si Ko intersection, Kata Hill, Bypass Road curves.
- Hospitals: Vachira Phuket Hospital (government trauma center) and Bangkok Hospital Phuket (private, advanced trauma).
- Rescue: Kusoldharm Rescue Foundation (076-246 301) operates primary first-responder network.
- Liability: Often the larger vehicle is presumed at fault by police/insurance. Passports may be seized pending fatal accident investigations.`,

      'Accidents': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:
- Safety: Phuket roads have some of Thailand's highest per-capita accident rates.
- Known Blackspots: Patong Hill (steep/blind curves), Heroines Monument intersection, Thepkrasattri Road, Chalong Circle, Darasamut & Sam Kong intersections, Si Ko intersection.
- Hospitals: Vachira Phuket Hospital (main government trauma center), Bangkok Hospital Phuket (best-equipped private trauma).
- Rescue: Kusoldharm Rescue Foundation (076-246 301) operates primary first-responder network.
- Driving Rules: Helmets mandatory (driver & passenger); foreigners require IDP or Thai license. In accidents, larger vehicles are often presumed at fault.`,

      'Tourism': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:
- Demographics: 10-14 million visitors in 2025 (top markets: Russia, India, China).
- Seasons: High season (Nov-April); Monsoon/low season (May-Oct) brings rough seas and red flags on west coast beaches. Drownings are a leading cause of tourist death.
- Transport: No Uber/Grab car service. Options: tuk-tuks (often overcharge), private taxis, Bolt, songthaews.
- Marine: Boat accidents peak in monsoon season. Similan/Surin Islands close May-Oct.
- Laws: Alcohol sales prohibited on Buddhist holidays and election days. Cannabis is decriminalized but public consumption is discouraged.
- Visas: 60-day visa-exempt entry for most Westerners (2025 policy).`,

      'Lifestyle': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:
- Seasons: High season (Nov-April); Monsoon/low season (May-Oct).
- Transport: No Uber/Grab car service. Options: tuk-tuks, private taxis, Bolt, songthaews.
- Laws: Alcohol sales prohibited on Buddhist holidays and election days. Cannabis is decriminalized but public consumption is discouraged.
- Visas: 60-day visa-exempt entry. 30-day extensions at Phuket Immigration Office (Phuket Town) for 1,900 THB. 90-day reporting for long-stay. Overstay fines are 500 THB/day.
- Medical: Government hospitals (Vachira, Patong, Thalang) are cheaper but have long waits. Private (Bangkok Hospital Phuket, Siriroj, Mission) are expensive/best-equipped. Travel insurance critical.
- Real Estate: Foreigners cannot own land (nominee structures common but illegal). Can own up to 49% of condo units.`,

      'Nightlife': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:
- Bangla Road: Primary nightlife strip in Patong, pedestrianized from ~6 PM.
- Closing Times: Standard venues 2 AM; extended zones (Bangla) 3-4 AM. Unlicensed venues face immediate closure.
- Police Raids: Check for licenses, closing time compliance, underage patrons, drugs, overstay foreigners.
- Safety: "Drink spiking" reported periodically (Tourist Police advise not leaving drinks unattended). Common scams include inflated bills and "lady drink" surprises.
- Alcohol Sales: Legal hours 11:00-14:00 and 17:00-00:00 (often unenforced at licensed venues). Banned on Buddhist holidays/elections.
- Sub-scenes: Phuket Town (Soi Romanee) for upscale cocktails; Rawai/Nai Harn for local expat bars; Bang Tao/Kamala for beach clubs.`,

      'Weather': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:
- Seasons: Cool/dry (Nov-Feb), Hot (Mar-Apr, 35°C+), Monsoon (May-Oct).
- Monsoon Impact: Heavy rain and flash flooding in low-lying areas (Patong, Sam Kong, Rassada, Koh Kaew underpass). West coast beaches dangerous with rip currents.
- Marine: Phuket Marine Office may suspend boat services in severe weather.
- Dry Season: Water shortages peak March-April, relying heavily on reservoirs.
- Alerts: Thai Meteorological Department (TMD) issues official weather warnings.`,

      'Environment': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:
- Seasons: Monsoon (May-Oct) brings heavy rain; Dry season peaks Mar-Apr causing localized water shortages.
- Flooding: Flash flooding common in Patong, Sam Kong, Rassada, and Koh Kaew underpass.
- Marine: Coral reef and marine park closures (Similan, Surin) occur annually around May-Oct for recovery. West coast beaches have dangerous rip currents in monsoon season.
- Air Quality: Occasionally affected by agricultural burning haze from mainland SEA (Feb-Apr).`,

      'Infrastructure': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:
- Transport Hubs: Phuket International Airport (HKT) is the sole airport and Thailand's second busiest. Located in Thalang district at the north of the island.
- Connectivity: The Sarasin Bridge connects Phuket to mainland Thailand (Phang Nga province).
- Roads: Thepkrasattri Road is the single main traffic artery connecting the airport/north to Phuket Town/south. Accidents here cause severe island-wide delays.
- Utilities: Island power is supplied via underwater cables from the mainland; brief outages are common during storms.
- Water: Relies heavily on reservoirs (Bang Wad, Bang Neow Dum); fresh water shortages occur in peak dry season (March-April).`
    };

    const GENERAL_CONTEXT_BLOCK = `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:
- Emergency numbers: Tourist Police 1155, Police 191, Ambulance 1669
- Phuket is a province of Thailand, not an independent jurisdiction; national laws and policies apply
- The island has approximately 400,000 registered residents but the actual population including unregistered workers and long-term visitors is estimated significantly higher
- Phuket's economy is overwhelmingly tourism-dependent`;

    // ── Universal Location Context ──────────────────────────────────────────
    // Gets injected into ALL enrichment calls to prevent chronic AI mapping errors
    const GENERAL_LOCATION_CONTEXT = `CRITICAL LOCATION RULES FOR ALL STORIES:
- "Bangkok Road" (ถนนกรุงเทพ) is a street in PHUKET TOWN. It is NEVER in Bangkok city.
- "Krabi Road" and "Phang Nga Road" are streets in PHUKET TOWN. They are NOT the neighboring provinces.
- ALWAYS write "Soi [Name]" (e.g., Soi Bangla). NEVER write "[Name] Soi" or "the Soi".
- Thai administrative terms: Moo (village number), Tambon (subdistrict), Amphoe (district - Phuket has 3: Mueang, Kathu, Thalang).
- Key Landmarks: Heroines Monument (border of Thalang/Kathu/Mueang), Central Phuket (bypass road), Jungceylon (Patong), Big Buddha (Nakkerd Hill), Chalong Temple, Saphan Hin (park in Phuket Town), Patong Pier (at the south end of Patong Beach).`;

    const contextBlock = CATEGORY_CONTEXT_BLOCKS[params.category] || GENERAL_CONTEXT_BLOCK;

    // ── New system prompt (insider voice, not wire-service tourist-brochure) ──
    const systemPrompt = `You are a veteran wire-service correspondent who has lived in Phuket for over a decade. You write breaking news for an audience of long-term expats and residents who know the island intimately — they know every soi, every shortcut, every police station. Never explain Phuket to them. Write like an insider talking to insiders.

Your job is to transform raw translated Thai-language source material into a complete, professional English news article. You must:

1. Report ONLY what the source explicitly states — never invent, embellish, or dramatize
2. ADD relevant context and background using the verified reference material provided — but only when it connects specifically to THIS story, not as generic filler
3. Write articles substantial enough to be genuinely useful, even when the source material is brief
4. End every article with an "On the Ground" section — story-specific practical context written in an insider voice (see instructions in user message)

VOICE: You are not writing a travel safety brochure. You are writing for people who live here. They don't need to be told what Bangla Road is or that Thailand drives on the left. They DO want to know which specific police station is handling this case, whether this stretch of road has had similar incidents, or what the actual practical implications are for their daily life.

You produce JSON output only. No markdown, no commentary outside the JSON structure.`;

    // ── Structured user message ──────────────────────────────────────────────
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' });

    const commentsBlock = params.communityComments && params.communityComments.length > 0
      ? `THAI COMMUNITY COMMENTS (mine aggressively — see instructions below):\n${params.communityComments.map((c, i) => `${i + 1}. "${c}"`).join('\n')}`
      : '';

    const prompt = `📅 CURRENT DATE: ${currentDate} (Thailand Time)
ARTICLE CATEGORY: ${params.category}

${contextBlock}

${GENERAL_LOCATION_CONTEXT}

---

SOURCE MATERIAL TO ENRICH:

Original Title: ${params.title}

Original Content:
${params.content}

Original Excerpt:
${params.excerpt}

${commentsBlock}

---

ENRICHMENT INSTRUCTIONS:

⏰ TENSE VERIFICATION:
- Compare any dates in the source to TODAY's date above
- Past events = past tense. Do NOT use present continuous for completed actions.
- If no date is stated, do NOT assume the event is happening right now. Treat as a completed past event.
- NEVER copy future tense from an outdated source if the event has already passed.

🚨 FACTUAL ACCURACY:
- Report ONLY what the source explicitly states
- Do NOT embellish or upgrade language ("reckless" ≠ "stunts", "disturbing" ≠ "caused chaos", "group" ≠ "mob")
- Do NOT add generic area descriptions that locals would find patronizing ("Patong, a bustling tourist area..." — LOCALS KNOW THIS)
- Do NOT use vague filler phrases: "underscores concerns", "highlights challenges", "raises questions about", "sparks debate" — these are banned. Be specific or say nothing.
- You MAY add facts from the VERIFIED PHUKET REFERENCE section above when they are directly relevant to the story. These are confirmed true. Integrate them naturally — don't dump them in.

🚗🏍️ VEHICLE TYPE ACCURACY (CRITICAL):
- The Thai word "รถ" (rot) is a GENERIC term meaning "vehicle" — NOT specifically "car"
- If the already-translated input says "car" but the original Thai only used "รถ" (without รถยนต์/เก๋ง), use "vehicle" instead
- Only call it a "car" if the source explicitly says รถยนต์, รถเก๋ง, รถ SUV, etc.
- Only call it a "motorbike/motorcycle" if the source says รถจักรยานยนต์, มอเตอร์ไซค์, สกู๊ตเตอร์, etc.
- When unsure, always fall back to: "vehicle", "the vehicle", "the abandoned vehicle" — never guess

🌏 LOCATION RULES:
- "Bangkok Road" in a Phuket article = a street in Phuket Town, NOT Bangkok city
- Same for "Krabi Road", "Phang Nga Road" — these are Phuket Town streets, not the provinces
- Dateline = WHERE THE EVENT HAPPENED, not where the people are from
- Use "Soi Bangla" not "Bangla Soi" — Soi always comes first
- "Saphan Hin" = a public park/promenade in Phuket Town, NOT a bridge

${params.communityComments && params.communityComments.length > 0 ? `🎭 COMMENT MINING (comments provided above — mine aggressively):

Thai Facebook comments are one of your most valuable sources. They often contain MORE information than the original post.

A. SARCASM & TONE DETECTION:
- "นักท่องเที่ยวคุณภาพ" / "Quality tourist" + 🤣 = SARCASM meaning BAD behavior
- "555" = Thai internet laughter, usually mocking
- Use tone of comments to determine the true story when the caption is ambiguous

B. EYEWITNESS DETAILS — Look for comments that add factual detail:
- Specific times, specific details the post missed, corrections, aftermath updates
- Include these as attributed color: "Commenters on the original post reported that..." or "One commenter who claimed to be at the scene said..."

C. LOCAL KNOWLEDGE — Look for comments that provide context:
- History of the location ("this junction has had multiple accidents this year")
- Known local issues ("that bar has been raided before")
- Practical info ("the CCTV from the 7-Eleven there will have caught it")
- Integrate naturally into the body or Background section

D. COMMUNITY REACTION — When the reaction IS the story:
- If comments are overwhelmingly angry, sympathetic, or mocking, that's part of the story
- Summarize sentiment: "The post drew widespread criticism from Thai commenters, many of whom..."

⚠️ CRITICAL RULES FOR COMMENT-SOURCED INFORMATION:
- NEVER present comment claims as confirmed fact. Always attribute: "according to commenters", "one commenter reported", "local residents responding to the post said"
- If a comment CONTRADICTS the original post, note the discrepancy
- Ignore pure reactions (emojis, "wow", single-word responses) — only mine substantive comments
- Do NOT include names of victims or suspects found only in comments

` : ''}📝 ARTICLE STRUCTURE:

1. **DATELINE**: Bold caps showing where the event happened (e.g., **PATONG, PHUKET —**)

2. **LEDE**: One paragraph answering Who, What, Where, When. Be specific.

3. **DETAILS**: Expand on the lede with all available facts from the source.${params.communityComments && params.communityComments.length > 0 ? ' Then mine the comments thoroughly using the rules above — eyewitness details, corrections, local knowledge, and community reaction can all add substantial depth.' : ''} Use direct quotes if the source contains them.

4. **BACKGROUND** (when relevant): Draw on the VERIFIED PHUKET REFERENCE material above, but ONLY facts that connect directly to THIS specific story.

   GOOD example (story-specific): "It's the third motorbike fatality on Patong Hill this year — the stretch between the Kathu junction and the viewpoint remains one of the island's most dangerous."
   
   BAD example (generic filler): "Phuket has some of the highest road accident rates in Thailand. Foreign drivers are advised to carry an International Driving Permit."
   
   The test: would a long-term Phuket resident learn something from this sentence, or roll their eyes? If they'd roll their eyes, cut it.

5. **ON THE GROUND** (REQUIRED — include in EVERY article): A short section at the end with an <h3>On the Ground</h3> tag. This is NOT a safety brochure. It's story-specific insider context — what a well-connected local would tell a friend.

   WHAT THIS SECTION SHOULD SOUND LIKE:
   - "Thalang Police are handling the case — the station is the one just past the Heroines Monument heading north."
   - "That section of Thepkrasattri is a known blackspot, especially after dark. There's been talk of adding lights since at least 2022."
   - "If you were in the area and have dashcam footage, Patong Police are actively asking for it."
   - "Vachira will be the receiving hospital for anything on this side of the island."

   WHAT THIS SECTION SHOULD NEVER SOUND LIKE:
   - "If you are involved in a traffic accident, remain at the scene and call 191."
   - "Tourists are advised to exercise caution when visiting nightlife areas."
   - "Foreign nationals should ensure they carry a valid International Driving Permit at all times."
   
   2-4 sentences max. Use the reference material to find the relevant fact (which station, which hospital, what the law actually says), then phrase it the way a local would.

6. **DEVELOPING STORY INDICATOR** (conditional): If the source material is very thin (only 1-3 facts available) and you cannot build the article to 150+ words even with Background and On the Ground sections, add this element immediately after the dateline:

<p class="developing-story"><strong>⚡ Developing Story</strong> — Initial reports are limited. This article will be updated as more details become available.</p>

This is BETTER than padding a thin story with generic filler. A 100-word article that's honest about being a breaking alert is more credible than a 200-word article stuffed with "motorists are advised to exercise caution."

TONE: Write like a veteran correspondent who lives in Phuket and files stories for people who also live there. Professional but not sterile. Specific but not padded. You're not writing a travel advisory — you're writing the news for your neighbors.

MINIMUM LENGTH: The enrichedContent should be at least 150 words. If the source material is thin, Background and On the Ground carry the weight — but only with genuinely relevant, story-specific content. Never pad with generic advice or area descriptions.

FORMATTING REQUIREMENTS:
- EVERY paragraph MUST be wrapped in <p></p> tags
- Use <h3> tags for section headings (Background, On the Ground, Public Reaction)
- NEVER return content as a single wall of text

OUTPUT FORMAT — Return ONLY valid JSON, no markdown fences, no commentary:

{
  "enrichedTitle": "Factual AP-style headline. Be specific: names, places, numbers. NEVER use 'raises concerns' or 'sparks debate'. GOOD: 'Russian Tourist Arrested With 3kg of Cocaine in Cherng Talay'. BAD: 'Drug Arrest Raises Concerns in Phuket'.",
  "enrichedContent": "Full HTML article. Use <p> tags for paragraphs, <h3> for section headers. Start with bold DATELINE. Always include the On the Ground section.",
  "enrichedExcerpt": "2-3 sentence factual summary describing what happened. Used for meta descriptions and social sharing — make it specific and compelling. FORBIDDEN: 'highlights concerns', 'raises questions'."
}`;

    // ── Provider routing: OpenAI (default) or Anthropic Claude ──────────────
    const enrichmentProvider = process.env.ENRICHMENT_PROVIDER || 'openai';
    const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

    let result: { enrichedTitle?: string; enrichedContent?: string; enrichedExcerpt?: string } = {};

    if (enrichmentProvider === 'anthropic') {
      // ── Anthropic Claude path ──────────────────────────────────────────────
      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('   ⚠️  ANTHROPIC_API_KEY not set — falling back to OpenAI GPT-4o');
        // Fall through to OpenAI below by resetting provider check
        const completion = await openai.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        });
        result = JSON.parse(completion.choices[0].message.content || "{}");
      } else {
        console.log(`   🤖 [ANTHROPIC] Enriching with ${anthropicModel}`);
        const response = await anthropic.messages.create({
          model: anthropicModel,
          max_tokens: 3000,
          temperature: 0.3,
          system: systemPrompt,
          messages: [{ role: "user", content: prompt }],
        });
        const responseContent = response.content[0];
        if (responseContent.type !== 'text') {
          throw new Error(`Unexpected Anthropic response type: ${responseContent.type}`);
        }
        // Strip any accidental markdown code fences before parsing
        const cleaned = responseContent.text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        result = JSON.parse(cleaned);
      }
    } else {
      // ── OpenAI path (default) ──────────────────────────────────────────────
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });
      result = JSON.parse(completion.choices[0].message.content || "{}");
    }

    // Apply paragraph formatting safeguard
    const formattedContent = ensureProperParagraphFormatting(result.enrichedContent || params.content);

    return {
      enrichedTitle: enforceSoiNamingConvention(result.enrichedTitle || params.title),
      enrichedContent: enforceSoiNamingConvention(formattedContent),
      enrichedExcerpt: enforceSoiNamingConvention(result.enrichedExcerpt || params.excerpt),
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
    },
    sourceUrl?: string
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
6. **🥊 DETECT FAKE SPORT = REAL BRAWL**: If the caption uses "boxing" / "มวย" / a sport name IN QUOTES, and comments are LAUGHING (555/🤣) rather than cheering → this is a STREET BRAWL being sarcastically called a "boxing match". Comments may reference lunar month superstitions, luck, bad omens — this is Thai humor about unexpected violence, NOT commentary on a real sporting event. RE-INTERPRET as an unplanned fight between individuals.

🚫 DO NOT:
- Write a sanitized "mysterious curiosity" story when comments reveal it's about DRUG SALES
- Score drug/crime stories at 3 just because the caption was vague
- Ignore Thai slang for drugs/illegal activity
- Describe a street brawl as a "boxing match" or "sporting event" just because the Thai caption SARCASTICALLY called it that in quotes
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

🚫 DO NOT ADD GENERIC AREA DESCRIPTIONS (CRITICAL):
Our readers are LOCAL RESIDENTS and EXPATS who know Phuket extremely well. Writing like a tourist guide is CONDESCENDING. DO NOT add:
- "Patong, a bustling tourist area on Phuket's west coast" - LOCALS KNOW WHAT PATONG IS
- "Bangla Road, Patong's famous nightlife strip" - EVERYONE KNOWS THIS
- "Chalong, known for the Big Buddha" - THIS IS PATRONIZING

Write like you're talking to an INSIDER who reads this site every day, not a clueless tourist.
The ONLY exception for area context: If this story relates to a RECURRING THEME in that area (e.g., "This is the latest in a series of Bangla Road altercations" or "Parking disputes in this soi have been escalating").

PUBLIC SENTIMENT IS PRIORITY:
If community comments are available, readers want to hear what locals are saying about this story - NOT generic tourist-guide descriptions of the area.

⚠️ CRITICAL - ZERO HALLUCINATION POLICY (READ CAREFULLY):
- ONLY write about what is explicitly stated or shown in the source.
- DO NOT INVENT actions, behaviors, or events that aren't described (e.g., "shouted", "appeared agitated", "caused chaos").
- 🚨 PATONG/BANGLA ROAD HALLUCINATION WARNING: If the source says "Patong", do NOT assume it happened on "Bangla Road". Patong has many other piers, docks, shops, and beaches. Only name Bangla Road if the source EXPLICITLY mentions it.
- If source shows tourists on motorbike being stopped by police, report ONLY that - do NOT add that they "shouted at passersby" unless the source says so.
- DO NOT add generic area fluff like "bustling tourist area" - this is hallucination of a different kind.
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

⏰ CRITICAL - TENSE VERIFICATION & TEMPORAL GROUNDING (READ BEFORE WRITING):
- CHECK EVENT DATES: If the source mentions specific dates for an event, compare them to TODAY's date above.
- PAST EVENTS = PAST TENSE: If an action is complete (e.g., a rescue, an accident, a sinking), write in PAST TENSE ("were rescued", "took place", "occurred").
- NO FALSE PRESENT CONTINUOUS TENSE: DO NOT report completed actions using present continuous tense ("are being rescued"). DO NOT assume events are happening right now just because they are in the news. Assume events are completed past actions unless explicitly stated that they are unfolding currently.
- PREVIOUS EVENTS: If the source states an event happened previously, report it as a past event.
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

🚨 SOI (ALLEY) NAMING CONVENTION (CRITICAL):
- In Thai, "Soi" ALWAYS comes BEFORE the name.
- WRONG: "Bangla Soi", "Ta-iad Soi", "Dog Soi"
- CORRECT: "Soi Bangla", "Soi Ta-iad", "Soi Dog"
- ALWAYS output correctly as "Soi [Name]".

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

🥊 QUOTED SPORT / FORMAL VOCABULARY = STREET BRAWL (CRITICAL PATTERN — READ THIS):
This is one of the most common and most dangerous sarcasm traps for AI translation:
- When a Thai caption puts a sport or formal name in **quotation marks** (e.g. "Women's boxing" / "มวยหญิง" / "ชกมวย"), it is almost ALWAYS sarcasm for an unplanned street fight, not a real sporting event.
- The use of 🥊 / 👊 boxing emojis combined with a location like a street, soi, or bar area (NOT a stadium) confirms this is a brawl, NOT a match.
- BANGLA / PATONG CONTEXT: Real Muay Thai / boxing events happen inside stadiums with tickets, referees, rounds, and crowds. A "boxing match" occurring on Soi New York, Bangla Road, or outside a bar is BY DEFINITION an unplanned drunken street fight.
- The mention of participants having "เลือดอาบหน้า" (blood running down the face) in a street context without any reference to a ring/referee/crowd = chaotic brawl, NOT sport.
- If comments on the post are laughing (555, 🤣) rather than cheering = it's a brawl being mocked as "boxing", not a real match.

QUOTED FORMAL VOCABULARY SARCASM — HOW TO DETECT:
1. Sport in quotation marks ("boxing", "wrestling", "competition") inside a street/bar location = BRAWL
2. Sport emoji (🥊👊🤼) + unplanned street location = BRAWL
3. The caption uses the word "today" / "morning" / "spontaneous" = UNPLANNED incident, not ticketed event
4. No mention of stadium, ticketing, referee, rounds, judges = NOT a real sporting event
5. Comments are mocking/laughing rather than excited = confirms brawl, not sport

REAL SPORTING EVENT SIGNALS:
- Explicit venue name (Bangla Boxing Stadium, Rawai Muay Thai, Patong Boxing Stadium)
- Mentions of rounds, corners, referees, ring, announcer, judges
- Comments using supporter language ("Go!", team names, cheer emojis like 🎉)

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

EXAMPLE INTERPRETATIONS:
❌ WRONG: "Tourist Enjoys Patong's Vibrant Street Scene" (literal caption interpretation)
✅ CORRECT: "Tourist Found Passed Out on Patong Street, Locals React with Amusement"

❌ WRONG: "Foreign Fighter Injured in Women's Boxing Match at Bangla Stadium" (took "Women's boxing" literally + hallucinated a stadium)
✅ CORRECT: "Drunken Street Brawl Between Thai and Foreign Women Breaks Out on Soi New York, Patong"
   WHY: Caption put "Women's boxing" in quotes + location was a street soi (not a stadium) + blood visible = street brawl, not a sporting event. Thai commenters were mocking with 😂 / 555, and referenced lunar month superstitions sarcastically. NEVER invent a venue ("Bangla Stadium") when the source says "inside Soi New York, Bangla".

GRAMMAR & STYLE:
- Follow AP Style for headlines: capitalize main words
- ALWAYS include company suffixes: Co., Ltd., Inc., Corp., Plc.
- Use proper articles (a, an, the)
- Write in active voice when possible

🚗🏍️ VEHICLE TYPE DISAMBIGUATION (CRITICAL — READ BEFORE TRANSLATING ANY VEHICLE STORY):
The Thai word "รถ" (rot) is a GENERIC WORD meaning "vehicle" — it does NOT specifically mean "car".
DO NOT translate "รถ" as "car" unless the source text explicitly uses one of these car-specific terms:
  - รถยนต์ = car / automobile (4-wheel motor vehicle)
  - รถเก๋ง = sedan
  - รถSUV / รถกระบะ = SUV / pickup truck
  - รถบรรทุก = truck

If the source ONLY says "รถ" without a car-specific modifier, the vehicle type is AMBIGUOUS.
In that case:
  ✅ USE: "vehicle", "the vehicle", "the abandoned vehicle"
  ❌ AVOID: "car", "automobile" (these are WRONG if source only says "รถ")

Motorcycle-specific Thai terms (use "motorbike" / "motorcycle" if you see these):
  - รถจักรยานยนต์ = motorcycle
  - มอเตอร์ไซค์ / มอไซค์ = motorbike (slang/colloquial)
  - สกู๊ตเตอร์ = scooter
  - รถมอเตอร์ไซค์ = motorcycle

Other vehicle terms:
  - รถตุ๊กตุ๊ก = tuk-tuk
  - รถสองแถว = songthaew (shared taxi)
  - รถบัส = bus
  - รถกระบะ = pickup truck

⚠️ EXAMPLE of what to avoid:
❌ WRONG: "An abandoned CAR belonging to a foreign national was found at Phuket Airport" — if source says "รถ" only
✅ CORRECT: "An abandoned VEHICLE belonging to a foreign national was found at Phuket Airport"

This is especially important for headlines and article titles. If vehicle type is uncertain, use a neutral term:
  - "Abandoned Vehicle at Phuket Airport" (not "Abandoned Car")
  - "Vehicle Found at..." (not "Car Found at...")

CATEGORY GUIDE (read full story, not just headline):
- Weather: Natural disasters, typhoons, flooding, landslides, storms (IN PHUKET ONLY)
- Local: Community news, missing persons, drownings, boat accidents, local government
- Traffic: Road accidents (non-criminal), road closures, construction
- Crime: ONLY intentional criminal activity - arrests, theft, assault, scams
- National: Major news from outside Phuket (Bangkok, Hat Yai, Chiang Mai, etc.) AND Southern Thailand floods/disasters that are NOT in Phuket
- WHEN UNCERTAIN: Use "Local" as default

CRITICAL: "Southern Floods" in Hat Yai, Songkhla, Narathiwat, Yala = "National" (NOT "Weather" or "Local")

🚨 CATEGORY CRITICAL RULE — LOCATION OF EVENT, NOT NATIONALITY/ORIGIN:
- Category is determined by WHERE THE EVENT HAPPENED, NOT the nationality of the people involved or whether international agencies are involved.
- A French man arrested IN RAWAI = Category "Crime" (happened in Phuket), NOT "National"
- A Russian tourist caught WITH DRUGS IN PATONG = Category "Crime", NOT "National"
- An Interpol suspect ARRESTED IN PHUKET = Category "Crime", NOT "National"
- Chinese gang BUSTED IN PHUKET = Category "Crime", NOT "National"
- A Thai policeman arrested for corruption IN PHUKET = Category "Crime", NOT "National"
- "National" ONLY means the event occurred OUTSIDE Phuket province. It NEVER means "international" or "involving foreign nationals".

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
- 2 = ROUTINE: Officials inspecting/visiting, meetings, announcements, cultural events, preparations, planning, **community sports events, friendly matches, alumni gatherings, local football/futsal matches**, **small concerts/live music with unknown or local-only acts**
- 1 = TRIVIAL: Ceremonial events, ribbon cuttings, photo ops

**EARTHQUAKE / NATURAL DISASTER SCORING (CRITICAL):**
- Earthquakes ANYWHERE in southern Thailand, Andaman coast, or nearby regions (Surat Thani, Ranong, Phang Nga, Krabi, Myanmar border) = Score 4 MINIMUM
- Earthquakes are safety-relevant events for ALL Phuket residents (earthquake → potential tsunami risk for Andaman coast)
- Even "small" earthquakes (magnitude 3+) are newsworthy because readers worry about aftershocks and bigger quakes
- Earthquake with casualties or structural damage = Score 5
- EXAMPLES:
  - "Earthquake hits Surat Thani, magnitude 3.2" = Score 4 (nearby seismic event, safety concern)
  - "Series of tremors in southern Thailand" = Score 4 (developing seismic situation)
  - "Strong earthquake near Myanmar border felt in Phuket" = Score 5 (directly affects readers)
  - "Tsunami warning issued" = Score 5 (BREAKING, life-threatening)

**LOCAL CONCERT / ENTERTAINMENT EVENT RULES (CRITICAL - READ THIS):**
- Small concerts, live music events, and local entertainment with mostly unknown or local-only acts = ABSOLUTE MAX SCORE 2
- Ask: "Would an expat reader specifically go out of their way for this?" If the answer is no, cap at 2.
- EXAMPLES of what to CAP at Score 2:
  - "T-Conic Live Concert at Saphan Hin" = Score 2 (local entertainment, unknown acts)
  - "Local band performs at beach bar" = Score 2 (routine entertainment)
  - "Mini concert with local artists" = Score 2 (small-scale event)
  - "Live music night at [venue]" = Score 2 (routine nightlife)
- EXCEPTION: Major international acts, large-scale music festivals (e.g. EDC, Wonderfruit), or events featuring well-known artists = Score 3-4

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
- **"Local concert with unknown acts" = Score 2 MAX (routine entertainment, NOT news)**
- **"Beauty pageant/contest" = Score 3 MAX (community entertainment, NOT breaking)**
- **"Cosplay/costume competition" = Score 3 MAX (community entertainment, NOT breaking)**
- **"Contestant enters competition" = Score 3 MAX (community event, NOT breaking)**
- **"Local talent show" = Score 3 MAX (community entertainment, NOT breaking)**
- "Car crash with injuries" = Score 4 (actual incident with victims)
- "Drowning at beach" = Score 5 (death/urgent)
- "Arrest for theft" = Score 4 (crime with action)
- **"Foreigner in fight with locals" = Score 5 (viral expat content)**
- **"Tourist arrested for..." = Score 5 (foreigner incident)**
- **"Expat involved in accident" = Score 5 (foreigner incident)**
- **"Foreigner doing something weird/silly" = Score 5 (viral expat content - pot on head, funny behavior, etc.)**
- **"Sea turtle eggs laid at beach" = Score 5 (wildlife, conservation, family-friendly viral)**
- **"Good samaritan returns lost property" = Score 4-5 (heartwarming, shareable)**

**BEAUTY PAGEANT / COMPETITION / CONTEST RULES (CRITICAL):**
Never score 4 or 5 for the following — these are score 3 maximum:
- Beauty pageants, beauty contests, Miss/Mr competitions
- Cosplay competitions, costume contests, fancy dress events
- Talent shows, talent competitions, community contests
- Contestants entering or winning local/regional competitions
- "International" in the event name does NOT make it high-interest — "Phuket International Competition" is still a local community event
- Social media attention on a contestant (e.g., viral cosplay) does NOT elevate it above score 3
- These are community entertainment stories, NOT breaking news

**CORPORATE MILESTONES / CEREMONIAL EVENTS RULES (CRITICAL):**
Never score 4 or 5 for the following — these are score 2-3 maximum regardless of detail, officials present, or production quality:
- Corporate milestones or company anniversaries
- Merit-making ceremonies or alms-giving events
- CSR activities or charity handovers
- Scholarship donations or foundation events
- Officials attending non-emergency events (inspections, openings, visits)
- Ribbon cuttings, groundbreaking ceremonies, MOU signings
- Gala dinners, awards nights, banquets
Gut check: "Would a foreign resident of Phuket share this in an expat Facebook group?" If the answer is no, it is not a 4.

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

**LOST PET / MISSING ANIMAL RULES (CRITICAL - READ THIS):**
- Missing cats, lost dogs, escaped pets = ABSOLUTE MAX SCORE 2 (community notice-board posts, NOT news)
- "Help find my cat" or "Family seeks help locating pet" = Score 2 MAX
- These are NOT high-interest stories. They are routine community posts.
- DO NOT boost lost pet stories just because they mention cute animals or ask for "help"
- DO NOT confuse "help find my pet" with actual rescue/good samaritan stories
- EXAMPLES of what to CAP at Score 2:
  - "Family Seeks Help Locating Missing Cat" = Score 2 (lost pet notice)
  - "Missing Black Cat in Takua Pa" = Score 2 (lost pet notice)
  - "Lost Dog - Reward Offered" = Score 2 (lost pet notice)
  - "Have You Seen This Cat?" = Score 2 (lost pet notice)
- EXCEPTION: If an animal story involves RESCUE (e.g., "Cat rescued from burning building"), that's newsworthy = Score 4

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

      // Combined text for keyword matching (both original and translated)
      const combinedTextForScoring = `${title} ${content} ${result.translatedTitle || ''} ${result.translatedContent || ''}`.toLowerCase();

      // Boost for hot keywords (urgent news like drownings, crime, accidents, foreigner incidents)
      const hasHotKeyword = HOT_KEYWORDS.some(keyword =>
        combinedTextForScoring.includes(keyword.toLowerCase())
      );

      // SPECIFIC BOOST FOR FOREIGNER ARRESTS / INDECENCY (High-engagement "abnormal" behavior)
      const isForeignerStory = [
        "foreigner", "foreign", "tourist", "farang", "expat", "ต่างชาติ", "นักท่องเที่ยว"
      ].some(kw => combinedTextForScoring.includes(kw.toLowerCase()));

      const isArrestOrAbnormal = [
        "arrest", "จับกุม", "prostitution", "ค้าประเวณี", "work permit", "permit", "แรงงาน",
        "illegal", "ผิดกฎหมาย", "sexual", "indecency", "naked", "drunk", "เมา"
      ].some(kw => combinedTextForScoring.includes(kw.toLowerCase()));

      if (hasHotKeyword) {
        finalInterestScore = Math.min(5, finalInterestScore + 1);
        console.log(`   🔥 HOT KEYWORD BOOST: ${finalInterestScore - 1} → ${finalInterestScore}`);
      }

      // 🌍 NATIONALITY KEYWORD BOOST (+1 up to 5)
      const nationalityKeywords = [
        "ฝรั่ง", "ชาวรัสเซีย", "ชาวจีน", "ชาวอินเดีย", "ชาวออสเตรเลีย",
        "ชาวอังกฤษ", "ชาวอเมริกัน", "ชาวเกาหลี", "ชาวยูเครน", "ชาวอิสราเอล",
        "ชาวคาซัคสถาน", "ต่างชาติ", "นักท่องเที่ยว"
      ];

      const hasNationalityKeyword = nationalityKeywords.some(kw =>
        combinedTextForScoring.includes(kw.toLowerCase())
      );

      if (hasNationalityKeyword) {
        const oldScore = finalInterestScore;
        finalInterestScore = Math.min(5, finalInterestScore + 1);
        if (oldScore !== finalInterestScore) {
          console.log(`   🌍 NATIONALITY KEYWORD BOOST: ${oldScore} → ${finalInterestScore} (foreigner/nationality detected)`);
        }
      }

      // If it's a foreigner story involving arrest or abnormal behavior, ensure at least score 4
      if (isForeignerStory && isArrestOrAbnormal && finalInterestScore < 4) {
        console.log(`   🌍 FOREIGNER INCIDENT MINIMUM: ${finalInterestScore} → 4 (foreigner + arrest/abnormal detected)`);
        finalInterestScore = 4;
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

      if ((category === "Politics" || hasPoliticsKeyword) && finalInterestScore > 3 && !isForeignerStory) {
        const reason = category === "Politics" ? "politics category" : `politics keyword detected`;
        console.log(`   🏛️  POLITICS CAP: ${finalInterestScore} → 3 (${reason})`);
        finalInterestScore = 3;
      }

      // CAP BUSINESS/REAL ESTATE DEVELOPMENT NEWS AT SCORE 3
      // Editorial decision: Property launches, hotel/villa developments, investment announcements
      // are business news, NOT breaking news. Cap at 3 to prevent auto-posting.
      // EXCEPTION: Foreigner-related arrests or work violations should NOT be capped.
      const REAL_ESTATE_CAP_KEYWORDS = [
        "villa", "วิลล่า", "luxury villa", "luxury development", "property development",
        "real estate", "อสังหาริมทรัพย์", "hotel development", "resort development",
        "billion baht", "พันล้าน", "property launch", "residential development",
        "luxury market", "premier destination", "high-end villas", "TITLE", "Boat Pattana",
        "Koh Kaew", // Common luxury development area
      ];

      const hasRealEstateKeyword = REAL_ESTATE_CAP_KEYWORDS.some(keyword =>
        combinedTextForScoring.includes(keyword.toLowerCase())
      );

      if ((category === "Business" || hasRealEstateKeyword) && finalInterestScore > 3 && !isArrestOrAbnormal) {
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
        combinedTextForScoring.includes(keyword.toLowerCase())
      );

      if (hasFoundationGovernanceKeyword && finalInterestScore > 2 && !isForeignerStory) {
        console.log(`   🏛️  FOUNDATION/ORG/COMPANY BOARD CAP: ${finalInterestScore} → 2 (organizational governance keyword detected)`);
        finalInterestScore = 2;
      }

      // CAP LOST PET / MISSING ANIMAL STORIES AT SCORE 2
      // Editorial decision: Missing cats, lost dogs, etc. are community notice-board posts,
      // NOT high-interest breaking news. They don't belong on the front page with crime/accidents.
      const hasLostPetKeyword = LOST_PET_CAP_KEYWORDS.some(keyword =>
        combinedTextForScoring.includes(keyword.toLowerCase())
      );

      if (hasLostPetKeyword && finalInterestScore > 2 && !isForeignerStory) {
        console.log(`   🐱 LOST PET CAP: ${finalInterestScore} → 2 (missing/lost pet story detected)`);
        finalInterestScore = 2;
      }

      // CAP LOCAL ENTERTAINMENT / CONCERT STORIES AT SCORE 2
      // Editorial decision: Small concerts with unknown/local-only acts are routine entertainment,
      // NOT high-interest news for the expat readership. Only major international acts/festivals should score higher.
      const hasLocalEntertainmentKeyword = LOCAL_ENTERTAINMENT_CAP_KEYWORDS.some(keyword =>
        title.toLowerCase().includes(keyword.toLowerCase()) ||
        content.toLowerCase().includes(keyword.toLowerCase()) ||
        (result.translatedTitle && result.translatedTitle.toLowerCase().includes(keyword.toLowerCase())) ||
        (result.translatedContent && result.translatedContent.toLowerCase().includes(keyword.toLowerCase()))
      );

      // Only cap if it's NOT a major event (check for major festival/international act indicators)
      const MAJOR_EVENT_EXCEPTIONS = [
        "EDC", "Electric Daisy", "Wonderfruit", "S2O", "Full Moon Party",
        "international music", "international festival", "international tour",
        "world tour", "Grammy", "sold out", "music festival",
        "international concert", "arena tour",
      ];
      const isMajorEvent = MAJOR_EVENT_EXCEPTIONS.some(keyword =>
        combinedTextForScoring.includes(keyword.toLowerCase())
      );

      if (hasLocalEntertainmentKeyword && !isMajorEvent && finalInterestScore > 2 && !isArrestOrAbnormal) {
        console.log(`   🎵 LOCAL ENTERTAINMENT CAP: ${finalInterestScore} → 2 (small concert/local entertainment detected)`);
        finalInterestScore = 2;
      }

      // CAP PAGEANT / COMPETITION / CONTEST STORIES AT SCORE 3
      // Editorial decision: Beauty pageants, costume competitions, community contests
      // are local entertainment/community events, NOT high-interest breaking news.
      // Even "international" competitions held locally are community events.
      const hasPageantCompetitionKeyword = PAGEANT_COMPETITION_CAP_KEYWORDS.some(keyword =>
        combinedTextForScoring.includes(keyword.toLowerCase())
      );

      if (hasPageantCompetitionKeyword && finalInterestScore > 3 && !isArrestOrAbnormal) {
        console.log(`   🏆 PAGEANT/COMPETITION CAP: ${finalInterestScore} → 3 (beauty pageant/contest/competition detected)`);
        finalInterestScore = 3;
      }

      // APPLY VIDEO BOOST BEFORE PREMIUM ENRICHMENT
      // If it's a video and not capped by a "boring" category, boost to 4 so it gets premium enrichment
      const canBoost = !(category === "Politics" || hasPoliticsKeyword || category === "Business" || hasRealEstateKeyword || hasFoundationGovernanceKeyword || hasLostPetKeyword || hasLocalEntertainmentKeyword || hasPageantCompetitionKeyword);
      if (assets?.isVideo && canBoost && finalInterestScore < 4) {
        console.log(`   🎥 VIDEO BOOST: ${finalInterestScore} → 4 (video stories get premium enrichment)`);
        finalInterestScore = 4;
      }

      // CORPORATE / CEREMONIAL / CSR CAP (Maximum Score: 3)
      // Editorial decision: Corporate merit-making ceremonies, company anniversaries,
      // and CSR events are capped at 3 unless they also involve an actual emergency.
      const CORPORATE_CEREMONIAL_CAP_KEYWORDS = [
        "ceremony", "ceremonies",
        "anniversary", "anniversaries", "celebrates", "marks", "years of",
        "merit-making", "merit making", "alms-giving", "alms giving", "alms offering",
        "csr", "corporate social responsibility",
        "charity handover", "scholarship handover", "donation ceremony", "donation drive",
        "opening ceremony", "ribbon cutting", "ribbon-cutting",
        "groundbreaking ceremony", "groundbreaking",
        "gala dinner", "awards ceremony", "awards night",
        "mou signing", "memorandum of understanding",
        "company milestone", "corporate milestone",
        "inaugurated", "inauguration",
        "พิธี", "ทำบุญ", "ครบรอบ", "ตักบาตร", "มอบทุน", "เปิดงาน",
        "กิจกรรมเพื่อสังคม", "บริจาค", "วางศิลาฤกษ์", "มอบรางวัล", "ฉลอง",
        "งานเลี้ยง", "เปิดตัว"
      ];

      const hasCorporateCeremonialKeyword = CORPORATE_CEREMONIAL_CAP_KEYWORDS.some(keyword =>
        combinedTextForScoring.includes(keyword.toLowerCase())
      );

      // Exception: hot keywords or nationality keywords allow it to bypass the cap
      if (hasCorporateCeremonialKeyword && finalInterestScore > 3 && !hasHotKeyword && !hasNationalityKeyword) {
        console.log(`   👔 CORPORATE/CEREMONIAL CAP: ${finalInterestScore} → 3 (corporate/ceremonial event detected)`);
        finalInterestScore = 3;
      }

      // Ensure score stays within 1-5 range
      finalInterestScore = Math.max(1, Math.min(5, finalInterestScore));

      console.log(`   📊 Final Interest Score: ${finalInterestScore}/5`);

      // STEP 6: PREMIUM ENRICHMENT for high-priority stories (score 4-5)
      let enrichedTitle = result.translatedTitle || title;
      let enrichedContent = result.translatedContent || content;
      let enrichedExcerpt = result.excerpt || "";

      if (finalInterestScore >= 4) {
        // Fetch comments if they weren't fetched before translation (because of missing keywords)
        if ((!communityComments || communityComments.length === 0) && sourceUrl) {
          console.log(`   ⭐ High interest score (${finalInterestScore}) achieved without initial hot keywords - fetching comments now...`);
          try {
            const { scrapePostComments } = await import('./scraper');
            const comments = await scrapePostComments(sourceUrl, 15);
            if (comments.length > 0) {
              communityComments = comments
                .filter((c: any) => c.text && c.text.length > 10)
                .map((c: any) => c.text);
              console.log(`   ✅ Got ${communityComments.length} substantive comments for premium enrichment context`);
            }
          } catch (commentError) {
            console.log(`   ⚠️ Comment fetch failed (non-critical): ${commentError}`);
          }
        }

        const enrichmentModel = "gpt-4o"; // Used only on OpenAI path
        const activeProvider = process.env.ENRICHMENT_PROVIDER || 'openai';
        const activeModelLabel = activeProvider === 'anthropic'
          ? `Anthropic ${process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5'}`
          : 'OpenAI GPT-4o';
        console.log(`   ✨ HIGH-PRIORITY STORY (score ${finalInterestScore}) - Applying premium enrichment via ${activeModelLabel}...`);

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
        translatedTitle: enforceSoiNamingConvention(enrichedTitle),
        translatedContent: enforceSoiNamingConvention(enrichedContent),
        excerpt: enforceSoiNamingConvention(enrichedExcerpt),
        category: category, // Use validated category (defaults to "Local" if invalid)
        isActualNews: result.isActualNews || false,
        interestScore: finalInterestScore,
        isDeveloping: result.isDeveloping || false,
        needsReview: result.needsReview || false,
        reviewReason: result.reviewReason,
        isPolitics: category === "Politics" || hasPoliticsKeyword,
        // Block auto-boosting for categories editorial team finds "boring" even as videos
        autoBoostScore: !(category === "Politics" || hasPoliticsKeyword || category === "Business" || hasRealEstateKeyword || hasFoundationGovernanceKeyword),
        embedding,
        facebookHeadline: enforceSoiNamingConvention(facebookHeadline),
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

  /**
   * Re-enrich an existing article with new factual details from English-language sources
   */
  async reEnrichWithSources(
    existingTitle: string,
    existingContent: string,
    existingExcerpt: string,
    category: string,
    publishedAt: Date,
    additionalSources: { name: string; publishedDate: string; extractedText: string }[],
    model: "claude-sonnet-4-5" | "claude-3-opus-20240229" = "claude-sonnet-4-5"
  ): Promise<ReEnrichmentResult> {
    if (additionalSources.length === 0) {
      return {
        enrichedTitle: existingTitle,
        enrichedContent: existingContent,
        enrichedExcerpt: existingExcerpt,
        hasNewInformation: false,
        newFactsSummary: "No additional sources provided."
      };
    }

    const systemPrompt = `You are updating an existing Phuket Radar article with new information from additional reporting by other outlets. You are a veteran correspondent who has lived in Phuket for over a decade, writing for an audience of long-term expats and residents.

Your job is to MERGE new factual details into the existing article while:
1. Preserving the original article's voice, structure, and format
2. Adding ONLY confirmed new facts — not rewriting what already exists
3. Never copying phrasing from the source articles — extract facts, rewrite in your own words
4. Maintaining all existing sections (Dateline, Lede, Details, Background, On the Ground)

You produce JSON output only.`;

    const currentDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
    const updateTime = new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Bangkok", hour: '2-digit', minute: '2-digit' });

    let userPrompt = `📅 CURRENT DATE: ${currentDate} (Thailand Time)
ARTICLE CATEGORY: ${category}

---

YOUR EXISTING PUBLISHED ARTICLE:

Title: ${existingTitle}

Content:
${existingContent}

Published at: ${publishedAt.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })}

---

ADDITIONAL REPORTING FROM OTHER OUTLETS:

${additionalSources.map(source => `SOURCE: ${source.name}
PUBLISHED: ${source.publishedDate}
CONTENT:
${source.extractedText}
`).join('\n---\n')}

---

RE-ENRICHMENT INSTRUCTIONS:

Compare the additional reporting against your existing article. Look for:

1. **New confirmed facts** not in your original:
   - Names of people involved (victims, suspects, officials)
   - Specific injuries or damage details
   - Official statements from police or authorities
   - Timeline details (exact times, sequence of events)
   - Arrest details, charges filed
   - Hospital information (where victims were taken)
   - Vehicle details (make, registration, color)
   - Number of people involved
   - Cause determined by officials

2. **Corrections** to your original:
   - If additional sources contradict your original reporting on a factual point, update to the authoritative version
   - If location details are more specific in additional sources, update

3. **Follow-up developments**:
   - Arrests made after the initial incident
   - Suspect identified or turned themselves in
   - Road reopened / situation resolved
   - Official investigation status

DO NOT:
- Copy or closely paraphrase any sentences from the source articles
- Add speculative information or editorial commentary from other outlets
- Remove or weaken any facts from your original article
- Change the tone or voice of the article
- Add generic context or filler — only add genuinely new information
- Attribute information to the other outlets by name (don't write "According to The Thaiger..." — instead use "Police confirmed..." or "Authorities later reported..." or simply state the fact)
- 🚨 PATONG/BANGLA ROAD HALLUCINATION WARNING: If the source says "Patong", do NOT assume it happened on "Bangla Road". Patong has many other piers, docks, shops, and beaches. Only name Bangla Road if the source EXPLICITLY mentions it.

STRUCTURE OF YOUR UPDATE:
- STRIP OUT any existing Developing Story indicator (<p class="developing-story">...</p>) if it exists in the original content. Do not include it in the updated article.
- Keep the existing Dateline
- Update the Lede if significant new facts change the summary
- Add new details in the Details section (integrate naturally, don't just append at the end)
- Update the Background section if new context is available
- Update the On the Ground section if there are practical developments (road reopened, suspect caught, etc.)
- Add an "Updated" note: include exactly <p class="updated-note"><em>Updated at ${updateTime} with additional details from official sources.</em></p> as the very first element right after the dateline

MINIMUM CHANGE THRESHOLD:
If the additional sources contain NO new factual information beyond what your article already covers, set "hasNewInformation" to false.

OUTPUT FORMAT — Return ONLY valid JSON, no markdown fences:

{
  "enrichedTitle": "Updated headline if significant new facts warrant it, otherwise the existing headline unchanged",
  "enrichedContent": "Full updated HTML article with new facts integrated and 'Updated at' note",
  "enrichedExcerpt": "Updated 2-3 sentence summary if new facts change the story significantly, otherwise existing excerpt",
  "hasNewInformation": true/false,
  "newFactsSummary": "Brief 1-2 sentence description of what new facts were added, for your internal logging"
}`;

    const enrichmentProvider = process.env.ENRICHMENT_PROVIDER || 'openai';

    try {
      let responseText = '';

      if (enrichmentProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
        const activeModel = process.env.ANTHROPIC_MODEL || model;
        console.log(`🔄 Calling Claude (${activeModel}) for re-enrichment with ${additionalSources.length} sources...`);
        const response = await anthropic.messages.create({
          model: activeModel,
          max_tokens: 2500,
          temperature: 0.2,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });
        responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      } else {
        const openaiModel = "gpt-4o";
        console.log(`🔄 Calling OpenAI (${openaiModel}) for re-enrichment with ${additionalSources.length} sources...`);
        const response = await openai.chat.completions.create({
          model: openaiModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        });
        responseText = response.choices[0].message.content || '';
      }

      try {
        // Strip markdown backticks if AI included them (OpenAI with json_object usually doesn't wrap, but safe to keep)
        let jsonStr = responseText.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);

        jsonStr = jsonStr.trim();

        const result = JSON.parse(jsonStr) as ReEnrichmentResult;

        // Ensure proper paragraph formatting for returned HTML
        if (result.hasNewInformation && result.enrichedContent) {
          result.enrichedContent = ensureProperParagraphFormatting(result.enrichedContent);
        }

        return result;
      } catch (parseError) {
        console.error("❌ Failed to parse JSON from AI re-enrichment:\n", responseText);
        return {
          enrichedTitle: existingTitle,
          enrichedContent: existingContent,
          enrichedExcerpt: existingExcerpt,
          hasNewInformation: false,
          newFactsSummary: "Failed to parse AI response"
        };
      }
    } catch (error) {
      console.error("❌ Error communicating with AI provider for re-enrichment:", error);
      throw error;
    }
  }
}

export const translatorService = new TranslatorService();
