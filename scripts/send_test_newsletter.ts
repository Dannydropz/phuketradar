
import { storage } from "../server/storage";
import { NewsletterArticle } from "../server/services/newsletter";
import { buildArticleUrl } from "../shared/category-map";
import { isMaillayerConfigured, sendMaillayerRawEmail } from "../server/lib/maillayer-client";
import { getUncachableResendClient } from "../server/lib/resend-client";
import fs from "fs";
import path from "path";
import { format } from "date-fns";

const SITE_URL = 'https://phuketradar.com';

async function sendTestNewsletter() {
    console.log("🚀 Starting test newsletter generation...");

    // 1. Fetch top stories from last 24 hours
    const hoursAgo = 24;
    const articles = await storage.getPublishedArticles(100, 0);
    const twentyFourHoursAgo = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    const recentArticles = articles.filter(a => new Date(a.publishedAt) >= twentyFourHoursAgo);

    if (recentArticles.length === 0) {
        console.log("⚠️ No articles found in the last 24 hours. Using recent published articles instead.");
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

    // 2. Load template
    const templatePath = path.join(process.cwd(), "docs", "newsletter-template.html");
    let html = fs.readFileSync(templatePath, "utf-8");

    // 3. Populate Template
    const formattedDate = format(new Date(), 'EEEE, MMMM d, yyyy');
    html = html.replace(/{{DATE}}/g, formattedDate);

    // Helper to get time string
    const getTimeString = (date: Date | string) => {
        const d = new Date(date);
        return format(d, 'h:mm a');
    };

    // Top Story
    console.log(`📌 Top Story: ${topStory.title}`);
    const topStoryPath = buildArticleUrl({ category: topStory.category, slug: topStory.slug, id: topStory.id });
    html = html.replace(/{{TOP_STORY_URL}}/g, `${SITE_URL}${topStoryPath}`);
    html = html.replace(/{{TOP_STORY_IMAGE}}/g, topStory.imageUrl || 'https://phuketradar.com/assets/placeholder.png');
    html = html.replace(/{{TOP_STORY_TITLE}}/g, topStory.title);
    html = html.replace(/{{TOP_STORY_CATEGORY}}/g, topStory.category.toUpperCase());
    html = html.replace(/{{TOP_STORY_EXCERPT}}/g, topStory.excerpt);

    // Trending Stories
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

    // Radar Stories
    radarStories.forEach((s, i) => {
        const idx = i + 1;
        console.log(`📡 Radar ${idx}: ${s.title}`);
        const sPath = buildArticleUrl({ category: s.category, slug: s.slug, id: s.id });
        html = html.replace(new RegExp(`{{RADAR_${idx}_URL}}`, 'g'), `${SITE_URL}${sPath}`);
        html = html.replace(new RegExp(`{{RADAR_${idx}_TITLE}}`, 'g'), s.title);
    });

    // Clean up remaining placeholders if any
    html = html.replace(/{{STORY_\d_URL}}/g, '#');
    html = html.replace(/{{STORY_\d_IMAGE}}/g, 'https://phuketradar.com/assets/placeholder.png');
    html = html.replace(/{{STORY_\d_TITLE}}/g, 'More news coming soon');
    html = html.replace(/{{STORY_\d_CATEGORY}}/g, 'NEWS');
    html = html.replace(/{{STORY_\d_TIME}}/g, '');
    html = html.replace(/{{RADAR_\d_URL}}/g, '#');
    html = html.replace(/{{RADAR_\d_TITLE}}/g, '');

    // 4. Send to user
    const userEmail = 'dannyjkeegan@gmail.com';
    console.log(`📧 Sending newsletter to ${userEmail}...`);

    const subject = `Phuket Radar - ${formattedDate}`;
    const unsubscribeUrl = `${SITE_URL}/api/unsubscribe/test-token`;
    html = html.replace('{{UNSUBSCRIBE_URL}}', unsubscribeUrl);

    // Always save a copy for inspection
    fs.writeFileSync(path.join(process.cwd(), "newsletter_approval_preview.html"), html);
    console.log("📄 Saved preview to newsletter_approval_preview.html");

    if (isMaillayerConfigured()) {
        console.log("📧 Using Maillayer...");
        const result = await sendMaillayerRawEmail({
            to: userEmail,
            subject,
            html: html,
        });
        if (result.success) {
            console.log("✅ Sent via Maillayer!");
        } else {
            console.error("❌ Maillayer failed:", result.error);
        }
    } else {
        console.log("📧 Using Resend...");
        const { client, fromEmail } = await getUncachableResendClient();
        const result = await client.emails.send({
            from: fromEmail,
            to: userEmail,
            subject,
            html: html,
        });
        console.log("✅ Sent via Resend!", result.data?.id);
    }
}

sendTestNewsletter().catch(console.error);
