# BrightData API Test Results & Comparison

## Test Date: October 27, 2025

---

## ✅ VERDICT: Multi-Image Support CONFIRMED

BrightData **FULLY SUPPORTS** multi-image carousel posts from Facebook!

---

## Test Results

### API Configuration
- **Endpoint**: `https://api.brightdata.com/datasets/v3/trigger`
- **Dataset ID**: `gd_lkaxegm826bjpoo9m5` (Facebook Posts)
- **Test Page**: Phuket Time News
- **Posts Requested**: 10
- **Processing Time**: ~30-60 seconds (async)

### Multi-Image Support Analysis

**✅ CONFIRMED: Multi-Image Carousel Support**

Example from test data:
```json
"attachments": [
  {
    "id": "1160837526167088",
    "type": "Photo",
    "url": "https://scontent.ffjr1-4.fna.fbcdn.net/v/t39.30808-6/572048075_...",
    "attachment_url": "https://www.facebook.com/photo.php?fbid=1160837526167088..."
  },
  {
    "id": "1160837442833763",
    "type": "Photo",
    "url": "https://scontent.ffjr1-4.fna.fbcdn.net/v/t39.30808-6/571334446_...",
    "attachment_url": "https://www.facebook.com/photo.php?fbid=1160837442833763..."
  },
  {
    "id": "1160837939500380",
    "type": "Photo",
    "url": "https://scontent.ffjr1-1.fna.fbcdn.net/v/t39.30808-6/570036738_...",
    "attachment_url": "https://www.facebook.com/photo.php?fbid=1160837939500380..."
  },
  {
    "id": "1160838229500351",
    "type": "Photo",
    "url": "...",
    "attachment_url": "..."
  }
  // ... more photos
]
```

**Key Finding**: Posts with multiple images return ALL photos in the `attachments` array!

---

## Available Data Fields

BrightData provides comprehensive data for each post:

### Core Fields
- `url` - Post permalink
- `post_id` - Facebook post ID
- `content` - Post text content
- `date_posted` - ISO 8601 timestamp
- `user_url` - Page URL
- `user_username_raw` - Page display name

### Engagement Metrics
- `num_comments` - Comment count
- `num_shares` - Share count
- `num_likes_type` - Detailed like type breakdown

### Media Fields
- **`attachments`** - **Array of all images/videos**
  - Each attachment includes:
    - `id` - Media ID
    - `type` - "Photo" or "Video"
    - `url` - Direct media URL
    - `attachment_url` - Facebook attachment permalink
    - `video_url` - Video URL (if video type)

### Page Information
- `page_name` - Page display name
- `page_logo` - Page profile picture URL
- `page_category` - Business category
- `page_followers` - Follower count
- `page_external_website` - External link
- `page_is_verified` - Verification status

---

## Cost Comparison

### Monthly Cost Estimate
Based on 3 Facebook pages scraped every 2 hours (12 scrapes/day):
- **Estimated posts/month**: ~5,000-10,000 records

| Provider | Monthly Cost | Multi-Image | Status |
|----------|--------------|-------------|--------|
| **ScrapeCreators** | Unknown (free trial?) | ❌ Single only | ✅ Active |
| **Apify** | $39/month | ✅ Full support | ❌ Free tier exhausted |
| **BrightData** | **$7.50-$15** | ✅ Full support | ⭐ Recommended |

### BrightData Pricing Tiers
- **Pay-as-you-go**: $1.50 per 1K records (no commitment)
- **Growth**: $0.98 per 1K records ($499/month) - 25% off with code APIS25
- **Business**: $0.83 per 1K records ($999/month) - 25% off with code APIS25

**Recommended**: Pay-as-you-go for your volume (~$10/month avg)

### Cost Savings vs Apify
- **Monthly savings**: $24-$31.50 (61-81% cheaper than Apify)
- **Annual savings**: $288-$378

---

## Integration Requirements

### Data Mapping: BrightData → Your Schema

#### Current Schema (from ScrapeCreators)
```typescript
{
  thaiTitle: string;
  thaiContent: string;
  sourceUrl: string;
  imageUrl?: string;      // Single image only!
  imageUrls?: string[];   // Array for multi-image
}
```

#### BrightData Mapping
```typescript
const scrapedPost = {
  thaiTitle: data.content.split('\n')[0] || '',  // First line as title
  thaiContent: data.content,
  sourceUrl: data.url,
  imageUrl: data.attachments?.[0]?.url,          // First image
  imageUrls: data.attachments
    ?.filter(att => att.type === 'Photo')
    ?.map(att => att.url) || [],                 // ALL images
  publishedAt: data.date_posted
};
```

### Implementation Changes Needed

1. **Update scraper service** (`server/services/scraper.ts`):
   - Replace ScrapeCreators API call with BrightData
   - Map `attachments` array to `imageUrls`
   - Handle async polling (30-60 second delay)

2. **Update scheduler** (`server/scheduler.ts`):
   - Account for BrightData's async processing
   - Poll for results instead of immediate response

3. **Environment variables**:
   - Add `BRIGHTDATA_API_KEY` to Replit Secrets
   - Update `SCRAPER_PROVIDER=brightdata` (or keep existing logic)

---

## Pros & Cons

### ✅ Advantages

1. **Multi-image support** - Captures ALL photos from carousel posts
2. **Cost-effective** - 74% cheaper than Apify ($10 vs $39/month)
3. **Rich metadata** - Engagement metrics, page info, follower counts
4. **Reliable infrastructure** - Used by major companies (McDonald's, Deloitte, NBC)
5. **Flexible pricing** - Pay-as-you-go with no commitment
6. **25% discount** - Use code APIS25 for 6 months savings

### ⚠️ Considerations

1. **Async processing** - 30-60 second delay to get results (requires polling)
2. **API complexity** - More complex than ScrapeCreators (trigger → poll → retrieve)
3. **Migration effort** - Need to rewrite scraper integration
4. **No free tier** - Pay-as-you-go starts immediately (but very cheap)

---

## Migration Complexity

**Estimated effort**: 2-3 hours of development work

### Implementation Steps

1. Add BrightData API integration (~45 min)
2. Update data mapping logic (~30 min)
3. Implement async polling mechanism (~45 min)
4. Test with all 3 Facebook pages (~30 min)
5. Update documentation (~15 min)

### Risk Assessment

- **Low risk**: BrightData is battle-tested, reliable infrastructure
- **Rollback option**: Keep ScrapeCreators as fallback provider
- **Testing**: Can test in parallel before switching production

---

## Recommendation

### ⭐ **Strongly Recommended: Switch to BrightData**

**Why:**
1. **Solves your multi-image problem** - Capture all carousel photos
2. **Saves $288-378/year** vs Apify
3. **Better data quality** - More fields, engagement metrics
4. **Scalable** - Pay-as-you-go grows with your needs

**Next Steps:**
1. ✅ Test completed - Multi-image support confirmed
2. 🔄 Implement BrightData scraper service
3. 🧪 Test with all 3 news sources
4. 🚀 Deploy and monitor first 24 hours
5. 📊 Compare results vs ScrapeCreators

**Timeline**: Can be production-ready in 1 day

---

## Sample Data Structure

### Complete Post Example
```json
{
  "url": "https://www.facebook.com/PhuketTimeNews/posts/pfbid02FY...",
  "post_id": "1160839336166907",
  "content": "🐖น้องๆ ออกมาเดินโชว์ตัวบายใจ ช่วงกินเจภูเก็ต แถวเกาะแก้ว ,กะทู้",
  "date_posted": "2025-10-27T03:04:31.000Z",
  "num_comments": 15,
  "num_shares": 2,
  "num_likes_type": {
    "type": "Like",
    "num": 168
  },
  "attachments": [
    {
      "id": "1160837526167088",
      "type": "Photo",
      "url": "https://scontent.ffjr1-4.fna.fbcdn.net/...",
      "attachment_url": "https://www.facebook.com/photo.php?fbid=..."
    }
    // ... more photos for carousel posts
  ],
  "page_name": "Phuket Times ภูเก็ตไทม์",
  "page_followers": 567000
}
```

---

## Conclusion

BrightData is the **ideal replacement** for ScrapeCreators:
- ✅ Multi-image carousel support (your main requirement)
- ✅ 74% cost savings vs Apify
- ✅ Rich metadata for better content curation
- ✅ Proven reliability and scale
- ⚠️ Requires async polling (acceptable trade-off)

**ROI**: Migration effort (~3 hours) pays back in first month via cost savings and better data quality.
