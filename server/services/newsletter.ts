
import { storage } from "../storage";
import { buildArticleUrl } from "@shared/category-map";
import { isMaillayerConfigured, sendMaillayerRawEmail } from "../lib/maillayer-client";
import { getUncachableResendClient } from "../lib/resend-client";
import fs from "fs";
import path from "path";
import { format } from "date-fns";
import { type Article } from "@shared/schema";

const SITE_URL = 'https://phuketradar.com';

export interface NewsletterArticle {
  title: string;
  excerpt: string;
  category: string;
  imageUrl: string | null;
  slug: string | null;
  id: string;
  publishedAt: Date | string;
  engagementScore?: number;
  interestScore?: number;
}

export async function generateDailyNewsletterHTML(): Promise<string | null> {
  console.log("🚀 Generating daily newsletter HTML...");

  // 1. Fetch top stories from last 24 hours
  const hoursAgo = 24;
  const articles = await storage.getPublishedArticles(100, 0);
  const twentyFourHoursAgo = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  const recentArticles = articles.filter(a => new Date(a.publishedAt) >= twentyFourHoursAgo);

  if (recentArticles.length === 0) {
    console.log("⚠️ No articles found in the last 24 hours. Using recent published articles instead.");
    recentArticles.push(...articles.slice(0, 10));
  }

  if (recentArticles.length === 0) return null;

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
  if (!fs.existsSync(templatePath)) {
    console.error("❌ Newsletter template not found at", templatePath);
    return null;
  }
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
  const topStoryPath = buildArticleUrl({ category: topStory.category, slug: topStory.slug, id: topStory.id });
  html = html.replace(/{{TOP_STORY_URL}}/g, `${SITE_URL}${topStoryPath}`);
  html = html.replace(/{{TOP_STORY_IMAGE}}/g, topStory.imageUrl || 'https://phuketradar.com/assets/placeholder.png');
  html = html.replace(/{{TOP_STORY_TITLE}}/g, topStory.title);
  html = html.replace(/{{TOP_STORY_CATEGORY}}/g, topStory.category.toUpperCase());
  html = html.replace(/{{TOP_STORY_EXCERPT}}/g, topStory.excerpt);

  // Trending Stories
  trendingStories.forEach((s, i) => {
    const idx = i + 1;
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

  return html;
}

export async function processDailyNewsletterSession() {
  console.log("📨 Starting daily newsletter dispatch session...");

  const html = await generateDailyNewsletterHTML();
  if (!html) {
    console.log("⏭️ No newsletter generated (no articles).");
    return;
  }

  const subscribers = await storage.getAllActiveSubscribers();
  console.log(`👥 Found ${subscribers.length} active subscribers.`);

  const subject = `Phuket Radar - ${format(new Date(), 'EEEE, MMMM d, yyyy')}`;

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    try {
      // Replace unsubscribe link for each user
      const personalHtml = html.replace('{{UNSUBSCRIBE_URL}}', `${SITE_URL}/api/unsubscribe/${sub.unsubscribeToken || 'default'}`);

      let success = false;
      if (isMaillayerConfigured()) {
        const result = await sendMaillayerRawEmail({
          to: sub.email,
          subject,
          html: personalHtml
        });
        success = result.success;
      } else {
        const { client, fromEmail } = await getUncachableResendClient();
        const result = await client.emails.send({
          from: fromEmail,
          to: sub.email,
          subject,
          html: personalHtml
        });
        success = !!result.data?.id;
      }

      if (success) {
        sent++;
        console.log(`✅ Sent to ${sub.email}`);
      } else {
        failed++;
        console.log(`❌ Failed for ${sub.email}`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      failed++;
      console.error(`❌ Error sending to ${sub.email}:`, err);
    }
  }

  console.log(`🏁 Dispatch complete. Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed };
}
