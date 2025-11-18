#!/usr/bin/env tsx

// Scheduled Enrichment Script for GitHub Actions
//
// This script runs every 15 minutes to enrich developing stories with new context and updates.
// It makes a single HTTP request to the /api/cron/enrich endpoint and exits cleanly.
//
// IMPORTANT: This script must complete and exit. Do NOT start any servers or long-running processes.
//
// Usage: npm run enrich:cron
//
// GitHub Actions Configuration:
// - Schedule: "*/15 * * * *" (every 15 minutes)
// - Run command: npx tsx scripts/scheduled-enrichment.ts
// - Timeout: 10 minutes

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

async function runScheduledEnrichment() {
  console.log('========================================');
  console.log('Scheduled Enrichment Script Starting');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log('========================================');

  if (!CRON_API_KEY) {
    console.error('ERROR: CRON_API_KEY environment variable is not set');
    process.exit(1);
  }

  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/api/cron/enrich`;

  console.log(`Making request to: ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging (10 minutes)
      signal: AbortSignal.timeout(600000),
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', errorText);
      process.exit(1);
    }

    const result = await response.json();
    console.log('Enrichment completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    console.log('========================================');
    console.log('Scheduled Enrichment Script Completed');
    console.log(`Finished at: ${new Date().toISOString()}`);
    console.log('========================================');
    
    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error('ERROR: Failed to execute scheduled enrichment');
    
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      if (error.name === 'AbortError') {
        console.error('Request timed out after 600 seconds');
      }
    } else {
      console.error('Unknown error:', error);
    }
    
    process.exit(1);
  }
}

// Run the enrichment
runScheduledEnrichment();
