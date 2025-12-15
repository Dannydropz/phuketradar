#!/usr/bin/env tsx

/**
 * Deploy Phuket Radar Publer Auto-Poster (Instagram + Threads) to N8N
 * 
 * This script connects to your self-hosted N8N instance and deploys
 * the Instagram/Threads auto-posting workflow via the N8N REST API.
 * 
 * Setup:
 * 1. Get your N8N API key from: https://n8n.optimisr.com/settings/api
 * 2. Add to .env: N8N_API_KEY=your_api_key_here
 * 3. Run: npx tsx scripts/deploy-publer-workflow.ts
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

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.optimisr.com/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
    console.error('❌ Error: N8N_API_KEY environment variable not set');
    console.error('');
    console.error('To get your API key:');
    console.error('1. Go to: https://n8n.optimisr.com/settings/api');
    console.error('2. Create a new API key');
    console.error('3. Add to .env: N8N_API_KEY=your_api_key_here');
    console.error('4. Run this script again');
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

interface N8NWorkflowResponse {
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
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
 * List all workflows in N8N
 */
async function listWorkflows(): Promise<N8NWorkflowResponse[]> {
    const response = await n8nRequest('/workflows');
    return response.data || [];
}

/**
 * Create a new workflow in N8N
 */
async function createWorkflow(workflow: N8NWorkflow): Promise<N8NWorkflowResponse> {
    return await n8nRequest('/workflows', 'POST', workflow);
}

/**
 * Activate a workflow
 */
async function activateWorkflow(workflowId: string): Promise<N8NWorkflowResponse> {
    return await n8nRequest(`/workflows/${workflowId}/activate`, 'POST');
}

/**
 * Update an existing workflow
 */
async function updateWorkflow(workflowId: string, workflow: N8NWorkflow): Promise<N8NWorkflowResponse> {
    return await n8nRequest(`/workflows/${workflowId}`, 'PUT', workflow);
}

/**
 * Load the workflow JSON from file
 */
function loadWorkflowFromFile(): N8NWorkflow {
    const workflowPath = path.join(__dirname, '../n8n-workflows/publer-instagram-threads-autoposter.json');

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
    console.log('🚀 Deploying Phuket Radar Instagram & Threads Auto-Poster to N8N');
    console.log('━'.repeat(80));
    console.log('');

    try {
        // Load the workflow
        console.log('📄 Loading workflow from file...');
        const rawWorkflow = loadWorkflowFromFile();

        // Sanitize workflow for API (remove read-only fields)
        const workflow: N8NWorkflow = {
            name: rawWorkflow.name,
            nodes: rawWorkflow.nodes,
            connections: rawWorkflow.connections,
            settings: rawWorkflow.settings,
            staticData: rawWorkflow.staticData
        };

        console.log(`   ✅ Loaded workflow: "${workflow.name}"`);
        console.log(`   📊 Nodes: ${workflow.nodes.length}`);
        console.log('');

        // Check if workflow already exists
        console.log('🔍 Checking for existing workflows...');
        const existingWorkflows = await listWorkflows();
        console.log(`   Found ${existingWorkflows.length} existing workflow(s)`);

        const existingWorkflow = existingWorkflows.find(w => w.name === workflow.name);

        if (existingWorkflow) {
            console.log(`   ⚠️  Workflow "${workflow.name}" already exists (ID: ${existingWorkflow.id})`);
            console.log('');
            console.log('📝 Updating existing workflow...');
            const updated = await updateWorkflow(existingWorkflow.id, workflow);
            console.log(`   ✅ Workflow updated: ${updated.id}`);
            console.log('');

            // Activate if not already active
            if (!updated.active) {
                console.log('⚡ Activating workflow...');
                await activateWorkflow(updated.id);
                console.log('   ✅ Workflow activated');
            } else {
                console.log('   ℹ️  Workflow is already active');
            }

            printSuccessMessage(updated);

        } else {
            // Create new workflow
            console.log('');
            console.log('📤 Creating new workflow...');
            const created = await createWorkflow(workflow);
            console.log(`   ✅ Workflow created: ${created.id}`);
            console.log('');

            // Activate the workflow
            console.log('⚡ Activating workflow...');
            await activateWorkflow(created.id);
            console.log('   ✅ Workflow activated');
            console.log('');

            printSuccessMessage(created);
        }

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
                console.error('🔐 Authentication failed. Please check your N8N_API_KEY:');
                console.error('   1. Go to: https://n8n.optimisr.com/settings/api');
                console.error('   2. Create a new API key');
                console.error('   3. Update .env: N8N_API_KEY=your_new_key');
            } else if (error.message.includes('404')) {
                console.error('');
                console.error('🔗 N8N instance not found. Please check:');
                console.error('   1. N8N is running at: https://n8n.optimisr.com');
                console.error('   2. API is enabled in N8N settings');
            }
        } else {
            console.error('Unknown error:', error);
        }

        console.error('');
        process.exit(1);
    }
}

function printSuccessMessage(workflow: N8NWorkflowResponse) {
    console.log('');
    console.log('━'.repeat(80));
    console.log('✅ SUCCESS: Workflow deployed!');
    console.log('━'.repeat(80));
    console.log('');
    console.log(`🌐 View workflow: ${N8N_BASE_URL.replace('/api/v1', '')}/workflow/${workflow.id}`);
    console.log(`📊 Workflow ID: ${workflow.id}`);
    console.log(`📋 Workflow Name: ${workflow.name}`);
    console.log(`⚡ Status: ${workflow.active ? 'ACTIVE' : 'INACTIVE'}`);
    console.log('');
    console.log('📝 Required Environment Variables in N8N:');
    console.log('   PUBLER_API_KEY=e8bcee4e3d98779e9cde07c17c527eded20fe72151c9be0c');
    console.log('   PUBLER_WORKSPACE_ID=693f80c4702206b9560c6b76');
    console.log('   PUBLER_INSTAGRAM_ACCOUNT_ID=693f85f7b6fa709ab8fa5ec4');
    console.log('   PUBLER_THREADS_ACCOUNT_ID=693f86f67acbb31e7e4bad61');
    console.log('');
    console.log('📝 Also Required (should already be set):');
    console.log('   - PostgreSQL/Supabase credential configured');
    console.log('');
    console.log('🎉 Deployment complete!');
}

// Run deployment
deploy();
