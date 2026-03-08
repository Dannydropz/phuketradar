# Phuket Context Library — Structured Knowledge Base

## Purpose
This is the expanded knowledge base that feeds into the enrichment prompt's category context blocks. Unlike the current static blocks in the prompt, this is designed as a **living reference document** that should be:
1. Stored as structured data (JSON or database table)
2. Updated regularly as things change
3. Queried selectively — only inject relevant entries into any given enrichment call

## How to Use This
The enrichment prompt already has category-conditional context blocks. This document provides the raw knowledge to populate and expand those blocks. Two implementation approaches:

**Simple (recommended for now):** Manually update the static context blocks in the prompt every month using this document as the source of truth.

**Advanced (future):** Store this as structured JSON, tag each entry by category and sub-topic, and dynamically select the most relevant entries for each story based on keywords in the source text. This keeps individual enrichment calls lean while having a much deeper knowledge base to draw from.

---

## POLICE & JURISDICTION

### Police Stations
| Station | Jurisdiction | Notable Coverage |
|---------|-------------|------------------|
| Phuket City (Mueang) | Phuket Town, Rassada, Koh Kaew, Wichit (partial) | Town center incidents, port area |
| Chalong | Chalong, Rawai, Nai Harn, southern beaches | Southern tourist areas, Big Buddha access road |
| Patong | Patong, parts of Kathu | Bangla Road, most tourist nightlife incidents |
| Kathu (Tung Tong) | Kathu, Patong Hill road | Patong Hill accidents, Kathu waterfall area |
| Thalang | Thalang, airport area, Nai Yang, Mai Khao | Airport incidents, northern beaches |
| Cherng Talay | Cherng Talay, Bang Tao, Surin, Layan | Luxury villa area, beach clubs |
| Kamala | Kamala, parts of Kathu | Kamala beach area, Fantasea vicinity |
| Wichit | Wichit subdistrict | Central Phuket commercial area |

### Key Contacts
- Tourist Police: 1155 (English-speaking operators)
- Police Emergency: 191
- Ambulance / Emergency Medical: 1669
- Fire: 199
- Kusoldharm Rescue Foundation: 076-246 301 (primary rescue responders for accidents — often arrive before ambulances)
- Phuket Marine Police: 076-211 883

### Legal Context for Foreigners
- Foreigners arrested have the right to contact their embassy/consulate
- Most Western countries have honorary consuls in Phuket (not full embassies — those are in Bangkok)
- Bail for foreigners is often set higher than for Thai nationals; passport seizure is standard for serious charges
- Drug offenses: possession of Category 1 substances (meth, heroin, MDMA) can carry 1-10 years; trafficking can carry life imprisonment or formerly death (commuted)
- Assault charges can be settled with compensation agreements (common practice), but serious cases proceed to court
- Thai defamation law (Section 326-333 of Criminal Code) is criminal, not just civil — posting negative reviews or social media complaints about businesses can result in criminal charges

---

## HOSPITALS & MEDICAL

### Major Hospitals
| Hospital | Type | Location | Notes |
|----------|------|----------|-------|
| Vachira Phuket Hospital | Government | Phuket Town (Yaowarat Rd) | Main trauma center, largest ER on island, cheapest option |
| Bangkok Hospital Phuket | Private | Bypass Road (near Siriroj junction) | Best-equipped private hospital, expensive, English-speaking staff |
| Mission Hospital Phuket | Private | Thepkrasattri Rd, near Tesco Thalang | Mid-range private option in central/north |
| Dibuk Hospital | Private | Phuket Town | Smaller private hospital |
| Patong Hospital | Government | Patong | Handles Patong-area emergencies, limited capacity |
| Thalang Hospital | Government | Thalang | Handles northern area, limited capacity |
| Siriroj Hospital | Private | Phuket Town | Near Central Phuket |

### Medical Context
- Government hospitals are significantly cheaper but can have long waits for non-emergency care
- Bangkok Hospital Phuket is the go-to for serious trauma requiring advanced surgical capability
- Kusoldharm Foundation and related rescue foundations operate the primary first-responder network — they often arrive at accident scenes before official ambulances
- Medical evacuation to Bangkok (Bumrungrad, BNH) happens for cases requiring specialist care not available on-island
- Travel insurance is critical — a night in ICU at Bangkok Hospital Phuket can exceed 100,000 THB
- Dental tourism is significant — multiple dental clinics cater specifically to medical tourists

---

## ROADS & TRAFFIC

### Known Accident Blackspots
| Location | Issue | Notes |
|----------|-------|-------|
| Patong Hill (Route 4029) | Steep grades, blind curves | Fatal accidents multiple times per year, especially motorbikes. The stretch between Kathu junction and Patong viewpoint is worst |
| Heroines Monument intersection | Complex multi-road junction | High-speed collisions, especially during rush hour |
| Thepkrasattri Road (Route 402) | High-speed main artery | Phuket's deadliest road by volume — runs airport to town |
| Chalong Circle | Roundabout confusion | Tourists unfamiliar with roundabout priority rules |
| Darasamut Intersection | High traffic volume | Near Central Phuket, multiple lanes merging |
| Sam Kong intersection | Congestion + speed | Junction of major roads near Tesco Lotus |
| Si Ko intersection | Main artery crossing | On Thepkrasattri Road, known congestion point |
| Kata Hill | Steep descent | Similar issues to Patong Hill but less traffic |
| Bypass Road curves | Speed + curves | Late-night accidents common |
| Airport approach road | High speed, poor lighting in sections | Accidents involving airport-bound traffic |

### Driving Context
- Thailand drives on the LEFT
- International Driving Permit (IDP) legally required for foreigners; Thai driving license also accepted
- Most motorbike and car rental operators do not check for IDP — but police checkpoints do
- Helmet law: mandatory for driver AND passenger on motorbikes; 500 THB fine
- Drink driving limit: 0.05% BAC (50mg per 100ml blood)
- In practice, police checkpoints focus on: license, helmet, alcohol, and vehicle registration
- Common checkpoint locations: bottom of Patong Hill, Heroines Monument area, Thepkrasattri Road near airport, Chalong Circle approaches
- Rainy season (May-Oct) dramatically increases accident rates due to slippery roads, reduced visibility
- Road quality varies significantly — potholes, uneven surfaces, and missing drain covers are common hazards
- "Bigger vehicle at fault" is a common perception but not technically law — however, insurance adjusters and police often default to this

---

## BEACHES & MARINE

### Beach Safety
| Beach | Season Risk | Notes |
|-------|-------------|-------|
| Patong | Year-round undertow during monsoon | Lifeguards present in high season |
| Karon | Dangerous rip currents May-Oct | Multiple drownings annually |
| Kata | Moderate risk monsoon season | Some lifeguard coverage |
| Kata Noi | High risk monsoon season | Steep beach, strong waves |
| Surin | Very dangerous May-Oct | Steep drop-off, strong currents |
| Kamala | Moderate risk | |
| Nai Harn | Variable — strong currents during monsoon | Popular with locals |
| Bang Tao | Generally calmer | Long beach, less steep |
| Nai Yang | Generally calmer | Near airport, less developed |
| Freedom Beach | Access difficult, no lifeguards | |

### Flag System
- Red flag: No swimming — dangerous conditions
- Yellow flag: Caution — swim with care
- Green flag: Safe to swim
- Flag compliance is inconsistent; not all beaches have flags posted

### Marine Context
- Boat accidents occur primarily during monsoon season when seas are rough
- Speedboat safety standards vary dramatically between operators
- Phuket Marine Office can suspend boat operations in severe weather
- Chalong Pier and Rassada Pier are the main departure points for island day trips
- Similan Islands and Surin Islands close annually from approximately May 1 to October 15

---

## NIGHTLIFE

### Bangla Road
- Located in Patong, pedestrianized nightly from approximately 6 PM
- Phuket's primary nightlife strip — bars, clubs, go-go bars, restaurants
- Legal closing time varies: standard venues 2 AM, extended-license venues 3-4 AM
- Police presence is regular; periodic raids check for licensing, drugs, underage patrons
- Drink spiking incidents reported periodically — Tourist Police advise not leaving drinks unattended
- Common scams: inflated bills, "lady drink" price surprises, bar fine disputes

### Other Nightlife Areas
- Phuket Town: Soi Romanee area — craft cocktail bars, more upscale
- Kata/Karon: Smaller bar scenes, less intense than Bangla
- Rawai/Nai Harn: Local expat bar scene, less tourist-oriented
- Beach clubs: Catch Beach Club (Bang Tao), Cafe Del Mar (Kamala), HQ Beach Lounge (Kamala) — upscale, different crowd

### Licensing & Raids
- Entertainment venues require a license from the provincial authority
- Unlicensed venues are subject to raids and immediate closure
- Raids typically check: license validity, closing time compliance, underage staff/patrons, drug use on premises, presence of overstay foreigners
- Noise complaints from residential areas have increased as nightlife zones expand
- Legal alcohol sales hours: 11:00-14:00 and 17:00-00:00 (but widely unenforced at licensed venues)
- No alcohol sales on Buddhist holidays and election days (nationwide)

---

## IMMIGRATION & VISA

### Current Rules (verify — these change frequently)
- Visa-exempt entry: 60 days for most Western nationalities (extended from 30 days as of 2024 policy)
- 30-day extension available at Phuket Immigration Office for 1,900 THB
- Phuket Immigration Office: located in Phuket Town on Phuket Road
- 90-day reporting required for long-stay visa holders
- TM30 reporting: landlords/hotels must report foreign guests within 24 hours (enforcement varies)
- Overstay penalties: 500 THB per day up to 20,000 THB, plus potential ban on re-entry
- Serious overstay (months/years) can result in detention and deportation with multi-year re-entry ban

### Common Immigration Issues in News
- Overstay arrests (often during police checkpoint stops)
- Foreigners working without work permits (teaching, diving, real estate)
- Visa run services and border bounce operations
- Immigration raids on businesses employing illegal foreign workers
- Retirement visa (O-A) requirement changes and insurance mandates

---

## COMMON SCAMS & DISPUTES

### Jet Ski Scam
- Operators claim pre-existing damage was caused by the renter
- Demand large cash payments (10,000-50,000+ THB)
- Most common at Patong Beach
- Tourist Police are aware and can mediate, but the practice persists

### Tuk-Tuk Overcharging
- No meters; prices negotiated before travel
- Quotes to tourists often 3-5x what a local would pay
- Tuk-tuk "mafia" controls territory — drivers have agreed-upon minimum fares in tourist areas
- Common complaint: 200-500 THB for journeys that should cost 50-100 THB
- Alternative: Bolt app (limited coverage), InDriver, or private taxi services

### Rental Disputes
- Motorbike rental: operators claim damage on return, hold passport as collateral
- Never leave passport as deposit (use a photocopy or separate cash deposit)
- Car rental: some operators use GPS trackers and claim speeding/misuse fees
- Insurance on rentals is often minimal or non-existent

### Real Estate / Property
- Foreigners cannot own land in Thailand
- Condominium ownership: foreigners can own up to 49% of units in a registered condo
- Nominee company structures (using Thai nominees to hold land) are technically illegal but widespread
- Regular news about crackdowns on illegal foreign land ownership

---

## WEATHER PATTERNS

### Seasonal Overview
| Period | Conditions | Notes |
|--------|-----------|-------|
| Nov-Feb | Cool/dry season | Best weather, peak tourist season, calm seas |
| Mar-Apr | Hot season | Highest temperatures (35°C+), increasing humidity |
| May-Oct | Monsoon/rainy season | Heavy rain (especially afternoon/evening), rough west coast seas |

### Weather-Specific Risks
- Flash flooding: common in low-lying areas during monsoon — Patong (Soi Bangla area), Sam Kong, parts of Rassada, Koh Kaew underpass
- West coast beaches dangerous May-October: rip currents, undertows, high surf
- East coast (Chalong, Rawai, Cape Panwa) generally calmer year-round
- Water shortages: peak dry season (March-April) can cause supply issues, particularly in elevated areas
- Haze/air quality: occasionally affected by agricultural burning in mainland Southeast Asia (Feb-Apr)

---

## LOCATION TERMINOLOGY

### Common Confusion Points
- "Bangkok Road" in a Phuket article = a street in Phuket Town, NOT Bangkok city
- "Krabi Road", "Phang Nga Road" = streets in Phuket Town
- "Soi" = side street/alley (always "Soi [Name]", never "[Name] Soi")
- "Moo" = village number within a subdistrict
- "Tambon" = subdistrict
- "Amphoe" / "Amphur" = district (Phuket has 3: Mueang, Kathu, Thalang)

### Key Landmarks (for location reference in stories)
- Heroines Monument: major junction on Thepkrasattri Road, marks the boundary between Thalang and Kathu/Mueang
- Central Phuket (shopping mall): major reference point on bypass road
- Jungceylon / Junceylon: major shopping center in Patong
- Big Buddha: landmark statue on Nakkerd Hill between Chalong and Kata
- Chalong Temple (Wat Chalong): most visited temple on island
- Old Town: historic Sino-Portuguese area of Phuket Town
- Saphan Hin: public park/seafront area in Phuket Town, often used for events
- Robinson Ocean / Central Floresta: shopping malls in Phuket Town

---

## Update Log
| Date | Changes |
|------|---------|
| March 2026 | Initial version created |

Keep this updated monthly. Key things to watch for: immigration rule changes, new road construction, venue openings/closures, seasonal pattern shifts.
