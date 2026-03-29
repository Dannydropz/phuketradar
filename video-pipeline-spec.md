# Phuket Radar — Video Pipeline Spec

## For: Antigravity Implementation in n8n
## Date: March 20, 2026

---

## Overview

Add automated short-form video production to the existing Phuket Radar n8n pipeline. When a story qualifies, the system generates a narrated video with captions and source footage, then sends it to Publer for posting to Facebook Reels, Instagram Reels, and TikTok.

**Stack additions:**
- ElevenLabs API (narration) — $5–22/month
- FFmpeg (video assembly) — already available on server or install via apt
- Gemini Flash (script generation) — free tier or existing Gemini Pro subscription

**No new services or containers required.** Everything runs as n8n workflow nodes on the existing Netcup server.

---

## Video Format

Every video follows this exact structure:

| Segment | Duration | Content |
|---------|----------|---------|
| **Hook** | 2–4 sec | Most dramatic moment from source footage — collision, punch, chaos. No branding, no text, no context. Raw attention grab. |
| **Brand Sting** | 0.5–1 sec | Phuket Radar logo + sound hit. Transition into narration. |
| **Narrated Body** | 15–30 sec | Full source footage with AI narration overlay + burnt-in captions showing key facts (location, what happened, outcome). |
| **Resolution** | 3–5 sec | What happened next — arrested, hospitalised, deported, under investigation. Text overlay on final frame or separate card. |
| **Branded Outro** | 2–3 sec | Static card: "Follow @PhuketRadar" + LINE/Telegram handles. Consistent every video. |

**Total duration:** 25–45 seconds

**Aspect ratio:** 9:16 (1080x1920) for all platforms

**Two video types:**
1. **Standalone** — single high-scoring foreigner story (score ≥4, involves foreigner, has video footage)
2. **Daily Roundup** — "Phuket's News in 60 Seconds" — top 3–5 stories of the day, each gets the narrated body segment, connected by quick transitions

---

## Pipeline Flow

### Trigger: Fork from Existing Enrichment Pipeline

The video workflow triggers AFTER enrichment is complete. It does not replace the existing article publishing flow — it runs in parallel.

```
Existing pipeline:
  Scrape → Translate → Score → Enrich → Publish article + social

New video branch (parallel):
  Enriched story → Qualify for video? → Generate script → Narrate → Assemble → Send to Publer
```

### Node-by-Node Workflow

#### Node 1: Story Qualification (IF node)

Checks whether a story qualifies for video production.

**Standalone video criteria (ALL must be true):**
- Score ≥ 4
- Story involves foreigner/tourist (check for keywords: foreigner, tourist, farang, expat, Russian, Chinese, British, Australian, etc. in enriched text)
- Source post has video attachment (video_url is not null)

**Daily roundup criteria:**
- Separate scheduled workflow runs once daily (e.g., 6pm local time)
- Selects top 3–5 stories from the day by score
- At least one story must have video/image assets

**Output:** Story data object passed to next node:
```json
{
  "headline": "Russian Tourist Hospitalised After Motorbike Collision in Patong",
  "enriched_text": "Full enriched article text...",
  "location": "Patong, Phuket",
  "category": "accident",
  "source_video_url": "https://...",
  "source_images": ["https://...", "https://..."],
  "score": 5,
  "video_type": "standalone"
}
```

---

#### Node 2: Script Generation (HTTP Request → Gemini Flash API)

Generate a narration script optimised for spoken delivery.

**API call:** Gemini Flash (cheapest option, more than capable for this task)

**System prompt for script generation:**

```
You are a short-form video script writer for Phuket Radar, a breaking news channel covering Phuket, Thailand. Your audience is English-speaking expats and tourists.

Write a narration script for a short-form video (Facebook Reels / TikTok / Instagram Reels).

RULES:
- Write for SPOKEN delivery, not reading. Short punchy sentences. Conversational tone.
- Total script must be 60–90 words for standalone videos, 30–50 words per story for roundups.
- Structure: Setup (what happened) → Detail (key facts) → Resolution (outcome/status)
- First sentence must immediately establish drama: "A Russian tourist was rushed to hospital..." not "In Phuket today..."
- Include the specific location name (beach, road, area of Phuket)
- Include nationality of people involved if known
- End with the resolution/current status: arrested, hospitalised, under investigation, etc.
- Do NOT include greetings, sign-offs, hashtags, or "follow us" language — the outro handles that
- Do NOT use overly dramatic language or sensationalise — the footage speaks for itself, keep the narration factual and direct
- Use present tense for immediacy: "Police arrest..." not "Police arrested..."

OUTPUT FORMAT:
Return ONLY the narration script text. No labels, no stage directions, no formatting.

Also return a separate single line labelled CAPTION_TEXT with a ultra-short (8–12 word) one-liner summary for the main on-screen caption. This should be punchy and work as a text overlay.

Also return a line labelled HOOK_DESCRIPTION describing in one sentence what the most dramatic visual moment in this story would be (for selecting the hook clip).

Example output:
---
A British tourist is in hospital tonight after his motorbike slammed into a pickup truck on the Patong hill road. Witnesses say he was overtaking on a blind corner just after midnight. Police found no helmet at the scene. The 34-year-old from Manchester is in stable condition at Vachira Hospital with a broken leg and head injuries. Patong police are investigating.

CAPTION_TEXT: British biker hospitalised after midnight crash on Patong Hill
HOOK_DESCRIPTION: The moment of collision between the motorbike and pickup truck, or the aftermath showing the damaged vehicles on the road
---
```

**User prompt (template — populated with story data):**

```
Write a video narration script for this story:

HEADLINE: {{headline}}
FULL ARTICLE: {{enriched_text}}
LOCATION: {{location}}
CATEGORY: {{category}}
VIDEO TYPE: {{video_type}}
```

**Parse the response** to extract:
- `narration_script` (main text)
- `caption_text` (CAPTION_TEXT line)
- `hook_description` (HOOK_DESCRIPTION line)

---

#### Node 3: Text-to-Speech (HTTP Request → ElevenLabs API)

Convert narration script to audio.

**API endpoint:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`

**Recommended setup:**
- Choose a voice that sounds like a confident male/female news presenter — not robotic, not overly dramatic
- Test voices in ElevenLabs playground first, pick one and keep it consistent (this becomes your brand voice)
- Good starting points: "Adam" or "Rachel" from their pre-made voices, or clone a custom voice

**Request body:**
```json
{
  "text": "{{narration_script}}",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.6,
    "similarity_boost": 0.75,
    "style": 0.4,
    "use_speaker_boost": true
  }
}
```

**Response:** MP3 audio file (binary)

**Save to:** `/tmp/phuketradar/{{story_id}}_narration.mp3`

**Get audio duration** (needed for video assembly):
```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/phuketradar/{{story_id}}_narration.mp3
```

---

#### Node 4: Download Source Assets (HTTP Request nodes)

Download the source video and/or images from the scraped Facebook post.

```bash
# Download source video
wget -O /tmp/phuketradar/{{story_id}}_source.mp4 "{{source_video_url}}"

# Download source images (if no video, or for additional context)
wget -O /tmp/phuketradar/{{story_id}}_img1.jpg "{{source_images[0]}}"
```

**If source is a video:** Also extract a still frame for the resolution card:
```bash
ffmpeg -i /tmp/phuketradar/{{story_id}}_source.mp4 -vframes 1 -q:v 2 /tmp/phuketradar/{{story_id}}_still.jpg
```

---

#### Node 5: Generate Captions/Subtitles (Function node)

Generate an SRT subtitle file from the narration script for burnt-in captions.

**Approach:** Split the narration into short phrases (4–6 words each) and distribute them evenly across the narration audio duration.

```javascript
// Input: narration_script (string), audio_duration (float seconds)
// Output: SRT file content

const words = narration_script.split(' ');
const wordsPerChunk = 5;
const chunks = [];

for (let i = 0; i < words.length; i += wordsPerChunk) {
  chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
}

const chunkDuration = audio_duration / chunks.length;
let srt = '';

chunks.forEach((chunk, index) => {
  const start = index * chunkDuration;
  const end = start + chunkDuration;
  srt += `${index + 1}\n`;
  srt += `${formatTime(start)} --> ${formatTime(end)}\n`;
  srt += `${chunk}\n\n`;
});

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
  return `${h}:${m}:${s},${ms}`;
}

// Save to /tmp/phuketradar/{{story_id}}_captions.srt
```

For higher quality captions (word-level timing), ElevenLabs offers timestamps with their audio output when you add `"output_format": "mp3_44100_128"` and request `"timestamps"` — this gives you exact word timing. But the simple distribution approach above works fine for MVP.

---

#### Node 6: Video Assembly (Execute Command → FFmpeg)

This is the core assembly step. One FFmpeg command composites the entire video.

**Pre-requisites on server:**
```bash
apt-get install ffmpeg fonts-dejavu-core
# Or install a nicer font for captions:
# Place a bold sans-serif .ttf (e.g., Montserrat-Bold.ttf) in /usr/share/fonts/
```

**Required static assets (create once, reuse forever):**
- `/opt/phuketradar/brand_sting.mp4` — 1-second logo animation (1080x1920, 9:16). Can be a simple fade-in of your logo with a whoosh sound. Create this once in Canva or similar.
- `/opt/phuketradar/outro_card.png` — static outro image (1080x1920). "Follow @PhuketRadar" + social handles.
- `/opt/phuketradar/logo_watermark.png` — small transparent PNG of your logo for corner watermark during narrated body.

---

**FFmpeg Assembly — Standalone Video**

The command is complex but each part is documented. This runs as a single Execute Command node in n8n.

```bash
#!/bin/bash

STORY_ID="{{story_id}}"
WORK_DIR="/tmp/phuketradar"
ASSETS="/opt/phuketradar"

SOURCE="${WORK_DIR}/${STORY_ID}_source.mp4"
NARRATION="${WORK_DIR}/${STORY_ID}_narration.mp3"
CAPTIONS="${WORK_DIR}/${STORY_ID}_captions.srt"
OUTPUT="${WORK_DIR}/${STORY_ID}_final.mp4"

# Get narration duration
NAR_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "${NARRATION}")

# Step 1: Prepare source video — scale to 9:16, crop/pad as needed
ffmpeg -y -i "${SOURCE}" \
  -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1" \
  -c:v libx264 -preset fast -crf 23 -an \
  "${WORK_DIR}/${STORY_ID}_source_scaled.mp4"

# Step 2: Extract hook clip (first 3 seconds of source)
ffmpeg -y -i "${WORK_DIR}/${STORY_ID}_source_scaled.mp4" \
  -t 3 -c:v libx264 -preset fast -crf 23 -an \
  "${WORK_DIR}/${STORY_ID}_hook.mp4"

# Step 3: Prepare narrated body — source video trimmed/looped to narration length,
# with narration audio, captions burnt in, and logo watermark
ffmpeg -y \
  -stream_loop -1 -i "${WORK_DIR}/${STORY_ID}_source_scaled.mp4" \
  -i "${NARRATION}" \
  -i "${ASSETS}/logo_watermark.png" \
  -filter_complex "
    [0:v]trim=duration=${NAR_DUR},setpts=PTS-STARTPTS[vid];
    [2:v]scale=120:-1[logo];
    [vid][logo]overlay=W-w-30:30[branded];
    [branded]subtitles='${CAPTIONS}':force_style='FontName=DejaVu Sans,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Bold=1,Alignment=2,MarginV=180'[captioned]
  " \
  -map "[captioned]" -map 1:a \
  -t ${NAR_DUR} -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k \
  "${WORK_DIR}/${STORY_ID}_body.mp4"

# Step 4: Create outro (static image → 3-second video)
ffmpeg -y -loop 1 -i "${ASSETS}/outro_card.png" \
  -c:v libx264 -t 3 -pix_fmt yuv420p -preset fast -crf 23 \
  -vf "scale=1080:1920" \
  "${WORK_DIR}/${STORY_ID}_outro.mp4"

# Step 5: Concatenate all segments
cat > "${WORK_DIR}/${STORY_ID}_concat.txt" << EOF
file '${WORK_DIR}/${STORY_ID}_hook.mp4'
file '${ASSETS}/brand_sting.mp4'
file '${WORK_DIR}/${STORY_ID}_body.mp4'
file '${WORK_DIR}/${STORY_ID}_outro.mp4'
EOF

ffmpeg -y -f concat -safe 0 -i "${WORK_DIR}/${STORY_ID}_concat.txt" \
  -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k \
  -movflags +faststart \
  "${OUTPUT}"

# Step 6: Cleanup temp files (keep only final output)
rm -f "${WORK_DIR}/${STORY_ID}_source_scaled.mp4"
rm -f "${WORK_DIR}/${STORY_ID}_hook.mp4"
rm -f "${WORK_DIR}/${STORY_ID}_body.mp4"
rm -f "${WORK_DIR}/${STORY_ID}_outro.mp4"
rm -f "${WORK_DIR}/${STORY_ID}_concat.txt"

echo "DONE: ${OUTPUT}"
```

**Notes on the FFmpeg command:**
- `stream_loop -1` loops the source video if it's shorter than the narration — prevents black frames
- `subtitles` filter burns captions directly into the video. MarginV=180 positions them in the lower third but above the platform UI elements
- `movflags +faststart` enables progressive loading (important for social platforms)
- Hook uses first 3 seconds — for MVP this is good enough. Upgrade path: use Gemini to identify peak moment timestamp, then use `-ss {timestamp} -t 3` instead of just `-t 3`

---

**FFmpeg Assembly — Image-Only Stories (no source video)**

When a story has photos but no video, create a Ken Burns effect (slow zoom/pan) over the images.

```bash
# Convert static image to 5-second video with slow zoom
ffmpeg -y -loop 1 -i "${WORK_DIR}/${STORY_ID}_img1.jpg" \
  -vf "scale=1200:2134,zoompan=z='min(zoom+0.001,1.1)':d=150:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920" \
  -c:v libx264 -t 5 -pix_fmt yuv420p -preset fast -crf 23 \
  "${WORK_DIR}/${STORY_ID}_source_scaled.mp4"

# Then proceed with the same assembly pipeline as above
# (hook = first 3 sec of the zoom, body = image with narration, etc.)
```

---

#### Node 7: Generate Platform-Specific Captions (Function node)

Each platform needs different caption text and hashtags.

```javascript
// Generate captions for each platform
const headline = "{{headline}}";
const caption_text = "{{caption_text}}";
const location = "{{location}}";

const output = {
  facebook: `${caption_text}\n\n📍 ${location}\n\nFollow Phuket Radar for breaking Phuket news in English.`,

  instagram: `${caption_text}\n\n📍 ${location}\n\n#PhuketNews #Phuket #Thailand #PhuketRadar #BreakingNews #{{category}} #Expats #PhuketLife`,

  tiktok: `${caption_text} 📍 ${location} #PhuketNews #Phuket #Thailand #BreakingNews #fyp #foryou`
};

return output;
```

---

#### Node 8: Send to Publer (HTTP Request → Publer API)

Publer handles the actual posting to Facebook and Instagram. TikTok can be added to Publer as well.

**Option A: Publer API**

```
POST https://app.publer.io/api/v1/posts
Authorization: Bearer {{publer_api_token}}

{
  "social_account_ids": ["{{fb_account_id}}", "{{ig_account_id}}", "{{tiktok_account_id}}"],
  "text": "{{platform_specific_caption}}",
  "media_urls": ["{{video_file_url}}"],
  "is_reel": true,
  "scheduled_at": null  // null = publish immediately
}
```

**Option B: Upload via Publer's media endpoint first, then create post**

If Publer needs a hosted URL for the video file, either:
1. Upload to your Netcup server and serve via a temporary public URL
2. Upload to an S3-compatible bucket (Coolify may already have MinIO or similar)
3. Use Publer's media upload endpoint if available

**Check Publer's current API docs for the exact media upload flow** — the specifics may have changed. The key requirement is getting the rendered MP4 file to Publer with the `is_reel: true` flag.

---

#### Node 9: Cleanup (Execute Command)

Remove all temp files after successful posting.

```bash
rm -rf /tmp/phuketradar/{{story_id}}_*
```

---

## Daily Roundup Workflow

Separate n8n workflow, triggered on schedule (e.g., daily at 6pm ICT).

### Flow:

1. **Query database** for today's top 3–5 stories by score
2. **For each story**, run Nodes 2–5 (generate script, narrate, download assets, generate captions)
   - Use shorter script length per story (30–50 words each)
   - Add transition sound between stories
3. **Generate intro narration**: "Here's what happened in Phuket today" (can be a pre-recorded clip, reused daily)
4. **Assemble roundup video**: Concatenate intro + [story1_body + transition + story2_body + transition + story3_body] + outro
5. **Send to Publer** with roundup-specific captions

**Roundup FFmpeg concat file:**
```
file 'intro_daily.mp4'
file 'story1_body.mp4'
file 'transition.mp4'
file 'story2_body.mp4'
file 'transition.mp4'
file 'story3_body.mp4'
file 'outro_card.mp4'
```

---

## Static Assets to Create (One-Time)

These are created once and reused for every video:

| Asset | Spec | How to Create |
|-------|------|---------------|
| `brand_sting.mp4` | 1 sec, 1080x1920, logo fade-in + whoosh sound | Canva (export as MP4) or FFmpeg from logo PNG + sound |
| `outro_card.png` | 1080x1920, "Follow @PhuketRadar" + LINE/Telegram QR codes or handles | Canva |
| `logo_watermark.png` | ~120px wide, transparent background, semi-transparent logo | Export from your existing logo |
| `transition.mp4` | 0.5 sec, quick wipe or flash (for roundups only) | Canva or FFmpeg |
| `intro_daily.mp4` | 2–3 sec, "Phuket's News in 60 Seconds" branded card | Canva |

---

## Source Expansion: ScrapeCreators Integration

### Priority TikTok Sources to Add

Add these as new scrape targets via ScrapeCreators TikTok module:

**Accounts to monitor:**
- Thai rescue foundation TikTok accounts (post accident/rescue footage fast)
- Phuket-specific news TikTokers
- Tourist police Phuket-related accounts

**Hashtags to monitor:**
- `#ภูเก็ต` (Phuket)
- `#อุบัติเหตุภูเก็ต` (Phuket accident)
- `#ข่าวภูเก็ต` (Phuket news)
- `#ป่าตอง` (Patong)
- `#บางลา` (Bangla)
- `#farang`
- `#phuket`
- `#phuketaccident`

**Integration:** TikTok scrape results feed into the same scoring/enrichment pipeline as Facebook sources. The key difference is TikTok content is already vertical video — no reformatting needed for the hook clip.

### Deduplication

Since the same incident may appear on both Thai Facebook and TikTok, add a deduplication check:
- Match on: location + time + category + keywords
- If duplicate found, prefer the source with better video footage
- Flag for human review if uncertain

---

## Upgrade Path

Once the MVP is running and producing videos daily:

### Phase 2: Better Hook Detection
- Send source video to Gemini Pro vision API
- Prompt: "Identify the timestamp (in seconds) of the most dramatic/attention-grabbing moment in this video. Return only the number."
- Use that timestamp for the hook clip: `-ss {timestamp} -t 3`

### Phase 3: Remotion Templates
- If you want more polished motion graphics (animated maps, location pins, stat cards)
- Remotion runs as a separate Docker container on Netcup
- n8n calls it via HTTP with story data, gets back rendered MP4
- Much more flexible templates but adds infrastructure complexity

### Phase 4: Multi-Language
- Same pipeline but with Thai narration for Thai-language accounts
- ElevenLabs supports Thai
- Doubles your potential reach

---

## Cost Estimate

| Item | Monthly Cost |
|------|-------------|
| ElevenLabs (Starter) | $5 |
| Gemini Flash (script generation) | Free tier / negligible |
| FFmpeg | Free (already on server) |
| Publer | Existing subscription |
| ScrapeCreators | Existing subscription |
| Server compute (Netcup) | Existing — FFmpeg adds ~2–5 min CPU per video |
| **Total additional cost** | **~$5/month** |

---

## Implementation Checklist

- [ ] Install FFmpeg on Netcup server if not present (`apt-get install ffmpeg`)
- [ ] Install a good caption font (`apt-get install fonts-dejavu-core` or upload Montserrat-Bold.ttf)
- [ ] Create static assets (brand sting, outro card, logo watermark, transition clip)
- [ ] Set up ElevenLabs account, choose voice, get API key
- [ ] Build n8n workflow: story qualification node
- [ ] Build n8n workflow: script generation (Gemini Flash HTTP call)
- [ ] Build n8n workflow: ElevenLabs TTS HTTP call
- [ ] Build n8n workflow: asset download nodes
- [ ] Build n8n workflow: caption/SRT generation (Function node)
- [ ] Build n8n workflow: FFmpeg assembly (Execute Command)
- [ ] Build n8n workflow: platform caption generation (Function node)
- [ ] Build n8n workflow: Publer posting (HTTP Request)
- [ ] Build n8n workflow: cleanup node
- [ ] Test with 3 real stories manually
- [ ] Build daily roundup scheduled workflow
- [ ] Add TikTok sources via ScrapeCreators
- [ ] Add TikTok to Publer for cross-posting
- [ ] Connect LINE Official Account and Telegram channel for CTAs in outro
