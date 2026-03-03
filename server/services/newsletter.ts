/**
 * Newsletter Service
 *
 * Generates daily newsletter HTML from the latest articles.
 * Newsletters are sent via Beehiiv's own platform — this service
 * only handles HTML generation for preview/template purposes.
 *
 * Subscriber management: handled via Beehiiv API (see lib/beehiiv-client.ts)
 * Newsletter sending: done from Beehiiv dashboard
 */

import { storage } from "../storage";
import { buildArticleUrl } from "@shared/category-map";
import fs from "fs";
import path from "path";
import { format } from "date-fns";

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

/**
 * Generates the daily newsletter HTML from the top stories of the last 24 hours.
 * Used to produce a preview for copying into Beehiiv's editor.
 */
export async function generateDailyNewsletterHTML(): Promise<{ html: string; topStoryTitle: string } | null> {
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
  html = html.replace(/{{UNSUBSCRIBE_URL}}/g, `${SITE_URL}/unsubscribe`);

  return { html, topStoryTitle: topStory.title };
}
