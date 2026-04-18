export const CATEGORY_TO_DB = {
  local: ["Breaking", "Info", "Other", "Events", "Local", "other", "breaking", "info", "events", "local"],
  tourism: ["Tourism", "tourism"],
  economy: ["Economy", "Business", "economy", "business"],
  business: ["Business", "Economy", "business", "economy"],
  weather: ["Weather", "weather"],
  crime: ["Crime", "Breaking", "crime", "breaking"],
  politics: ["Politics", "Breaking", "politics", "breaking"],
  traffic: ["Traffic", "Breaking", "traffic", "breaking"],
  national: ["National", "national"],
} as const;

export const DB_TO_CATEGORY: Record<string, string> = {
  "breaking": "breaking",
  "info": "local",
  "other": "local",
  "events": "local",
  "tourism": "tourism",
  "business": "business",
  "economy": "economy",
  "weather": "weather",
  "crime": "crime",
  "politics": "politics",
  "traffic": "traffic",
  "national": "national",
};

export type FrontendCategory = keyof typeof CATEGORY_TO_DB;
export type DatabaseCategory = typeof CATEGORY_TO_DB[FrontendCategory][number] | string;

export const VALID_CATEGORIES: readonly FrontendCategory[] = [
  "crime",
  "local",
  "tourism",
  "politics",
  "economy",
  "business",
  "traffic",
  "weather",
  "national",
] as const;

export function resolveDbCategories(frontendCategory: string | null | undefined): readonly string[] {
  if (!frontendCategory) return [];
  const categoryLower = frontendCategory.toLowerCase() as FrontendCategory;
  const dbCats = CATEGORY_TO_DB[categoryLower];
  
  if (dbCats) return dbCats;

  // Fallback for case-insensitive matching if the cast fails
  const key = Object.keys(CATEGORY_TO_DB).find(k => k.toLowerCase() === frontendCategory.toLowerCase());
  return key ? CATEGORY_TO_DB[key as FrontendCategory] : [];
}

export function resolveFrontendCategory(dbCategory: string | null | undefined): string {
  if (!dbCategory) return "local";
  const categoryLower = dbCategory.toLowerCase();
  
  // High priority mappings first
  if (DB_TO_CATEGORY[categoryLower]) {
    return DB_TO_CATEGORY[categoryLower];
  }

  // Fallback to lowercase db category
  return categoryLower;
}

export function buildArticleUrl(article: { category: string; slug: string | null; id: string }): string {
  const frontendCategory = resolveFrontendCategory(article.category);
  const slug = article.slug || article.id;
  
  // Safety check: ensure we don't return an empty or invalid category in the path
  const finalCategory = frontendCategory || "local";
  
  return `/${finalCategory}/${slug}`;
}

export function isValidCategory(category: string): category is FrontendCategory {
  const categoryLower = category.toLowerCase();
  return VALID_CATEGORIES.includes(categoryLower as FrontendCategory);
}
