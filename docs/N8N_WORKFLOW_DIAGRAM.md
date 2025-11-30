# N8N Facebook Auto-Poster - Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PHUKET RADAR FACEBOOK AUTO-POSTER                        │
│                              (N8N Workflow)                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                                    START
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │   ⏰ SCHEDULE TRIGGER     │
                        │   (Every 30 minutes)      │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │  📊 FETCH ARTICLES        │
                        │  Query Database:          │
                        │  - Published = true       │
                        │  - Interest >= 4          │
                        │  - Not posted yet         │
                        │  - Has image              │
                        │  - Not manual             │
                        │  LIMIT 5                  │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │  ❓ ANY ARTICLES?         │
                        │  Check if results > 0     │
                        └──────┬──────────────┬─────┘
                               │              │
                          YES  │              │ NO
                               │              │
                               ▼              └──────> END
                   ┌───────────────────────┐
                   │  🔄 LOOP ARTICLES     │
                   │  Process 1 at a time  │
                   └──────────┬────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           │                                      │
           ▼                                      ▼
  ┌─────────────────┐                   ┌────────────────┐
  │ 1st Article     │                   │ When done,     │
  │                 │                   │ loop back to   │
  │                 │                   │ next article   │
  └────────┬────────┘                   └────────────────┘
           │
           ▼
  ┌────────────────────────────┐
  │  📝 PREPARE POST DATA      │
  │  - Get headline/title      │
  │  - Build post message      │
  │  - Add hashtags            │
  │  - Create article URL      │
  │  - Check image count       │
  └────────────┬───────────────┘
               │
               ▼
  ┌────────────────────────────┐
  │  📤 POST TO FACEBOOK       │
  │                            │
  │  IF Multi-image:           │
  │  1. Upload photos          │
  │  2. Create feed post       │
  │                            │
  │  IF Single-image:          │
  │  1. Upload photo with msg  │
  │                            │
  │  Returns: Post ID          │
  └────────────┬───────────────┘
               │
               ▼
  ┌────────────────────────────┐
  │  💬 ADD COMMENT            │
  │  "Read the full story:     │
  │   https://phuketradar...   │
  │                            │
  │  Returns: Comment ID       │
  └────────────┬───────────────┘
               │
               ▼
  ┌────────────────────────────┐
  │  📌 PIN COMMENT            │
  │  Pin comment to top        │
  │  (keeps link visible)      │
  └────────────┬───────────────┘
               │
               ▼
  ┌────────────────────────────┐
  │  💾 UPDATE DATABASE        │
  │  Save:                     │
  │  - facebookPostId          │
  │  - facebookPostUrl         │
  │                            │
  │  Prevents duplicate posts  │
  └────────────┬───────────────┘
               │
               ▼
  ┌────────────────────────────┐
  │  ⏸️  WAIT 5 SECONDS        │
  │  Rate limit protection     │
  └────────────┬───────────────┘
               │
               └──────────> BACK TO LOOP
                           (Next article)
                               │
                               ▼
                           ALL DONE
                               │
                               ▼
                      ⏰ Wait 30 min
                      (Next schedule)
```

---

## Data Flow Example

### Input Article (from Database):
```json
{
  "id": 12345,
  "title": "Major Traffic Accident on Patong Hill",
  "excerpt": "A serious traffic accident occurred on Patong Hill this morning...",
  "facebookHeadline": "BREAKING: Patong Hill Crash Closes Road",
  "imageUrl": "https://cloudinary.com/image1.jpg",
  "imageUrls": [
    "https://cloudinary.com/image1.jpg",
    "https://cloudinary.com/image2.jpg"
  ],
  "category": "Breaking",
  "slug": "major-traffic-accident-patong-hill",
  "interestScore": 5
}
```

### Processed Post Message:
```
BREAKING: Patong Hill Crash Closes Road

A serious traffic accident occurred on Patong Hill this morning...

Want the full story? Click the link in the first comment below...

#Phuket #PhuketNews #ThailandNews #BreakingNews
```

### Facebook Comment:
```
Read the full story: https://phuketradar.com/breaking/major-traffic-accident-patong-hill-12345
```

### Database Update:
```sql
UPDATE articles
SET facebookPostId = '786684811203574_123456789',
    facebookPostUrl = 'https://www.facebook.com/786684811203574/posts/123456789'
WHERE id = 12345;
```

---

## Hashtag Generation Logic

```javascript
Category         →  Hashtags
─────────────────────────────────────────────────────────────────
Breaking         →  #Phuket #PhuketNews #ThailandNews #BreakingNews
Tourism          →  #Phuket #PhuketTourism #ThailandTravel #VisitPhuket
Business         →  #Phuket #PhuketBusiness #ThailandBusiness #PhuketEconomy
Events           →  #Phuket #PhuketEvents #ThingsToDoInPhuket #PhuketLife
Crime            →  #Phuket #PhuketNews #PhuketCrime #ThailandSafety
Traffic          →  #Phuket #PhuketTraffic #PhuketNews #ThailandTravel
Weather          →  #Phuket #PhuketWeather #ThailandWeather #TropicalWeather
Other/Default    →  #Phuket #PhuketNews #Thailand #PhuketLife
```

---

## Multi-Image Post Logic

```
Check imageUrls array
       │
       ├─ Length > 1  →  Multi-Image Flow
       │                 │
       │                 ├─ Upload each photo (unpublished)
       │                 ├─ Collect photo IDs
       │                 ├─ Create feed post with attached_media
       │                 │
       │                 └─ If fails → Fallback to single image
       │
       └─ Length = 1  →  Single-Image Flow
                         │
                         └─ Direct photo upload with message
```

---

## Error Handling

```
┌───────────────────────┐
│  Post to Facebook     │
└──────────┬────────────┘
           │
      ┌────┴────┐
      │ Success │
      └────┬────┘
           │
      ┌────▼────────────┐
      │ Add Comment     │
      └────┬────────────┘
           │
      ┌────┴────┐
      │ Success │────────> Continue
      └────┬────┘
           │
      ┌────▼────┐
      │  Fail   │────────> Log warning, continue
      └─────────┘          (don't fail whole workflow)
```

**Philosophy**: 
- Post creation must succeed
- Comment/pin failures are logged but don't stop the workflow
- Database update must succeed to prevent duplicates

---

## Rate Limiting Strategy

```
Article 1  →  Post  →  Comment  →  Pin  →  Update DB  →  ⏸️ Wait 5s
                                                         ▼
Article 2  →  Post  →  Comment  →  Pin  →  Update DB  →  ⏸️ Wait 5s
                                                         ▼
Article 3  →  Post  →  Comment  →  Pin  →  Update DB  →  ⏸️ Wait 5s
```

**Why?**
- Facebook has rate limits
- Prevents appearing as spam
- Ensures reliable posting
- 5 articles × 5 seconds = 25 seconds total (well under 30-min schedule)

---

## Comparison: N8N vs Node.js

```
┌─────────────────────┬──────────────────────┬──────────────────────┐
│     Feature         │    Node.js (Old)     │     N8N (New)        │
├─────────────────────┼──────────────────────┼──────────────────────┤
│ Access Token Mgmt   │ Manual refresh       │ Auto-managed ✅       │
│ Error Visibility    │ Console logs only    │ Visual execution ✅   │
│ Modify Logic        │ Requires redeploy    │ Edit in UI ✅         │
│ Monitoring          │ Check database       │ Built-in logs ✅      │
│ Schedule Changes    │ Code modification    │ Click & change ✅     │
│ Multi-platform      │ Code for each        │ Add nodes ✅          │
│ Testing             │ Production only      │ Test mode ✅          │
│ Duplicate Prevention│ Lock mechanism       │ DB check ✅           │
└─────────────────────┴──────────────────────┴──────────────────────┘
```

---

## Timeline Comparison

### Node.js Implementation:
```
Scrape → Translate → Publish → Auto-post to Facebook
  │                               │
  │                               └─> Happens in scheduler.ts
  └─> Integrated into scraping process
```

### N8N Implementation:
```
Scrape → Translate → Publish
                       │
                       └─> facebookPostId = NULL
                                 │
                           ⏰ 30 min later
                                 │
                           N8N checks DB
                                 │
                           Posts to FB
                                 │
                           Updates DB
```

**Benefit**: Decoupled! Scraping failures don't affect posting, and vice versa.

---

## Success Criteria

✅ **Before N8N**:
- Facebook posting tied to scraping
- Token refresh required manual intervention
- Hard to debug posting failures
- Changes required code deployment

✅ **After N8N**:
- Independent posting system
- Auto token management
- Visual error tracking
- No-code modifications

---

**Ready to implement?** Follow `docs/N8N_QUICK_SETUP.md` to get started! 🚀
