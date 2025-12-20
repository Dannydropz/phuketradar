import { useState, useEffect } from "react";
import logoImage from "@assets/PhuketRadar_1759933943849.png";

interface ArticleImageProps {
  src?: string;
  alt: string;
  className?: string;
  category?: string;
  testId?: string;
  priority?: boolean;
}

// Category-based placeholder colors for when images fail to load
const getCategoryPlaceholder = (category?: string) => {
  if (!category) return "bg-muted";

  const categoryLower = category.toLowerCase();

  switch (categoryLower) {
    case "breaking":
      return "bg-red-50 dark:bg-red-950/20";
    case "tourism":
      return "bg-blue-50 dark:bg-blue-950/20";
    case "business":
      return "bg-green-50 dark:bg-green-950/20";
    case "events":
      return "bg-orange-50 dark:bg-orange-950/20";
    default:
      return "bg-muted";
  }
};

// Helper to optimize Cloudinary URLs with responsive sizing
const optimizeCloudinaryUrl = (url: string, width?: number) => {
  if (!url.includes("res.cloudinary.com")) return url;

  // If it already has transformation parameters, don't add more
  if (url.includes("/f_auto") || url.includes("/q_auto")) return url;

  // Build transformation string
  const transforms = ["f_auto", "q_auto"];
  if (width) {
    transforms.push(`w_${width}`);
  }

  // Insert transformations after /upload/
  return url.replace("/upload/", `/upload/${transforms.join(",")}/`);
};

export function ArticleImage({ src, alt, className = "", category, testId, priority }: ArticleImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(!priority);

  // Preload priority images by injecting a link tag
  useEffect(() => {
    if (priority && src) {
      const optimizedSrc = optimizeCloudinaryUrl(src, 800); // Hero images typically 800px wide

      // Check if preload already exists
      const existingPreload = document.querySelector(`link[href="${optimizedSrc}"]`);
      if (existingPreload) return;

      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'image';
      preloadLink.href = optimizedSrc;
      preloadLink.setAttribute('fetchpriority', 'high');
      document.head.appendChild(preloadLink);

      return () => {
        // Cleanup on unmount
        preloadLink.remove();
      };
    }
  }, [priority, src]);

  // For hero images, use a smaller optimized version
  const optimizedSrc = src ? optimizeCloudinaryUrl(src, priority ? 800 : 400) : src;

  // If no src provided or image failed to load, show placeholder
  if (!src || imageError) {
    return (
      <div
        className={`${className} ${getCategoryPlaceholder(category)} flex items-center justify-center`}
        data-testid={testId}
      >
        <img
          src={logoImage}
          alt="Phuket Radar"
          className="w-1/2 h-auto opacity-30"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <>
      {isLoading && !priority && (
        <div
          className={`${className} ${getCategoryPlaceholder(category)} flex items-center justify-center absolute inset-0 z-0`}
        >
          <img
            src={logoImage}
            alt="Phuket Radar"
            className="w-1/2 h-auto opacity-30"
            loading="lazy"
          />
        </div>
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        className={`${className} ${isLoading && !priority ? 'invisible' : 'visible'}`}
        decoding={priority ? "sync" : "async"}
        loading={priority ? "eager" : "lazy"}
        {...(priority ? { "fetchpriority": "high" } as any : {})}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        onLoad={() => setIsLoading(false)}
        data-testid={testId}
      />
    </>
  );
}

