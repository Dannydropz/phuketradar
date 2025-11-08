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

export type BreakingBadgeState = "red" | "grey" | "none";

export function getBreakingBadgeState(publishedAt: Date, interestScore: number | null | undefined): BreakingBadgeState {
  // Only high-interest stories (score >= 4) get breaking badge
  if ((interestScore ?? 0) < 4) {
    return "none";
  }
  
  const now = Date.now();
  const articleTime = new Date(publishedAt).getTime();
  const hoursSincePublished = (now - articleTime) / (1000 * 60 * 60);
  
  if (hoursSincePublished < 12) {
    return "red"; // 0-12 hours: red breaking badge
  } else if (hoursSincePublished < 24) {
    return "grey"; // 12-24 hours: grey breaking badge
  } else {
    return "none"; // 24+ hours: no breaking badge
  }
}
