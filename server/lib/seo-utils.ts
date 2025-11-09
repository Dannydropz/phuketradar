/**
 * SEO Utilities
 * Functions for generating SEO-friendly URLs, meta tags, and structured data
 */
import { buildArticleUrl, resolveFrontendCategory } from "@shared/category-map";

/**
 * Generate a URL-safe slug from a title
 * Example: "Breaking News: Tourist Arrested" -> "breaking-news-tourist-arrested"
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/\-\-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Truncate to 100 characters max
    .substring(0, 100)
    // Remove trailing hyphen after truncation
    .replace(/-+$/, '');
}

/**
 * Generate a unique slug by appending ID if needed
 * Used to prevent slug collisions
 * Always returns a non-empty slug, even for titles with no Latin characters
 */
export function generateUniqueSlug(title: string, id: string): string {
  const baseSlug = generateSlug(title);
  // Take first 8 characters of UUID for uniqueness
  const uniqueSuffix = id.substring(0, 8);
  
  // If slug is empty or too short, use 'article' prefix
  if (!baseSlug || baseSlug.length < 3) {
    return `article-${uniqueSuffix}`;
  }
  
  // If slug is short, append suffix with hyphen
  if (baseSlug.length < 10) {
    return `${baseSlug}-${uniqueSuffix}`;
  }
  
  // Truncate to 90 chars to leave room for suffix
  const truncatedSlug = baseSlug.substring(0, 90);
  return `${truncatedSlug}-${uniqueSuffix}`;
}

/**
 * Generate meta description from article excerpt
 * Truncates to optimal length for SEO (150-160 characters)
 */
export function generateMetaDescription(excerpt: string): string {
  const maxLength = 160;
  if (excerpt.length <= maxLength) {
    return excerpt;
  }
  
  // Truncate at last complete word before maxLength
  const truncated = excerpt.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.substring(0, lastSpace) + '...';
}

/**
 * Generate NewsArticle structured data (Schema.org)
 */
export function generateNewsArticleSchema(article: {
  title: string;
  excerpt: string;
  content: string;
  author?: string;
  publishedAt: Date | string;
  imageUrl: string | null;
  category: string;
  slug: string;
  id: string;
}) {
  const publishDate = typeof article.publishedAt === 'string' 
    ? article.publishedAt 
    : article.publishedAt.toISOString();
  
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'https://phuketradar.com';
  
  const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
  
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "description": article.excerpt,
    "image": article.imageUrl || `${baseUrl}/og-default.jpg`,
    "datePublished": publishDate,
    "dateModified": publishDate,
    "author": {
      "@type": "Person",
      "name": article.author || "Phuket Radar Editorial Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Phuket Radar",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/logo.png`
      }
    },
    "articleSection": article.category,
    "url": `${baseUrl}${articlePath}`
  };
}

/**
 * Generate BreadcrumbList structured data (Schema.org)
 */
export function generateBreadcrumbSchema(article: {
  title: string;
  category: string;
  slug: string;
  id: string;
}) {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'https://phuketradar.com';
  
  const frontendCategory = resolveFrontendCategory(article.category);
  const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
  
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": frontendCategory,
        "item": `${baseUrl}/${frontendCategory}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.title,
        "item": `${baseUrl}${articlePath}`
      }
    ]
  };
}
