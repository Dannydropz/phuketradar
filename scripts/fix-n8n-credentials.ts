import "dotenv/config";
import fetch from "node-fetch";

const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = "https://n8n.optimisr.com/api/v1";

const WORKFLOWS_TO_FIX = [
    "7T0qt6BcPvcKBM68", // Facebook Insights Sync
    "T0Fa34IwMiCxMsZP", // Daily Analytics Sync
];

const CORRECT_CREDENTIAL_NAME = "Header Auth account 2";

async function fixWorkflowCredentials(workflowId: string) {
    console.log(`\n📦 Fixing workflow: ${workflowId}`);

    // Get current workflow
    const getRes = await fetch(`${N8N_BASE_URL}/workflows/${workflowId}`, {
        headers: { "X-N8N-API-KEY": N8N_API_KEY! },
    });

    if (!getRes.ok) {
        console.error(`  ❌ Failed to get workflow: ${await getRes.text()}`);
        return;
    }

    const workflow = await getRes.json() as any;
    console.log(`  Workflow name: ${workflow.name}`);

    // Update credential references in nodes
    let updated = false;
    for (const node of workflow.nodes || []) {
        if (node.credentials?.httpHeaderAuth) {
            const oldCred = JSON.stringify(node.credentials.httpHeaderAuth);
            node.credentials.httpHeaderAuth = {
                name: CORRECT_CREDENTIAL_NAME,
            };
            console.log(`  ✏️  Updated node "${node.name}" credentials`);
            console.log(`     Old: ${oldCred}`);
            console.log(`     New: ${JSON.stringify(node.credentials.httpHeaderAuth)}`);
            updated = true;
        }
    }

    if (!updated) {
        console.log(`  ⚠️  No httpHeaderAuth credentials found to update`);
        return;
    }

    // Only include allowed fields for the update
    const updatePayload = {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings,
    };

    // Update workflow via API
    const updateRes = await fetch(`${N8N_BASE_URL}/workflows/${workflowId}`, {
        method: "PUT",
        headers: {
            "X-N8N-API-KEY": N8N_API_KEY!,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
    });

    if (!updateRes.ok) {
        console.error(`  ❌ Failed to update workflow: ${await updateRes.text()}`);
        return;
    }

    const result = await updateRes.json() as any;
    console.log(`  ✅ Workflow updated successfully!`);

    // Verify the update
    for (const node of result.nodes || []) {
        if (node.credentials?.httpHeaderAuth) {
            console.log(`  📋 Verified: "${node.name}" now has credential: ${JSON.stringify(node.credentials.httpHeaderAuth)}`);
        }
    }
}

async function main() {
    console.log("🔧 N8N Workflow Credential Fixer");
    console.log("================================\n");

    if (!N8N_API_KEY) {
        console.error("❌ N8N_API_KEY not found in environment");
        process.exit(1);
    }

    for (const workflowId of WORKFLOWS_TO_FIX) {
        await fixWorkflowCredentials(workflowId);
    }

    console.log("\n✅ Done! Check N8N to verify the changes.");
}

main().catch(console.error);
