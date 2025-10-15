/**
 * One-time migration to backfill slugs for existing articles
 * Run with: tsx server/migrations/backfill-slugs.ts
 */

import { db } from "../db";
import { articles } from "@shared/schema";
import { sql } from "drizzle-orm";
import { generateUniqueSlug } from "../lib/seo-utils";

async function backfillSlugs() {
  console.log("🔄 Starting slug backfill migration...");
  
  try {
    // Query all articles without slugs
    const articlesWithoutSlugs = await db
      .select()
      .from(articles)
      .where(sql`slug IS NULL OR slug = ''`);
    
    console.log(`📊 Found ${articlesWithoutSlugs.length} articles without slugs`);
    
    if (articlesWithoutSlugs.length === 0) {
      console.log("✅ No articles need slug generation");
      process.exit(0);
    }
    
    // Generate and update slugs
    let updated = 0;
    for (const article of articlesWithoutSlugs) {
      const slug = generateUniqueSlug(article.title, article.id);
      
      await db
        .update(articles)
        .set({ slug })
        .where(sql`id = ${article.id}`);
      
      console.log(`  ✓ ${article.title.substring(0, 50)}... -> ${slug}`);
      updated++;
    }
    
    console.log(`\n✅ Successfully updated ${updated} articles with slugs`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

backfillSlugs();
