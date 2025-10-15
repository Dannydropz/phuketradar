import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  publishedTime?: string;
  author?: string;
}

export function SEO({
  title,
  description,
  image,
  url,
  type = "website",
  publishedTime,
  author,
}: SEOProps) {
  useEffect(() => {
    // Only run in browser context
    if (typeof document === 'undefined') return;

    // Update page title
    document.title = `${title} | Phuket Radar`;

    // Helper function to update or create meta tags
    const updateMetaTag = (property: string, content: string, isName = false) => {
      const attr = isName ? "name" : "property";
      let element = document.querySelector(`meta[${attr}="${property}"]`);
      
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, property);
        document.head.appendChild(element);
      }
      
      element.setAttribute("content", content);
    };

    // Update basic meta tags
    updateMetaTag("description", description, true);
    
    // Update Open Graph tags
    updateMetaTag("og:title", title);
    updateMetaTag("og:description", description);
    updateMetaTag("og:type", type);
    
    if (image) {
      updateMetaTag("og:image", image);
    }
    
    if (url) {
      updateMetaTag("og:url", url);
    }
    
    // Add article-specific OG tags
    if (type === "article" && publishedTime) {
      updateMetaTag("article:published_time", publishedTime);
    }
    
    if (type === "article" && author) {
      updateMetaTag("article:author", author);
    }
    
    // Update Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image", true);
    updateMetaTag("twitter:title", title, true);
    updateMetaTag("twitter:description", description, true);
    
    if (image) {
      updateMetaTag("twitter:image", image, true);
    }
    
    // Update canonical URL if provided
    if (url) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", url);
    }
  }, [title, description, image, url, type, publishedTime, author]);

  return null;
}
