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
export async function generateDailyNewsletterHTML(): Promise<{ html: string; topStoryTitle: string; topStoryExcerpt: string } | null> {
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

  // Preheader — first sentence of top story excerpt, shown as gray text in inbox
  const excerpt = (topStory.excerpt || '').split('.')[0].trim();
  html = html.replace(/{{PREHEADER}}/g, excerpt);

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
  if (trendingStories.length > 0) {
    let trendingStoriesListHtml = '';
    trendingStories.forEach((s, i) => {
      const sPath = buildArticleUrl({ category: s.category, slug: s.slug, id: s.id });
      const isLast = i === trendingStories.length - 1;
      const borderStyle = isLast ? 'none' : '1px solid #191919';

      trendingStoriesListHtml += `
                            <!-- Story ${i + 1} -->
                            <table class="story-row" cellpadding="0" cellspacing="0" border="0" width="100%"
                                style="padding: 18px 0; border-bottom: ${borderStyle};">
                                <tr>
                                    <td width="88" valign="top" style="vertical-align: top;">
                                        <a href="${SITE_URL}${sPath}" style="display: block; text-decoration: none;">
                                            <img src="${s.imageUrl || 'https://phuketradar.com/assets/placeholder.png'}" alt="${s.title}" class="story-thumbnail"
                                                style="width: 88px; height: 66px; object-fit: cover; border-radius: 6px; display: block;">
                                        </a>
                                    </td>
                                    <td class="story-body" valign="top"
                                        style="padding-left: 16px; vertical-align: top;">
                                        <span class="story-cat"
                                            style="font-size: 10px; font-weight: 700; color: #22d3ee; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px;">
                                            ${s.category.toUpperCase()}
                                        </span>
                                        <p class="story-headline"
                                            style="font-size: 15px; font-weight: 600; color: #e8e8e8; margin: 0 0 5px; line-height: 1.4;">
                                            <a href="${SITE_URL}${sPath}"
                                                style="color: #e8e8e8; text-decoration: none;">${s.title}</a>
                                        </p>
                                        <p class="story-time" style="font-size: 11px; color: #505050; margin: 0;">
                                            ${getTimeString(s.publishedAt)}</p>
                                    </td>
                                </tr>
                            </table>`;
    });

    const trendingSectionHtml = `
                    <!-- ====== TRENDING SECTION HEADER ====== -->
                    <tr>
                        <td
                            style="height: 1px; background: linear-gradient(to right, transparent, #1f1f1f, transparent);">
                        </td>
                    </tr>
                    <tr>
                        <td class="section-header" bgcolor="#0f0f0f"
                            style="padding: 22px 28px 14px; background-color: #0f0f0f;">
                            <p class="section-label"
                                style="font-size: 10px; font-weight: 700; color: #22d3ee; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 3px;">
                                Also trending
                            </p>
                            <h2 class="section-title"
                                style="font-size: 18px; font-weight: 700; color: #fff; margin: 0; letter-spacing: -0.2px;">
                                More from Phuket
                            </h2>
                        </td>
                    </tr>

                    <!-- ====== TRENDING STORIES ====== -->
                    <tr>
                        <td class="stories-container" bgcolor="#0f0f0f"
                            style="padding: 0 28px 8px; background-color: #0f0f0f;">
                            ${trendingStoriesListHtml}
                        </td>
                    </tr>`;
    html = html.replace('{{TRENDING_SECTION}}', trendingSectionHtml);
  } else {
    html = html.replace('{{TRENDING_SECTION}}', '');
  }

  // Radar Stories
  if (radarStories.length > 0) {
    let radarStoriesHtml = `
                    <!-- ====== ON THE RADAR HEADER ====== -->
                    <tr>
                        <td class="section-header"
                            style="padding: 22px 28px 14px; background-color: #090909; border-top: 1px solid #1f1f1f;">
                            <p class="section-label"
                                style="font-size: 10px; font-weight: 700; color: #22d3ee; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 3px;">
                                Quick reads
                            </p>
                            <h2 class="section-title"
                                style="font-size: 18px; font-weight: 700; color: #fff; margin: 0; letter-spacing: -0.2px;">
                                On The Radar
                            </h2>
                        </td>
                    </tr>

                    <!-- ====== ON THE RADAR STORIES ====== -->
                    <tr>
                        <td class="radar-container" style="background-color: #090909; padding: 0 28px 24px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">`;

    radarStories.forEach((s, i) => {
      const sPath = buildArticleUrl({ category: s.category, slug: s.slug, id: s.id });
      const isLast = i === radarStories.length - 1;
      const borderStyle = isLast ? 'none' : '1px solid #141414';

      radarStoriesHtml += `
                                <tr>
                                    <td class="radar-row" style="padding: 12px 0; border-bottom: ${borderStyle};">
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td width="16" valign="top"
                                                    style="color: #22d3ee; font-size: 14px; padding-right: 10px;">→</td>
                                                <td>
                                                    <a href="${SITE_URL}${sPath}" class="radar-link"
                                                        style="font-size: 14px; font-weight: 500; color: #d4d4d4; text-decoration: none; line-height: 1.45; display: block;">
                                                        ${s.title}
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>`;
    });

    radarStoriesHtml += `
                            </table>
                        </td>
                    </tr>`;
    html = html.replace('{{RADAR_SECTION}}', radarStoriesHtml);
  } else {
    html = html.replace('{{RADAR_SECTION}}', '');
  }

  // Clean up remaining placeholders
  html = html.replace(/{{UNSUBSCRIBE_URL}}/g, `${SITE_URL}/unsubscribe`);

  const topStoryExcerpt = (topStory.excerpt || '').split('.')[0].trim();
  return { html, topStoryTitle: topStory.title, topStoryExcerpt };
}
