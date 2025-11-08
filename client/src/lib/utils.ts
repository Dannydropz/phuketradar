import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function mapLegacyCategory(category: string): string {
  const categoryLower = category.toLowerCase();
  
  // Map old categories to new topic-based categories
  const legacyMap: Record<string, string> = {
    "breaking": "Crime",
    "info": "Local",
    "other": "Local",
    "events": "Local",
  };
  
  return legacyMap[categoryLower] || category;
}

export function getCategoryBadgeVariant(category: string): "destructive" | "default" | "outline" | "secondary" {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower === "crime" || categoryLower === "weather") {
    return "destructive";
  }
  
  if (categoryLower === "politics" || categoryLower === "business" || categoryLower === "economy") {
    return "default";
  }
  
  if (categoryLower === "tourism" || categoryLower === "traffic") {
    return "outline";
  }
  
  return "secondary";
}
