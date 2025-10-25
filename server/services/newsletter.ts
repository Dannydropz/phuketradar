import type { Article } from "@shared/schema";
import { format } from "date-fns";
import { getUncachableResendClient } from "../lib/resend-client";

const SITE_URL = process.env.REPLIT_DEPLOYMENT === '1' 
  ? 'https://phuketradar.com'
  : 'http://localhost:5000';

interface NewsletterArticle {
  title: string;
  excerpt: string;
  category: string;
  imageUrl: string | null;
  slug: string | null;
  id: string;
}

export function generateNewsletterHTML(articles: NewsletterArticle[], date: Date): string {
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  
  const articlesHTML = articles.map(article => {
    const articleUrl = article.slug 
      ? `${SITE_URL}/article/${article.slug}`
      : `${SITE_URL}/article/${article.id}`;
    
    const categoryColors: Record<string, string> = {
      'Breaking': '#ef4444',
      'Tourism': '#3b82f6',
      'Business': '#10b981',
      'Events': '#f59e0b',
      'Other': '#6b7280',
    };
    
    const categoryColor = categoryColors[article.category] || categoryColors['Other'];
    
    return `
      <tr>
        <td style="padding: 24px 0; border-bottom: 1px solid #e5e7eb;">
          ${article.imageUrl ? `
            <a href="${articleUrl}" style="display: block; margin-bottom: 16px;">
              <img src="${article.imageUrl}" alt="${article.title}" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px;" />
            </a>
          ` : ''}
          <div style="display: inline-block; background-color: ${categoryColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 12px;">
            ${article.category.toUpperCase()}
          </div>
          <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #111827;">
            <a href="${articleUrl}" style="color: #111827; text-decoration: none;">
              ${article.title}
            </a>
          </h2>
          <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #4b5563;">
            ${article.excerpt}
          </p>
          <a href="${articleUrl}" style="display: inline-block; color: #3b82f6; text-decoration: none; font-weight: 600; font-size: 14px;">
            Read more →
          </a>
        </td>
      </tr>
    `;
  }).join('');
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Phuket Radar - ${formattedDate}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">
                    Phuket Radar
                  </h1>
                  <p style="margin: 8px 0 0 0; color: #dbeafe; font-size: 14px; font-weight: 500;">
                    ${formattedDate}
                  </p>
                </td>
              </tr>
              
              <!-- Intro -->
              <tr>
                <td style="padding: 24px; background-color: #eff6ff;">
                  <p style="margin: 0; font-size: 16px; color: #1e40af; font-weight: 600; text-align: center;">
                    ☀️ Good morning! Here's what's happening in Phuket today.
                  </p>
                </td>
              </tr>
              
              <!-- Articles -->
              <tr>
                <td style="padding: 0 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${articlesHTML}
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 32px 24px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">
                    Read more stories at <a href="${SITE_URL}" style="color: #3b82f6; text-decoration: none; font-weight: 600;">phuketradar.com</a>
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    <a href="{{UNSUBSCRIBE_URL}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendNewsletter(
  to: string,
  articles: NewsletterArticle[],
  unsubscribeToken: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const date = new Date();
    const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
    
    let htmlContent = generateNewsletterHTML(articles, date);
    const unsubscribeUrl = `${SITE_URL}/api/unsubscribe/${unsubscribeToken}`;
    htmlContent = htmlContent.replace('{{UNSUBSCRIBE_URL}}', unsubscribeUrl);
    
    const result = await client.emails.send({
      from: fromEmail,
      to,
      subject: `Phuket Radar - ${formattedDate}`,
      html: htmlContent,
    });
    
    console.log(`✅ Newsletter sent to ${to}: ${result.data?.id}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send newsletter to ${to}:`, error);
    return false;
  }
}

export async function sendBulkNewsletter(
  subscribers: Array<{ email: string; unsubscribeToken: string }>,
  articles: NewsletterArticle[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  
  console.log(`📧 Sending newsletter to ${subscribers.length} subscribers...`);
  
  for (const subscriber of subscribers) {
    const success = await sendNewsletter(subscriber.email, articles, subscriber.unsubscribeToken);
    if (success) {
      sent++;
    } else {
      failed++;
    }
    
    // Rate limiting: wait 100ms between sends to avoid hitting Resend limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`📧 Newsletter campaign complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}
