export const CATEGORY_TO_DB = {
  local: ["Breaking", "Info", "Other", "Events"],
  tourism: ["Tourism"],
  economy: ["Business"],
  weather: ["Weather"],
  crime: ["Breaking"],
  politics: ["Breaking"],
  traffic: ["Breaking"],
} as const;

export const DB_TO_CATEGORY: Record<string, string> = {
  "breaking": "local",
  "info": "local",
  "other": "local",
  "events": "local",
  "tourism": "tourism",
  "business": "economy",
  "weather": "weather",
};

export type FrontendCategory = keyof typeof CATEGORY_TO_DB;
export type DatabaseCategory = typeof CATEGORY_TO_DB[FrontendCategory][number] | string;

export const VALID_CATEGORIES: readonly FrontendCategory[] = [
  "crime",
  "local",
  "tourism",
  "politics",
  "economy",
  "traffic",
  "weather",
] as const;

export function resolveDbCategories(frontendCategory: string): readonly string[] {
  const categoryLower = frontendCategory.toLowerCase() as FrontendCategory;
  return CATEGORY_TO_DB[categoryLower] || [];
}

export function resolveFrontendCategory(dbCategory: string): string {
  const categoryLower = dbCategory.toLowerCase();
  return DB_TO_CATEGORY[categoryLower] || dbCategory.toLowerCase();
}

export function buildArticleUrl(article: { category: string; slug: string | null; id: string }): string {
  const frontendCategory = resolveFrontendCategory(article.category);
  const slug = article.slug || article.id;
  return `/${frontendCategory}/${slug}`;
}

export function isValidCategory(category: string): category is FrontendCategory {
  return VALID_CATEGORIES.includes(category as FrontendCategory);
}
