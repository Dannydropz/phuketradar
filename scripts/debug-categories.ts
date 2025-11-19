
import { storage } from "../server/storage";
import { CATEGORY_TO_DB, resolveDbCategories } from "../shared/category-map";

async function main() {
    console.log("🔍 Debugging Category Mapping...");

    try {
        // 1. Get actual categories from DB
        const allArticles = await storage.getAllArticles();
        const dbCategories = new Set<string>();
        const categoryCounts: Record<string, number> = {};

        allArticles.forEach(a => {
            if (a.category) {
                dbCategories.add(a.category);
                categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
            }
        });

        console.log("\n📊 Actual Categories in DB:");
        Object.entries(categoryCounts).forEach(([cat, count]) => {
            console.log(`   - "${cat}": ${count} articles`);
        });

        console.log("\n🗺️  Frontend to DB Mapping Check:");
        const frontendCategories = Object.keys(CATEGORY_TO_DB);

        for (const feCat of frontendCategories) {
            const mappedDbCats = resolveDbCategories(feCat);
            console.log(`\n   Frontend: "${feCat}" maps to: ${JSON.stringify(mappedDbCats)}`);

            // Check coverage
            const covered = mappedDbCats.filter(c => dbCategories.has(c));
            const missing = mappedDbCats.filter(c => !dbCategories.has(c));

            if (covered.length > 0) {
                console.log(`     ✅ Matches found in DB: ${JSON.stringify(covered)}`);
            } else {
                console.log(`     ❌ NO matches found in DB!`);
            }
        }

        // Check for unmapped DB categories
        console.log("\n⚠️  Unmapped DB Categories:");
        const allMapped = new Set(Object.values(CATEGORY_TO_DB).flat());
        const unmapped = Array.from(dbCategories).filter(c => !allMapped.has(c));

        if (unmapped.length > 0) {
            unmapped.forEach(c => {
                console.log(`   - "${c}" (Count: ${categoryCounts[c]}) is NOT mapped to any frontend category!`);
            });
        } else {
            console.log("   ✅ All DB categories are mapped.");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
    process.exit(0);
}

main();
