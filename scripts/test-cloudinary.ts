#!/usr/bin/env tsx

/**
 * Test Cloudinary connection and credentials
 */

import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testCloudinary() {
    console.log("🔍 Testing Cloudinary configuration...\n");

    // Check if credentials are set
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
        console.error("❌ CLOUDINARY_CLOUD_NAME not set");
        process.exit(1);
    }
    if (!process.env.CLOUDINARY_API_KEY) {
        console.error("❌ CLOUDINARY_API_KEY not set");
        process.exit(1);
    }
    if (!process.env.CLOUDINARY_API_SECRET) {
        console.error("❌ CLOUDINARY_API_SECRET not set");
        process.exit(1);
    }

    console.log("✅ Environment variables set:");
    console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`   API Key: ${process.env.CLOUDINARY_API_KEY}`);
    console.log(`   API Secret: ${process.env.CLOUDINARY_API_SECRET?.substring(0, 4)}...`);
    console.log();

    try {
        // Test API connection by fetching account usage
        console.log("📡 Testing API connection...");
        const result = await cloudinary.api.usage();

        console.log("✅ Cloudinary connection successful!");
        console.log(`   Plan: ${result.plan}`);
        console.log(`   Credits used: ${result.credits?.usage || 0} / ${result.credits?.limit || 'unlimited'}`);
        console.log(`   Resources: ${result.resources || 0}`);
        console.log();
        console.log("🎉 Cloudinary is ready to use!");

    } catch (error: any) {
        console.error("❌ Cloudinary connection failed:");
        console.error("Full error:", error);
        if (error.message) {
            console.error(`   Message: ${error.message}`);
        }
        if (error.http_code) {
            console.error(`   HTTP Code: ${error.http_code}`);
        }
        if (error.error) {
            console.error(`   Error details:`, error.error);
        }
        console.log();
        console.log("💡 Possible issues:");
        console.log("   - API Secret is incorrect");
        console.log("   - API Key is incorrect");
        console.log("   - Cloud Name is incorrect");
        console.log("   - Cloudinary account is suspended");
        process.exit(1);
    }
}

testCloudinary();
