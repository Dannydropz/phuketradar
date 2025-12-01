#!/usr/bin/env tsx

/**
 * Deploy all N8N workflows from the n8n-workflows directory
 * 
 * This script deploys all workflow JSON files to your N8N instance
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.optimisr.com/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
    console.error('❌ Error: N8N_API_KEY environment variable not set');
    process.exit(1);
}

async function n8nRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: any): Promise<any> {
    const url = `${N8N_BASE_URL}${endpoint}`;

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

async function deployWorkflow(workflowPath: string) {
    const workflowName = path.basename(workflowPath, '.json');
    console.log(`\n📦 Deploying: ${workflowName}`);
    console.log('─'.repeat(60));

    try {
        // Load workflow
        const rawWorkflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

        const workflow = {
            name: rawWorkflow.name,
            nodes: rawWorkflow.nodes,
            connections: rawWorkflow.connections,
            settings: rawWorkflow.settings,
            staticData: rawWorkflow.staticData
        };

        // Check if exists
        const existingWorkflows = await n8nRequest('/workflows');
        const existing = (existingWorkflows.data || []).find((w: any) => w.name === workflow.name);

        if (existing) {
            console.log(`   ⚠️  Updating existing workflow (ID: ${existing.id})`);
            const updated = await n8nRequest(`/workflows/${existing.id}`, 'PUT', workflow);

            // Activate if not active
            if (!updated.active) {
                await n8nRequest(`/workflows/${existing.id}/activate`, 'POST');
                console.log(`   ✅ Updated and activated`);
            } else {
                console.log(`   ✅ Updated (already active)`);
            }

            return { success: true, id: updated.id, name: workflow.name, action: 'updated' };
        } else {
            console.log(`   📤 Creating new workflow`);
            const created = await n8nRequest('/workflows', 'POST', workflow);
            await n8nRequest(`/workflows/${created.id}/activate`, 'POST');
            console.log(`   ✅ Created and activated`);

            return { success: true, id: created.id, name: workflow.name, action: 'created' };
        }
    } catch (error) {
        console.error(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return { success: false, name: workflowName, error };
    }
}

async function main() {
    console.log('🚀 Deploying N8N Workflows');
    console.log('═'.repeat(60));

    const workflowsDir = path.join(__dirname, '../n8n-workflows');
    const files = fs.readdirSync(workflowsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(workflowsDir, f));

    console.log(`\n📁 Found ${files.length} workflow file(s)`);

    const results = [];
    for (const file of files) {
        const result = await deployWorkflow(file);
        results.push(result);
    }

    // Summary
    console.log('\n═'.repeat(60));
    console.log('📊 Deployment Summary');
    console.log('═'.repeat(60));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n✅ Successful: ${successful.length}`);
    successful.forEach(r => {
        console.log(`   • ${r.name} (${r.action})`);
    });

    if (failed.length > 0) {
        console.log(`\n❌ Failed: ${failed.length}`);
        failed.forEach(r => {
            console.log(`   • ${r.name}`);
        });
    }

    console.log(`\n🌐 View workflows: ${N8N_BASE_URL.replace('/api/v1', '')}/workflows`);
    console.log('\n🎉 Deployment complete!\n');
}

main();
