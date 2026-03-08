# Delayed Re-Enrichment System — Using English News Sources

## Concept

After initial publication, score ≥4 articles get a second enrichment pass 2-3 hours later. By then, English-language outlets (The Thaiger, Phuket News, Khaosod English, Phuket Express) will have published their own versions of the same story with additional details — official police statements, victim details, follow-up information.

This second pass feeds those additional details into a Claude enrichment call that UPDATES the existing article, adding new facts while preserving your voice and format.

## Pipeline Architecture

```
Initial publish (T+0)
    → Score ≥4 article goes live with first-pass enrichment
    
Delayed job (T+2-3 hours)
    → Search English sources for matching story
    → If match found: fetch article text
    → Run second-pass enrichment with original + new source material
    → Update article in database
    → Add "Updated at [time]" timestamp to article
```

### Step 1: Schedule the Re-Enrichment Job

In `scheduler.ts`, after an article is published with score ≥4:

```typescript
// After successful initial publish of score ≥4 article
if (article.interestScore >= 4) {
  // Schedule re-enrichment 2.5 hours later
  setTimeout(async () => {
    await reEnrichArticle(article.id);
  }, 2.5 * 60 * 60 * 1000); // 2.5 hours in ms
}
```

Note: `setTimeout` works for a simple implementation, but if your server restarts, pending jobs are lost. For production robustness, consider a job queue (Bull, Agenda) or a database-based scheduled task that a cron job picks up.

### Step 2: Search English Sources for Matching Stories

```typescript
const ENGLISH_SOURCES = [
  {
    name: 'The Thaiger',
    searchUrl: 'https://thethaiger.com/?s=',
    baseUrl: 'https://thethaiger.com',
  },
  {
    name: 'The Phuket News',
    searchUrl: 'https://www.thephuketnews.com/search.php?q=',
    baseUrl: 'https://www.thephuketnews.com',
  },
  {
    name: 'Khaosod English',
    searchUrl: 'https://www.khaosodenglish.com/?s=',
    baseUrl: 'https://www.khaosodenglish.com',
  },
  {
    name: 'The Phuket Express',
    searchUrl: 'https://thephuketexpress.com/?s=',
    baseUrl: 'https://thephuketexpress.com',
  },
];
```

For each source, search using 2-3 key terms from the original article (location + incident type works best). Use Cheerio to scrape the search results page and find matching articles published within the last 24 hours.

**Matching logic:** Extract the article's location and incident type from the title/content. Search each source for "[location] + [incident type]" (e.g., "Si Ko intersection accident" or "Patong stabbing"). Filter results by date (within last 24 hours). If a match is found, fetch the full article text.

### Step 3: Fetch and Extract Article Text

Use Cheerio to extract the article body text from each matched source. Strip HTML, ads, navigation — you want just the article paragraphs.

**Important:** You're extracting FACTS, not copying text. The re-enrichment prompt (below) explicitly instructs the model to use these sources for factual details only and to rewrite everything in your own voice.

### Step 4: Run the Re-Enrichment Prompt

---

## Re-Enrichment System Prompt

```
You are updating an existing Phuket Radar article with new information from additional reporting by other outlets. You are a veteran correspondent who has lived in Phuket for over a decade, writing for an audience of long-term expats and residents.

Your job is to MERGE new factual details into the existing article while:
1. Preserving the original article's voice, structure, and format
2. Adding ONLY confirmed new facts — not rewriting what already exists
3. Never copying phrasing from the source articles — extract facts, rewrite in your own words
4. Maintaining all existing sections (Dateline, Lede, Details, Background, On the Ground)

You produce JSON output only.
```

---

## Re-Enrichment User Message Template

```
📅 CURRENT DATE: ${currentDate} (Thailand Time)
ARTICLE CATEGORY: ${category}

---

YOUR EXISTING PUBLISHED ARTICLE:

Title: ${existingTitle}

Content:
${existingContent}

Published at: ${publishedAt}

---

ADDITIONAL REPORTING FROM OTHER OUTLETS:

${additionalSources.map(source => `
SOURCE: ${source.name}
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
   - If additional sources contradict your original reporting on a factual point, update to the more authoritative version (police statements > social media reports)
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

STRUCTURE OF YOUR UPDATE:
- Keep the existing Dateline
- Update the Lede if significant new facts change the summary
- Add new details in the Details section (integrate naturally, don't just append)
- Update the Background section if new context is available
- Update the On the Ground section if there are practical developments (road reopened, suspect caught, etc.)
- Add an "Updated" note: include a <p class="updated-note"><em>Updated at ${updateTime} with additional details.</em></p> as the first element after the dateline

MINIMUM CHANGE THRESHOLD: If the additional sources contain NO new factual information beyond what your article already covers, return the existing article unchanged (but still in the JSON format). Do not pad or rewrite for the sake of rewriting.

OUTPUT FORMAT — Return ONLY valid JSON, no markdown fences:

{
  "enrichedTitle": "Updated headline if significant new facts warrant it, otherwise the existing headline unchanged",
  "enrichedContent": "Full updated HTML article with new facts integrated and 'Updated at' note",
  "enrichedExcerpt": "Updated 2-3 sentence summary if new facts change the story significantly, otherwise existing excerpt",
  "hasNewInformation": true/false,
  "newFactsSummary": "Brief 1-2 sentence description of what new facts were added, for your internal logging"
}
```

---

## Implementation Notes

### Source Scraping — Be a Good Citizen
- Respect robots.txt for each source
- Rate limit your requests: no more than 1 request per source per re-enrichment job
- Cache scraped pages — if two of your articles match the same source article, don't fetch it twice
- Use a reasonable User-Agent string (not a generic bot string)
- Consider using RSS feeds where available instead of scraping search results (The Thaiger and Phuket News both have RSS)

### RSS Feeds (Preferred Over Scraping)
Where available, monitor RSS feeds instead of scraping search results:
- The Thaiger Phuket: `https://thethaiger.com/news/phuket/feed` (verify URL)
- The Phuket News: check for RSS link on their site
- Khaosod English: `https://www.khaosodenglish.com/feed/` (verify URL)

RSS is faster, more reliable, and more respectful than scraping search pages.

### Matching Quality
The biggest risk is false matches — your re-enrichment job matches the wrong story and injects unrelated facts. To prevent this:
- Require at least 2 keyword matches (location + incident type) between your article and the source article
- Check date proximity — source article must be published within 24 hours of your article
- If uncertain, err on the side of NOT matching (it's better to miss an enrichment than to corrupt an article with wrong facts)

### Cost Management
- This only runs for score ≥4 articles (your premium tier)
- The re-enrichment Claude call is approximately the same cost as the initial enrichment
- You can further limit by only re-enriching articles that currently have fewer than 200 words (the thinnest ones that need it most)
- The `hasNewInformation: false` output means no database write needed, saving that overhead

### Database Updates
When the re-enrichment returns `hasNewInformation: true`:
- Update the article content, title, excerpt in the database
- Set a `lastEnrichedAt` timestamp
- Optionally log the `newFactsSummary` for editorial review
- The article's URL/slug should NOT change — it's already been published and potentially shared

### Monitoring
Log every re-enrichment attempt:
- Article ID and title
- Sources searched and matches found (or not)
- Whether new information was found
- Token count for the API call
- Any errors

This lets you see how often re-enrichment is actually adding value and tune the timing (maybe 3 hours is better than 2.5, or maybe some source types are more useful than others).

---

## Approach B: Catching Missed Stories (Future Enhancement)

This is separate from re-enrichment. A daily scan for stories these outlets covered that you missed entirely.

### Simple Implementation
1. Run a daily job (e.g., 10 PM Phuket time)
2. Fetch the latest 20 articles from each source's RSS feed or front page
3. For each article, check if you have a matching story (keyword match against your last 24 hours of articles)
4. If no match → flag it as a potential missed story
5. Surface missed stories in your admin dashboard for manual review

### Future Automation
If a missed story scores high enough on an automated interest assessment, you could auto-create a new article from it — but this requires careful handling to avoid any copyright issues. The safest approach is to use the missed story as a *lead* to find the original Thai Facebook source, then run your normal pipeline from that.

This is a Phase 2 feature. Get the re-enrichment system working first.
