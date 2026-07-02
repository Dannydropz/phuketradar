import "dotenv/config";
import path from "path";

import { runScheduledScrape } from "../server/scheduler";

async function run() {
  console.log("Starting local test scrape...");
  await runScheduledScrape();
  console.log("Done.");
  process.exit(0);
}

run();
