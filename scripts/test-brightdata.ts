/**
 * BrightData API Test Script
 * 
 * Tests BrightData's Facebook Posts scraper to verify:
 * 1. Multi-image support (carousel posts)
 * 2. Data structure and available fields
 * 3. Comparison with ScrapeCreators
 */

import dotenv from 'dotenv';
dotenv.config();

const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;
const TEST_PAGE_URL = "https://www.facebook.com/PhuketTimeNews";

// BrightData Facebook Posts API endpoint
// Dataset ID from their documentation: gd_lkaxegm826bjpoo9m5
const BRIGHTDATA_API_URL = "https://api.brightdata.com/datasets/v3/trigger";
const DATASET_ID = "gd_lkaxegm826bjpoo9m5"; // Facebook Posts dataset

async function testBrightData() {
  console.log("🔍 Testing BrightData Facebook Posts Scraper\n");
  console.log("=" .repeat(60));
  console.log(`Test Page: ${TEST_PAGE_URL}`);
  console.log(`Requesting: 10 recent posts`);
  console.log("=" .repeat(60) + "\n");

  if (!BRIGHTDATA_API_KEY) {
    console.error("❌ Error: BRIGHTDATA_API_KEY not found in environment variables");
    console.error("Please add it to your Replit Secrets");
    process.exit(1);
  }

  try {
    // Trigger the scraping job
    console.log("📡 Sending request to BrightData API...\n");
    
    const requestBody = [
      {
        url: TEST_PAGE_URL,
        num_of_posts: 10,
        start_date: "",
        end_date: ""
      }
    ];

    const triggerUrl = `${BRIGHTDATA_API_URL}?dataset_id=${DATASET_ID}&format=json`;
    
    console.log("Request URL:", triggerUrl);
    console.log("Request Body:", JSON.stringify(requestBody, null, 2));
    console.log();

    const response = await fetch(triggerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.error("Response:", errorText);
      process.exit(1);
    }

    const result = await response.json();
    
    console.log("✅ API Response Received\n");
    console.log("=" .repeat(60));
    console.log("FULL API RESPONSE:");
    console.log("=" .repeat(60));
    console.log(JSON.stringify(result, null, 2));
    console.log("\n" + "=" .repeat(60));
    
    // Analyze the response structure
    console.log("\n📊 RESPONSE ANALYSIS:\n");
    
    if (Array.isArray(result)) {
      console.log(`✓ Received ${result.length} posts\n`);
      
      if (result.length > 0) {
        const firstPost = result[0];
        console.log("📋 Available Fields in Response:");
        console.log("-" .repeat(60));
        Object.keys(firstPost).forEach(key => {
          const value = firstPost[key];
          const type = Array.isArray(value) ? 'array' : typeof value;
          console.log(`  • ${key}: ${type}`);
        });
        console.log();
        
        // Check for image-related fields
        console.log("🖼️  IMAGE FIELD ANALYSIS:");
        console.log("-" .repeat(60));
        
        const imageFields = Object.keys(firstPost).filter(key => 
          key.toLowerCase().includes('image') || 
          key.toLowerCase().includes('photo') ||
          key.toLowerCase().includes('media')
        );
        
        if (imageFields.length > 0) {
          imageFields.forEach(field => {
            const value = firstPost[field];
            console.log(`  • ${field}:`);
            console.log(`    Type: ${Array.isArray(value) ? 'array' : typeof value}`);
            if (Array.isArray(value)) {
              console.log(`    ✅ ARRAY DETECTED - Supports multiple images!`);
              console.log(`    Count: ${value.length} images`);
            } else if (value) {
              console.log(`    ⚠️  Single value only`);
            }
            console.log();
          });
        } else {
          console.log("  ⚠️  No image-related fields found");
        }
        
        // Show first post example
        console.log("\n📄 FIRST POST EXAMPLE:");
        console.log("-" .repeat(60));
        console.log(JSON.stringify(result[0], null, 2));
        console.log();
        
        // Multi-image verdict
        console.log("\n" + "=" .repeat(60));
        console.log("🎯 MULTI-IMAGE SUPPORT VERDICT:");
        console.log("=" .repeat(60));
        
        const hasArrayImages = imageFields.some(field => 
          Array.isArray(firstPost[field])
        );
        
        if (hasArrayImages) {
          console.log("✅ BrightData SUPPORTS multi-image carousel posts!");
          console.log("   All images from carousel posts are captured.");
        } else {
          console.log("❌ BrightData appears to return single images only.");
          console.log("   Similar limitation to ScrapeCreators.");
        }
        console.log("=" .repeat(60));
        
      }
    } else if (result.snapshot_id) {
      console.log("⏳ Job submitted successfully!");
      console.log(`Snapshot ID: ${result.snapshot_id}`);
      console.log("\nNote: BrightData uses async processing.");
      console.log("You may need to poll for results using the snapshot_id.");
      console.log("\nCheck their documentation for the polling endpoint:");
      console.log("https://docs.brightdata.com/scraping-automation/web-scraper-api/overview");
    }
    
  } catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testBrightData().catch(console.error);
