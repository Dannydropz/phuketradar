/**
 * Newsletter Preview Generator
 *
 * Generates and saves the newsletter HTML preview from today's top articles.
 * Open newsletter_approval_preview.html in your browser to see the result.
 *
 * Usage:
 *   PGSSLMODE=disable npx tsx scripts/send_test_newsletter.ts
 *
 * After running, open: newsletter_approval_preview.html
 * Then copy the HTML content into Beehiiv's custom HTML editor to send.
 */

import "dotenv/config";
import { storage } from "../server/storage";
import { buildArticleUrl } from "../shared/category-map";
import fs from "fs";
import path from "path";
import { format } from "date-fns";

const SITE_URL = 'https://phuketradar.com';

async function generatePreview() {
    console.log("🚀 Generating newsletter preview...");

    const hoursAgo = 24;
    const articles = await storage.getPublishedArticles(100, 0);
    const twentyFourHoursAgo = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    const recentArticles = articles.filter(a => new Date(a.publishedAt) >= twentyFourHoursAgo);

    if (recentArticles.length === 0) {
        console.log("⚠️ No articles from last 24h. Using most recent instead.");
        recentArticles.push(...articles.slice(0, 10));
    }

    const rankedArticles = recentArticles.sort((a, b) => {
        const scoreA = (a.engagementScore || 0) + (a.interestScore || 0);
        const scoreB = (b.engagementScore || 0) + (b.interestScore || 0);
        return scoreB - scoreA;
    });

    const topStory = rankedArticles[0];
    const trendingStories = rankedArticles.slice(1, 4);
    const radarStories = rankedArticles.slice(4, 9);

    const templatePath = path.join(process.cwd(), "docs", "newsletter-template.html");
    let html = fs.readFileSync(templatePath, "utf-8");

    const formattedDate = format(new Date(), 'EEEE, MMMM d, yyyy');
    html = html.replace(/{{DATE}}/g, formattedDate);

    const getTimeString = (date: Date | string) => format(new Date(date), 'h:mm a');

    console.log(`📌 Top Story: ${topStory.title}`);
    const topStoryPath = buildArticleUrl({ category: topStory.category, slug: topStory.slug, id: topStory.id });
    html = html.replace(/{{TOP_STORY_URL}}/g, `${SITE_URL}${topStoryPath}`);
    html = html.replace(/{{TOP_STORY_IMAGE}}/g, topStory.imageUrl || 'https://phuketradar.com/assets/placeholder.png');
    html = html.replace(/{{TOP_STORY_TITLE}}/g, topStory.title);
    html = html.replace(/{{TOP_STORY_CATEGORY}}/g, topStory.category.toUpperCase());
    html = html.replace(/{{TOP_STORY_EXCERPT}}/g, topStory.excerpt);

    trendingStories.forEach((s, i) => {
        const idx = i + 1;
        console.log(`📈 Trending ${idx}: ${s.title}`);
        const sPath = buildArticleUrl({ category: s.category, slug: s.slug, id: s.id });
        html = html.replace(new RegExp(`{{STORY_${idx}_URL}}`, 'g'), `${SITE_URL}${sPath}`);
        html = html.replace(new RegExp(`{{STORY_${idx}_IMAGE}}`, 'g'), s.imageUrl || 'https://phuketradar.com/assets/placeholder.png');
        html = html.replace(new RegExp(`{{STORY_${idx}_TITLE}}`, 'g'), s.title);
        html = html.replace(new RegExp(`{{STORY_${idx}_CATEGORY}}`, 'g'), s.category.toUpperCase());
        html = html.replace(new RegExp(`{{STORY_${idx}_TIME}}`, 'g'), getTimeString(s.publishedAt));
    });

    radarStories.forEach((s, i) => {
        const idx = i + 1;
        console.log(`📡 Radar ${idx}: ${s.title}`);
        const sPath = buildArticleUrl({ category: s.category, slug: s.slug, id: s.id });
        html = html.replace(new RegExp(`{{RADAR_${idx}_URL}}`, 'g'), `${SITE_URL}${sPath}`);
        html = html.replace(new RegExp(`{{RADAR_${idx}_TITLE}}`, 'g'), s.title);
    });

    // Clean up remaining placeholders
    html = html.replace(/{{STORY_\d_URL}}/g, '#');
    html = html.replace(/{{STORY_\d_IMAGE}}/g, 'https://phuketradar.com/assets/placeholder.png');
    html = html.replace(/{{STORY_\d_TITLE}}/g, 'More news coming soon');
    html = html.replace(/{{STORY_\d_CATEGORY}}/g, 'NEWS');
    html = html.replace(/{{STORY_\d_TIME}}/g, '');
    html = html.replace(/{{RADAR_\d_URL}}/g, '#');
    html = html.replace(/{{RADAR_\d_TITLE}}/g, '');
    html = html.replace(/{{UNSUBSCRIBE_URL}}/g, `${SITE_URL}/unsubscribe`);

    const outputPath = path.join(process.cwd(), "newsletter_approval_preview.html");
    fs.writeFileSync(outputPath, html);

    console.log("\n✅ Preview saved to: newsletter_approval_preview.html");
    console.log("📂 Open it in your browser to review the design.");
    console.log("📋 To send: copy the HTML into Beehiiv's custom HTML editor at https://app.beehiiv.com");
}

generatePreview().catch(console.error);
