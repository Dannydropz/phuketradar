# Comprehensive Phuket Hot Keywords — Thai & English

## Purpose
These keywords serve two functions in the pipeline:
1. **Comment scraping trigger** — when detected in a scraped story, the scheduler should fetch comments from the source post
2. **Interest score boosting** — stories containing these terms are more likely to engage the expat audience and should be scored accordingly

## Implementation
Add these to the `hotKeywords` array in `scheduler.ts`. The Thai terms are what will appear in the original scraped Thai Facebook posts. The English terms are included for stories that may already be partially translated or come from bilingual sources.

Group them by category so you can easily enable/disable categories or adjust scoring weights per category if needed.

---

## CRIME & POLICE

### Thai
- อุบัติเหตุ (accident)
- จับกุม (arrest)
- จับ (catch/arrest)
- ตำรวจ (police)
- สถานีตำรวจ (police station)
- คดี (case/crime)
- โจรกรรม (robbery/theft)
- ลักทรัพย์ (theft)
- ขโมย (steal)
- กระเป๋า (bag — context: bag snatching)
- วิ่งราว (snatch and run)
- ฆาตกรรม (murder)
- ฆ่า (kill)
- แทง (stab)
- ยิง (shoot)
- ปืน (gun)
- มีด (knife)
- ทำร้ายร่างกาย (assault)
- ทำร้าย (harm/assault)
- ต่อย (punch)
- ตบ (slap)
- ทะเลาะ (quarrel/fight)
- ชกต่อย (fistfight)
- ตีกัน (fight each other)
- ยาเสพติด (drugs/narcotics)
- ยาบ้า (methamphetamine)
- ยาไอซ์ (crystal meth)
- โคเคน (cocaine)
- กัญชา (cannabis)
- ค้ายา (drug dealing)
- ฉ้อโกง (fraud)
- หลอกลวง (scam/deceive)
- โกง (cheat)
- แก๊งคอลเซ็นเตอร์ (call center gang)
- ออนไลน์ (online — context: online scam)
- บุกจับ (raid/bust)
- ตรวจค้น (search/inspect)
- หมายจับ (arrest warrant)
- ประกันตัว (bail)
- ฝากขัง (remand)
- สอบสวน (investigation)
- พยาน (witness)
- CCTV / กล้องวงจรปิด (security camera)
- หนีคดี (flee from charges)
- หลบหนี (escape/flee)
- ผู้ต้องหา (suspect)
- ตรวจจับ (checkpoint/crackdown)
- ด่านตรวจ (checkpoint)
- โอเวอร์สเตย์ (overstay)

### English
- arrest, arrested
- police, officers
- raid, raided
- drugs, cocaine, meth, cannabis, marijuana
- theft, stolen, robbery
- assault, attacked, fight, brawl
- murder, killed, stabbed, shot
- scam, fraud, swindle
- checkpoint, crackdown
- warrant, suspect, investigation
- CCTV, footage, camera
- overstay, immigration

---

## TRAFFIC & ACCIDENTS

### Thai
- อุบัติเหตุ (accident)
- ชน (crash/collide)
- ชนกัน (collision)
- รถชน (vehicle crash)
- เฉี่ยวชน (sideswipe)
- คว่ำ (overturn/flip)
- พลิกคว่ำ (roll over)
- ตก (fall — context: fall from vehicle/road)
- ล้ม (fall over — motorbike)
- เจ็บ (injured)
- บาดเจ็บ (wounded/injured)
- เสียชีวิต (died/deceased)
- ดับ (dead — colloquial)
- ตาย (dead)
- สาหัส (critical/serious injury)
- โคม่า (coma)
- มอเตอร์ไซค์ (motorbike)
- จักรยานยนต์ (motorcycle — formal)
- บิ๊กไบค์ (big bike)
- รถเก๋ง (car/sedan)
- รถกระบะ (pickup truck)
- รถตู้ (van)
- รถบรรทุก (truck)
- รถสิบล้อ (ten-wheel truck)
- รถเครน (crane truck)
- รถแท็กซี่ (taxi)
- ตุ๊กตุ๊ก (tuk-tuk)
- สงขลา (songthaew — shared minibus)
- เมาแล้วขับ (drunk driving)
- แอลกอฮอล์ (alcohol)
- เป่าแอลกอฮอล์ (breathalyzer test)
- ใบขับขี่ (driver's license)
- ใบขับขี่สากล (international driving permit)
- ไม่มีใบขับขี่ (no license)
- หมวกกันน็อค (helmet)
- ไม่สวมหมวก (no helmet)
- เขาป่าตอง (Patong Hill)
- ทางโค้ง (curve/bend)
- ลื่น (slippery)
- ฝนตก (rain)
- ถนนเปียก (wet road)
- รถติด (traffic jam)
- จราจร (traffic)
- ปิดถนน (road closed)
- ชิงเลน (cutting lanes/overtaking dangerously)
- ย้อนศร (driving against traffic)
- ฝ่าไฟแดง (running red light)
- หนีที่เกิดเหตุ (hit and run / flee scene)
- ชนแล้วหนี (hit and run)

### English
- accident, crash, collision
- injured, killed, dead, fatal, critical
- motorbike, motorcycle, scooter
- hit and run, fled the scene
- drunk driving, alcohol, breathalyzer
- no helmet, no license
- Patong Hill, curve, slippery
- road closed, traffic jam
- overturn, flip, rollover

---

## NIGHTLIFE & ENTERTAINMENT

### Thai
- บาร์ (bar)
- ผับ (pub)
- คลับ (club)
- สถานบันเทิง (entertainment venue)
- ดิสโก้เธค (discotheque)
- บังลา (Bangla — as in Bangla Road)
- ปิดร้าน (close venue)
- เปิดเกินเวลา (open beyond hours)
- ใบอนุญาต (license/permit)
- ไม่มีใบอนุญาต (no license)
- บุกตรวจ (raid/inspect)
- เสียงดัง (loud noise)
- ร้องเรียน (complaint)
- เมา (drunk)
- เมาหัวราน้ำ (very drunk)
- ทะเลาะวิวาท (altercation/brawl)
- ทะเลาะ (argue/fight)
- แสงสีเสียง (lights and sounds — nightlife context)
- โชว์ (show)
- สาวประเภทสอง (ladyboy/trans woman)
- ปิงปองโชว์ (ping pong show)
- ยาเสพติด (drugs)
- สปา (spa — sometimes euphemism)
- นวด (massage)

### English
- bar, pub, club, nightclub, venue
- Bangla, Bangla Road
- raid, raided, shut down, closed
- license, unlicensed, permit
- noise complaint
- drunk, intoxicated, brawl, fight
- closing time, after hours

---

## TOURISM & FOREIGNERS

### Thai
- นักท่องเที่ยว (tourist)
- ฝรั่ง (foreigner — Western)
- ต่างชาติ (foreign national)
- ชาวรัสเซีย (Russian national)
- ชาวจีน (Chinese national)
- ชาวอินเดีย (Indian national)
- ชาวออสเตรเลีย (Australian national)
- ชาวอังกฤษ (British national)
- ชาวอเมริกัน (American national)
- ชาวเกาหลี (Korean national)
- ชาวยูเครน (Ukrainian national)
- ชาวอิสราเอล (Israeli national)
- ชาวคาซัคสถาน (Kazakh national)
- นักท่องเที่ยวคุณภาพ (quality tourist — usually sarcasm)
- วีซ่า (visa)
- เกินกำหนด (overstay)
- ตม. / ตรวจคนเข้าเมือง (immigration)
- สนามบิน (airport)
- เที่ยวบิน (flight)
- โรงแรม (hotel)
- รีสอร์ท (resort)
- เช่ารถ (car rental)
- เช่ามอเตอร์ไซค์ (motorbike rental)
- เจ็ทสกี (jet ski)
- หาดป่าตอง (Patong Beach)
- หาดกะรน (Karon Beach)
- หาดกะตะ (Kata Beach)
- หาดสุรินทร์ (Surin Beach)
- หาดบางเทา (Bang Tao Beach)
- หาดไนหาน (Nai Harn Beach)
- หาดกมลา (Kamala Beach)
- ราไวย์ (Rawai)
- ถลาง (Thalang)
- กะทู้ (Kathu)
- เมืองเก่า (Old Town)

### English
- tourist, foreigner, expat
- Russian, Chinese, Indian, Australian, British, American, Korean, Ukrainian, Israeli
- visa, overstay, immigration
- airport, flight
- hotel, resort
- jet ski, rental, scam
- Patong, Karon, Kata, Surin, Kamala, Rawai, Thalang, Kathu

---

## WEATHER & ENVIRONMENT

### Thai
- พายุ (storm)
- ฝนตกหนัก (heavy rain)
- น้ำท่วม (flood/flooding)
- น้ำป่า (flash flood)
- น้ำรอระบาย (waterlogging)
- ดินถล่ม (landslide)
- ลมแรง (strong wind)
- คลื่นสูง (high waves)
- คลื่นลมแรง (rough seas)
- กระแสน้ำ (current — rip current)
- ธงแดง (red flag — beach warning)
- จมน้ำ (drown/drowning)
- สูญหาย (missing/lost at sea)
- กู้ภัย (rescue)
- ช่วยเหลือ (assist/help)
- อุทกภัย (flood disaster)
- ไฟป่า (forest/wildfire)
- ไฟไหม้ (fire)
- เพลิงไหม้ (fire/blaze)
- แผ่นดินไหว (earthquake)
- สึนามิ (tsunami)
- ปิดอ่าว (bay closure)
- ปิดเกาะ (island closure)
- เรือล่ม (boat capsized)
- ห้ามลงเล่นน้ำ (no swimming)
- มลพิษ (pollution)
- ฝุ่น PM2.5 (PM2.5 dust)
- คราบน้ำมัน (oil spill)
- ขยะ (garbage/waste)
- ปะการัง (coral)

### English
- storm, rain, flooding, flood
- landslide, strong wind
- waves, rough seas, rip current
- red flag, drowning, missing
- rescue, capsized
- fire, blaze
- pollution, PM2.5, oil spill
- beach closed, island closed

---

## ANIMALS & WILDLIFE

### Thai
- สุนัข (dog)
- หมาจรจัด (stray dog)
- หมากัด (dog bite)
- พิษสุนัขบ้า (rabies)
- งู (snake)
- จงอาง (king cobra)
- งูเห่า (cobra)
- งูเหลือม (python)
- ลิง (monkey)
- ช้าง (elephant)
- ฉลาม (shark)
- แมงกะพรุน (jellyfish)
- แมงกะพรุนกล่อง (box jellyfish)
- วาฬ (whale)
- โลมา (dolphin)
- เต่า (turtle)
- ตะกวด (monitor lizard)

### English
- dog, stray dog, dog bite, rabies
- snake, cobra, python
- monkey, monkeys
- jellyfish, box jellyfish
- shark, whale, dolphin, turtle

---

## HEALTH & HOSPITALS

### Thai
- โรงพยาบาล (hospital)
- วชิระภูเก็ต (Vachira Phuket — government hospital)
- กรุงเทพภูเก็ต (Bangkok Hospital Phuket)
- ห้องฉุกเฉิน (emergency room)
- รถพยาบาล (ambulance)
- กู้ชีพ (paramedic/rescue)
- มูลนิธิ (foundation — often rescue foundations)
- กุศลธรรม (Kusoldharm Foundation — Phuket rescue)
- เจ็บป่วย (sick/ill)
- ไข้เลือดออก (dengue fever)
- อาหารเป็นพิษ (food poisoning)
- ตกจากที่สูง (fall from height)
- กระโดด (jump)
- พลัดตก (fell/accidental fall)
- เสียชีวิต (deceased)

### English
- hospital, emergency, ambulance
- Vachira, Bangkok Hospital
- rescue, paramedic, foundation
- dengue, food poisoning
- fell, jumped, fall from height

---

## LOCAL GOVERNMENT & COMMUNITY

### Thai
- ผู้ว่าราชการ (governor)
- นายก อบจ. (president of PAO — Provincial Administrative Organization)
- เทศบาล (municipality)
- อบต. (subdistrict admin org)
- ป่าตอง (Patong municipality)
- กะทู้ (Kathu district)
- ถลาง (Thalang district)
- เมืองภูเก็ต (Mueang Phuket district)
- ประชาพิจารณ์ (public hearing)
- ร้องเรียน (complaint/petition)
- คอรัปชัน (corruption)
- ทุจริต (corruption/fraud)
- บุกรุก (encroachment/trespass)
- ที่ดิน (land)
- ก่อสร้าง (construction)
- รื้อถอน (demolition)
- ผิดกฎหมาย (illegal)
- ใบอนุญาตก่อสร้าง (building permit)

### English
- governor, mayor, municipality
- construction, demolition, permit
- illegal, encroachment, land
- corruption, complaint, protest

---

## TRANSPORT & INFRASTRUCTURE

### Thai
- สนามบินภูเก็ต (Phuket Airport)
- เที่ยวบิน (flight)
- ล่าช้า (delayed)
- ยกเลิก (cancelled)
- ท่าเรือ (pier/port)
- เรือ (boat)
- สปีดโบ๊ท (speedboat)
- เฟอร์รี่ (ferry)
- รถเมล์ (bus)
- สมาร์ทบัส (smart bus)
- แกร็บ (Grab)
- โบลท์ (Bolt)
- ค่าโดยสาร (fare)
- โก่งราคา (overcharging)
- ปฏิเสธผู้โดยสาร (refuse passenger)
- มิเตอร์ (meter)
- ไม่กดมิเตอร์ (not using meter)
- รถไฟฟ้า (electric train/light rail — future projects)

### English
- airport, flight, delayed, cancelled
- pier, ferry, speedboat
- taxi, tuk-tuk, Grab, Bolt
- overcharging, meter, fare
- bus, smart bus

---

## Notes for Implementation

1. **Store these in a structured format** (JSON or a database table) rather than a flat array, so you can:
   - Enable/disable categories
   - Weight categories differently for scoring
   - Query by category for the context block selection

2. **Thai text matching**: These should be matched as substrings within the scraped text, not exact matches. Thai text doesn't use spaces between words consistently, so a term like อุบัติเหตุ might appear within a longer string.

3. **Comment scraping threshold**: Consider scraping comments for ANY story that contains 2+ keywords from the high-engagement categories (Crime, Traffic, Nightlife, Animals), not just stories that match a single "hot" keyword. Multiple keyword matches suggest a more complex/interesting story.

4. **Nationality keywords** are particularly valuable — stories involving foreigners consistently get the highest engagement from your expat audience. Consider giving these a scoring boost.

5. **Update regularly**: New slang, venue names, and location terms emerge constantly. Review and expand this list monthly.
