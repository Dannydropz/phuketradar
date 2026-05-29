import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { storage } from "../server/storage";

async function run() {
  console.log("Checking recently posted articles...");
  const articles = await storage.getAllArticles();
  
  const targets = articles.filter(a => 
    a.title.includes("Foreigners Caught Disturbing Traffic") || 
    a.title.includes("Man Accused of Sexual Harassment")
  );

  if (targets.length === 0) {
    console.log("No matching articles found.");
  } else {
    targets.forEach(a => {
      console.log(`\nTitle: ${a.title}`);
      console.log(`ID: ${a.id}`);
      console.log(`Facebook Post ID: ${a.facebookPostId}`);
      console.log(`Facebook Post URL: ${a.facebookPostUrl}`);
      console.log(`Is Published: ${a.isPublished}`);
      console.log(`Score: ${a.interestScore}`);
      console.log(`Created At: ${a.createdAt}`);
    });
  }
  process.exit(0);
}

run();
