/**
 * ScrapeCreators Multi-Image Test Script
 * 
 * Tests the updated ScrapeCreators API to verify:
 * 1. Multi-image support (carousel posts)
 * 2. Images array structure
 * 3. Comparison with previous single-image limitation
 */

const SCRAPECREATORS_API_KEY = process.env.SCRAPECREATORS_API_KEY;
const TEST_PAGE_URL = "https://www.facebook.com/PhuketTimeNews";
const API_URL = "https://api.scrapecreators.com/v1/facebook/profile/posts";

interface ScrapeCreatorsPost {
  id: string;
  text: string;
  url: string;
  permalink: string;
  created_time?: string;
  image?: string;
  images?: string[]; // NEW: Check if this array field exists
  attachments?: any;
  full_picture?: string;
}

interface ScrapeCreatorsResponse {
  success: boolean;
  posts: ScrapeCreatorsPost[];
  cursor?: string;
}

async function testScrapeCreatorsMultiImage() {
  console.log("🔍 Testing ScrapeCreators Multi-Image Support\n");
  console.log("=" .repeat(60));
  console.log(`Test Page: ${TEST_PAGE_URL}`);
  console.log("=" .repeat(60) + "\n");

  if (!SCRAPECREATORS_API_KEY) {
    console.error("❌ Error: SCRAPECREATORS_API_KEY not found in environment variables");
    console.error("Please add it to your Replit Secrets");
    process.exit(1);
  }

  try {
    console.log("📡 Calling ScrapeCreators API...\n");

    const response = await fetch(`${API_URL}?url=${encodeURIComponent(TEST_PAGE_URL)}`, {
      headers: {
        'x-api-key': SCRAPECREATORS_API_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.error("Response:", errorText);
      process.exit(1);
    }

    const data: ScrapeCreatorsResponse = await response.json();
    
    console.log("✅ API Response Received\n");
    console.log("=" .repeat(60));
    console.log(`Returned ${data.posts?.length || 0} posts`);
    console.log("=" .repeat(60) + "\n");

    if (!data.success || !data.posts || data.posts.length === 0) {
      console.log("⚠️  No posts returned from API");
      return;
    }

    // Analyze for multi-image support
    console.log("📊 MULTI-IMAGE ANALYSIS:\n");
    console.log("-" .repeat(60));

    let postsWithMultipleImages = 0;
    let postsWithImagesArray = 0;
    let totalImageCount = 0;

    const multiImageExamples: any[] = [];

    data.posts.forEach((post, index) => {
      let imageCount = 0;
      let hasImagesArray = false;

      // Check for 'images' array field (new format)
      if (post.images && Array.isArray(post.images)) {
        hasImagesArray = true;
        imageCount = post.images.length;
        postsWithImagesArray++;
      }

      // Check attachments for multiple images
      if (post.attachments?.data) {
        const attachmentImages = post.attachments.data.filter((att: any) => 
          att.media?.image || att.type === 'photo'
        );
        if (attachmentImages.length > imageCount) {
          imageCount = attachmentImages.length;
        }
      }

      totalImageCount += imageCount;

      if (imageCount > 1) {
        postsWithMultipleImages++;
        if (multiImageExamples.length < 3) {
          multiImageExamples.push({
            index,
            imageCount,
            hasImagesArray,
            post
          });
        }
      }
    });

    console.log(`Total posts analyzed: ${data.posts.length}`);
    console.log(`Posts with 'images' array field: ${postsWithImagesArray}`);
    console.log(`Posts with multiple images (>1): ${postsWithMultipleImages}`);
    console.log(`Average images per post: ${(totalImageCount / data.posts.length).toFixed(2)}`);
    console.log();

    // Show first post structure
    console.log("📋 FIRST POST STRUCTURE:");
    console.log("-" .repeat(60));
    const firstPost = data.posts[0];
    console.log("Available fields:", Object.keys(firstPost).join(', '));
    console.log();

    // Check for images field
    if (firstPost.images) {
      console.log("✅ 'images' field found!");
      console.log(`   Type: ${Array.isArray(firstPost.images) ? 'array' : typeof firstPost.images}`);
      if (Array.isArray(firstPost.images)) {
        console.log(`   Count: ${firstPost.images.length} images`);
      }
    } else {
      console.log("❌ 'images' field NOT found");
    }
    console.log();

    // Check for single image field
    if (firstPost.image) {
      console.log("✓ 'image' field (single): present");
    }
    console.log();

    // Show full first post
    console.log("📄 FULL FIRST POST DATA:");
    console.log("-" .repeat(60));
    console.log(JSON.stringify(firstPost, null, 2));
    console.log();

    // Show multi-image examples
    if (multiImageExamples.length > 0) {
      console.log("\n🖼️  MULTI-IMAGE POST EXAMPLES:");
      console.log("-" .repeat(60));
      
      multiImageExamples.forEach((example) => {
        console.log(`\nPost #${example.index + 1} - ${example.imageCount} images:`);
        console.log(`  Has 'images' array: ${example.hasImagesArray ? '✅ YES' : '❌ NO'}`);
        console.log(`  Text: ${example.post.text?.substring(0, 80)}...`);
        
        if (example.post.images && Array.isArray(example.post.images)) {
          console.log(`  Images array (${example.post.images.length}):`);
          example.post.images.forEach((img: string, idx: number) => {
            console.log(`    ${idx + 1}. ${img.substring(0, 60)}...`);
          });
        }
      });
    }

    // Final verdict
    console.log("\n" + "=" .repeat(60));
    console.log("🎯 MULTI-IMAGE SUPPORT VERDICT:");
    console.log("=" .repeat(60));

    if (postsWithImagesArray > 0) {
      console.log("✅ ScrapeCreators NOW SUPPORTS multi-image posts!");
      console.log(`   Found ${postsWithImagesArray}/${data.posts.length} posts with 'images' array`);
      console.log("   Multi-image carousel posts are properly captured!");
      console.log("\n   You can stick with ScrapeCreators at $3.38/month! 🎉");
    } else if (postsWithMultipleImages > 0) {
      console.log("⚠️  Multiple images detected in attachments, but no 'images' array");
      console.log("   Developer may be using different field structure");
      console.log("   Check the post structure above");
    } else {
      console.log("❌ No multi-image support detected");
      console.log("   Only single images found");
      console.log("   May need to follow up with developer");
    }
    console.log("=" .repeat(60));

  } catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testScrapeCreatorsMultiImage().catch(console.error);
