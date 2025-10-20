#!/usr/bin/env tsx

// Scheduled Scrape Script for Replit Scheduled Deployments
//
// This script is designed to run as a one-time task via Replit Scheduled Deployments.
// It makes a single HTTP request to the /api/cron/scrape endpoint and exits cleanly.
//
// IMPORTANT: This script must complete and exit. Do NOT start any servers or long-running processes.
//
// Usage: npm run scrape:cron
//
// Replit Scheduled Deployment Configuration:
// - Schedule: "0 */2 * * *" (every 2 hours)
// - Run command: npm run scrape:cron
// - Timeout: 120 seconds (adjust if needed)

import process from 'process';

const CRON_API_KEY = process.env.CRON_API_KEY;
const REPLIT_DEV_DOMAIN = process.env.REPLIT_DEV_DOMAIN;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Determine the base URL based on environment
const getBaseUrl = (): string => {
  if (NODE_ENV === 'production') {
    return 'https://phuketradar.com';
  }
  
  if (REPLIT_DEV_DOMAIN) {
    return `https://${REPLIT_DEV_DOMAIN}`;
  }
  
  // Fallback to localhost for local development
  return 'http://localhost:5000';
};

async function runScheduledScrape() {
  console.log('========================================');
  console.log('Scheduled Scrape Script Starting');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log('========================================');

  if (!CRON_API_KEY) {
    console.error('ERROR: CRON_API_KEY environment variable is not set');
    process.exit(1);
  }

  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/api/cron/scrape`;

  console.log(`Making request to: ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(120000), // 120 second timeout
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', errorText);
      process.exit(1);
    }

    const result = await response.json();
    console.log('Scrape completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    console.log('========================================');
    console.log('Scheduled Scrape Script Completed');
    console.log(`Finished at: ${new Date().toISOString()}`);
    console.log('========================================');
    
    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error('ERROR: Failed to execute scheduled scrape');
    
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      if (error.name === 'AbortError') {
        console.error('Request timed out after 120 seconds');
      }
    } else {
      console.error('Unknown error:', error);
    }
    
    process.exit(1);
  }
}

// Run the scrape
runScheduledScrape();
