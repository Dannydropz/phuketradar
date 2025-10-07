# Design Guidelines: Phuket News Aggregator

## Design Approach
**Reference-Based Approach**: Inspired by Morning Brew's clean, newsletter-style aesthetic combined with modern news platforms like The Information and Substack. Focus on readability, speed, and professional journalism presentation.

**Key Principles**:
- Typography-first design prioritizing reading experience
- High contrast for optimal readability in tropical lighting conditions
- Minimal visual distractions to emphasize news content
- Fast-loading, content-forward architecture

---

## Core Design Elements

### A. Color Palette

**Light Mode**:
- Background: 0 0% 100% (pure white)
- Primary Text: 220 13% 13% (near-black for readability)
- Secondary Text: 220 9% 46% (muted for metadata)
- Primary Brand: 190 85% 35% (tropical teal - Phuket ocean reference)
- Surface: 210 20% 98% (subtle gray for cards)
- Border: 220 13% 91% (light dividers)
- Accent (sparingly): 25 95% 53% (sunset orange for CTAs)

**Dark Mode**:
- Background: 222 47% 11% (deep navy)
- Primary Text: 210 20% 98% (off-white)
- Secondary Text: 215 14% 71% (muted light gray)
- Primary Brand: 190 75% 45% (brighter teal)
- Surface: 217 33% 17% (elevated surfaces)
- Border: 217 19% 27% (subtle dividers)

### B. Typography

**Font Families** (via Google Fonts CDN):
- Headlines: 'Inter', sans-serif (600-800 weights)
- Body: 'Inter', sans-serif (400-500 weights)
- Accent/Labels: 'Inter', sans-serif (500-600 weights)

**Type Scale**:
- Hero Headline: text-5xl md:text-6xl font-bold
- Article Title: text-3xl md:text-4xl font-semibold
- Section Header: text-2xl font-semibold
- Card Title: text-xl font-semibold
- Body Large: text-lg leading-relaxed
- Body: text-base leading-relaxed
- Meta: text-sm font-medium
- Caption: text-xs

### C. Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16, 20, 24** for consistent rhythm
- Component padding: p-6 to p-8
- Section spacing: py-12 md:py-20
- Card gaps: gap-6 to gap-8
- Container max-width: max-w-7xl

**Grid Structure**:
- Main content: max-w-4xl (optimal reading width ~70 characters)
- Sidebar: w-80 (recent news, trending)
- Article list: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

### D. Component Library

**Navigation**:
- Sticky header with blur background (backdrop-blur-lg bg-white/80 dark:bg-slate-900/80)
- Logo left, navigation center, language toggle + dark mode right
- Categories as horizontal tabs below header
- Mobile: hamburger menu with slide-in drawer

**Article Cards**:
- Clean white/dark surface with subtle shadow
- Featured image top (16:9 aspect ratio)
- Category badge (small, colored pill)
- Headline in bold
- Excerpt (2-3 lines, text-gray-600)
- Metadata footer: timestamp, read time, source indicator
- Hover: subtle lift (transform translate-y-[-2px]) + shadow enhancement

**Hero Section**:
- Large featured article card spanning 2/3 width
- Side stack of 3 smaller breaking news items
- Prominent "BREAKING" or "LATEST" label for freshest content
- Large, high-quality image with gradient overlay for text readability

**Article Page**:
- Full-width hero image (if available) with gradient overlay
- Centered content max-w-3xl for reading comfort
- Breadcrumb navigation
- Publish timestamp, author, read time, share buttons
- Image gallery support for multi-image articles
- Related articles footer grid

**Admin Dashboard** (utility-focused):
- Table layout for scraped content review
- Inline edit capabilities
- Filter/sort controls
- Approve/reject/schedule actions
- Source preview panel

### E. Interactive Elements

**Buttons**:
- Primary: bg-teal-600 text-white rounded-lg px-6 py-3 font-semibold
- Secondary: border-2 border-teal-600 text-teal-600 rounded-lg px-6 py-3 font-semibold
- On images: backdrop-blur-md bg-white/20 border-white/40 text-white (NO hover states needed)

**Status Indicators**:
- "BREAKING" badge: bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold
- "NEW" badge: bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold
- Source badge: border pill with FB icon

**Animations**: 
- Minimal - only subtle hover transforms on cards (2px lift)
- Smooth transitions (transition-all duration-200)
- Loading skeletons for content fetch

---

## Icons
Use **Heroicons** (outline style) via CDN for consistency - news icons, share icons, navigation, time indicators

---

## Images

**Hero Image**: YES - Large featured article image (1200x675px minimum)
- Placement: Top of homepage, full-width with subtle gradient overlay
- Text overlay: Article headline + category + timestamp in white

**Article Images**:
- Card thumbnails: 16:9 ratio, cropped to focus
- In-article images: Full-width within content area, properly captioned
- Gallery images: Grid layout with lightbox functionality

**Placeholder Strategy**: Use subtle gray backgrounds with Heroicons newspaper icon for missing images

---

## Page-Specific Layouts

**Homepage**:
1. Sticky Navigation
2. Hero Featured Article (full-width, prominent image)
3. Breaking News Strip (horizontal scroll on mobile)
4. Latest News Grid (3 columns desktop, responsive)
5. Category Sections (Phuket News, Tourism, Business, etc.)
6. Newsletter Signup CTA
7. Footer (minimal: links, social, credits)

**Article Page**:
1. Breadcrumb Navigation
2. Hero Image (if available)
3. Article Header (title, meta, share)
4. Content (max-w-3xl, generous line-height)
5. Media Gallery (if multiple images)
6. Related Articles
7. Newsletter CTA

**Admin Dashboard**:
- Left sidebar navigation
- Main content: Data table with filters
- Right panel: Preview/edit pane
- Top bar: Scrape status, manual trigger button

---

## Accessibility & Performance

- Maintain WCAG AA contrast ratios (4.5:1 minimum)
- Dark mode toggle respects system preference by default
- Lazy load images below fold
- Skip-to-content link for keyboard navigation
- Semantic HTML5 structure (article, header, nav, aside)
- Alt text required for all news images