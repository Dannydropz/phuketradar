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

export function getCategoryBadgeVariant(category: string): "destructive" | "default" | "outline" | "secondary" | "crime" | "warning" {
  const categoryLower = category.toLowerCase();
  
  // Crime gets darker red
  if (categoryLower === "crime") {
    return "crime";
  }
  
  // Traffic, Weather, Accidents get orange
  if (categoryLower === "traffic" || categoryLower === "weather" || categoryLower === "accidents") {
    return "warning";
  }
  
  // Politics, Business, Economy get blue/default
  if (categoryLower === "politics" || categoryLower === "business" || categoryLower === "economy") {
    return "default";
  }
  
  // Tourism gets outline
  if (categoryLower === "tourism") {
    return "outline";
  }
  
  // Local and others get secondary
  return "secondary";
}
