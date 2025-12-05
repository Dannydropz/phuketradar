import { useState } from "react";
import logoImage from "@assets/PhuketRadar_1759933943849.png";

interface ArticleImageProps {
  src?: string;
  alt: string;
  className?: string;
  category?: string;
  testId?: string;
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

export function ArticleImage({ src, alt, className = "", category, testId }: ArticleImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
        />
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div
          className={`${className} ${getCategoryPlaceholder(category)} flex items-center justify-center`}
        >
          <img
            src={logoImage}
            alt="Phuket Radar"
            className="w-1/2 h-auto opacity-30"
          />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        decoding="async"
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
