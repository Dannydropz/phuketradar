#!/usr/bin/env tsx

/**
 * Deploy Scheduled Scrape & Enrichment Workflows to N8N
 * 
 * This script deploys the scheduled tasks workflows to replace unreliable GitHub Actions.
 * 
 * Setup:
 * 1. Ensure N8N_API_KEY is in .env
 * 2. Ensure CRON_API_KEY is in .env (for the auth credential)
 * 3. Run: tsx scripts/deploy-scheduled-workflows.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config();

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.phuketradar.com/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;
const CRON_API_KEY = process.env.CRON_API_KEY;

if (!N8N_API_KEY) {
    console.error('❌ Error: N8N_API_KEY environment variable not set');
    console.error('Get your API key from: N8N Settings > API');
    process.exit(1);
}

if (!CRON_API_KEY) {
    console.error('❌ Error: CRON_API_KEY environment variable not set');
    console.error('This is needed to create the authentication credential');
    process.exit(1);
}

interface N8NWorkflow {
    id?: string;
    name: string;
    nodes: any[];
    connections: any;
    active?: boolean;
    settings?: any;
    staticData?: any;
}

interface N8NCredential {
    id?: string;
    name: string;
    type: string;
    data: any;
}

/**
 * Make an authenticated request to the N8N API
 */
async function n8nRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
): Promise<any> {
    const url = `${N8N_BASE_URL}${endpoint}`;

    console.log(`🔗 ${method} ${url}`);

    const response = await fetch(url, {
        method,
        headers: {
            'X-N8N-API-KEY': N8N_API_KEY!,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`N8N API error (${response.status}): ${errorText}`);
    }

    return response.json();
}

/**
 * List all credentials
 */
async function listCredentials(): Promise<any[]> {
    const response = await n8nRequest('/credentials');
    return response.data || [];
}

/**
 * Create a credential
 */
async function createCredential(credential: N8NCredential): Promise<any> {
    return await n8nRequest('/credentials', 'POST', credential);
}

/**
 * List all workflows in N8N
 */
async function listWorkflows(): Promise<any[]> {
    const response = await n8nRequest('/workflows');
    return response.data || [];
}

/**
 * Create a new workflow in N8N
 */
async function createWorkflow(workflow: N8NWorkflow): Promise<any> {
    return await n8nRequest('/workflows', 'POST', workflow);
}

/**
 * Update an existing workflow
 */
async function updateWorkflow(workflowId: string, workflow: N8NWorkflow): Promise<any> {
    return await n8nRequest(`/workflows/${workflowId}`, 'PUT', workflow);
}

/**
 * Activate a workflow
 */
async function activateWorkflow(workflowId: string): Promise<any> {
    return await n8nRequest(`/workflows/${workflowId}/activate`, 'POST');
}

/**
 * Execute/test a workflow
 */
async function executeWorkflow(workflowId: string): Promise<any> {
    return await n8nRequest(`/workflows/${workflowId}/execute`, 'POST', {});
}

/**
 * Load a workflow JSON from file
 */
function loadWorkflowFromFile(filename: string): N8NWorkflow {
    const workflowPath = path.join(__dirname, '../n8n-workflows', filename);

    if (!fs.existsSync(workflowPath)) {
        throw new Error(`Workflow file not found: ${workflowPath}`);
    }

    const workflowJson = fs.readFileSync(workflowPath, 'utf-8');
    return JSON.parse(workflowJson);
}

/**
 * Main deployment function
 */
async function deploy() {
    console.log('🚀 Deploying Scheduled Task Workflows to N8N');
    console.log('━'.repeat(80));
    console.log('');

    try {
        // Step 1: Create or find the CRON auth credential
        console.log('🔐 Setting up authentication credential...');
        const existingCredentials = await listCredentials();
        let cronCredential = existingCredentials.find((c: any) =>
            c.name === 'Phuket Radar CRON Auth' || c.name === 'Netcup Admin Auth'
        );

        if (!cronCredential) {
            console.log('   Creating new CRON auth credential...');
            cronCredential = await createCredential({
                name: 'Phuket Radar CRON Auth',
                type: 'httpHeaderAuth',
                data: {
                    name: 'Authorization',
                    value: `Bearer ${CRON_API_KEY}`
                }
            });
            console.log(`   ✅ Created credential: ${cronCredential.name} (ID: ${cronCredential.id})`);
        } else {
            console.log(`   ✅ Found existing credential: ${cronCredential.name} (ID: ${cronCredential.id})`);
        }
        console.log('');

        // Step 2: Get existing workflows
        console.log('🔍 Checking existing workflows...');
        const existingWorkflows = await listWorkflows();
        console.log(`   Found ${existingWorkflows.length} existing workflow(s)`);
        console.log('');

        // Workflows to deploy
        const workflowsToDeploy = [
            { file: 'scheduled-scrape.json', description: 'Scheduled Scrape (every 2 hours)' },
            { file: 'scheduled-enrichment.json', description: 'Scheduled Enrichment (every 15 minutes)' }
        ];

        const deployedWorkflows: any[] = [];

        for (const workflowConfig of workflowsToFollow) {
            console.log(`📄 Deploying: ${workflowConfig.description}`);

            // Load workflow
            const rawWorkflow = loadWorkflowFromFile(workflowConfig.file);

            // Update the credential reference in the workflow
            const workflow: N8NWorkflow = {
                name: rawWorkflow.name,
                nodes: rawWorkflow.nodes.map((node: any) => {
                    // If this node uses httpHeaderAuth, set the credential ID
                    if (node.credentials?.httpHeaderAuth) {
                        return {
                            ...node,
                            credentials: {
                                httpHeaderAuth: {
                                    id: cronCredential.id,
                                    name: cronCredential.name
                                }
                            }
                        };
                    }
                    return node;
                }),
                connections: rawWorkflow.connections,
                settings: rawWorkflow.settings || { executionOrder: 'v1' },
                staticData: rawWorkflow.staticData
            };

            // Check if workflow already exists
            const existingWorkflow = existingWorkflows.find((w: any) => w.name === workflow.name);

            let deployedWorkflow;
            if (existingWorkflow) {
                console.log(`   ⚠️  Workflow exists, updating...`);
                deployedWorkflow = await updateWorkflow(existingWorkflow.id, workflow);
                console.log(`   ✅ Updated: ${deployedWorkflow.id}`);
            } else {
                console.log(`   📤 Creating new workflow...`);
                deployedWorkflow = await createWorkflow(workflow);
                console.log(`   ✅ Created: ${deployedWorkflow.id}`);
            }

            // Activate the workflow
            if (!deployedWorkflow.active) {
                console.log(`   ⚡ Activating workflow...`);
                await activateWorkflow(deployedWorkflow.id);
                console.log(`   ✅ Activated`);
            } else {
                console.log(`   ℹ️  Already active`);
            }

            deployedWorkflows.push({
                ...deployedWorkflow,
                description: workflowConfig.description
            });

            console.log('');
        }

        // Summary
        console.log('━'.repeat(80));
        console.log('✅ DEPLOYMENT COMPLETE');
        console.log('━'.repeat(80));
        console.log('');
        console.log('📋 Deployed Workflows:');
        for (const wf of deployedWorkflows) {
            console.log(`   • ${wf.description}`);
            console.log(`     ID: ${wf.id}`);
            console.log(`     URL: ${N8N_BASE_URL.replace('/api/v1', '')}/workflow/${wf.id}`);
            console.log(`     Status: ${wf.active ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);
            console.log('');
        }

        console.log('🔐 Authentication Credential:');
        console.log(`   Name: ${cronCredential.name}`);
        console.log(`   ID: ${cronCredential.id}`);
        console.log('');

        console.log('📝 Next Steps:');
        console.log('   1. Verify N8N environment variable: PHUKETRADAR_BASE_URL=https://phuketradar.com');
        console.log('   2. Monitor executions in N8N dashboard');
        console.log('   3. Optionally disable GitHub Actions scheduled workflows');
        console.log('');
        console.log('🎉 N8N will now handle scheduled scraping (every 2 hours) and enrichment (every 15 minutes)!');

    } catch (error) {
        console.error('');
        console.error('━'.repeat(80));
        console.error('❌ DEPLOYMENT FAILED');
        console.error('━'.repeat(80));
        console.error('');

        if (error instanceof Error) {
            console.error('Error:', error.message);

            if (error.message.includes('401')) {
                console.error('');
                console.error('🔐 Authentication failed. Please check your N8N_API_KEY');
            } else if (error.message.includes('404')) {
                console.error('');
                console.error('🔗 N8N instance not found. Check N8N is running at:', N8N_BASE_URL);
            }
        } else {
            console.error('Unknown error:', error);
        }

        console.error('');
        process.exit(1);
    }
}

// Fix variable name typo and run
const workflowsToFollow = [
    { file: 'scheduled-scrape.json', description: 'Scheduled Scrape (every 2 hours)' },
    { file: 'scheduled-enrichment.json', description: 'Scheduled Enrichment (every 15 minutes)' }
];

deploy();
