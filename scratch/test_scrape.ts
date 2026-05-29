import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { runScheduledScrape } from "../server/scheduler";

async function run() {
  console.log("Starting local test scrape...");
  await runScheduledScrape();
  console.log("Done.");
  process.exit(0);
}

run();
