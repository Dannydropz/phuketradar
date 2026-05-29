import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { storage } from "../server/storage";

async function run() {
  console.log("Fetching recent articles from DB...");
  const articles = await storage.getArticles(10, 0);
  console.log(`Found ${articles.length} articles.`);
  if (articles.length > 0) {
    console.log("Latest articles:");
    articles.slice(0, 5).forEach(a => {
      console.log(`- [${new Date(a.createdAt).toISOString()}] ${a.title}`);
    });
  }
  process.exit(0);
}

run();
