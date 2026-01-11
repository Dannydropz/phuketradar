/**
 * Fix the Publer workflow to use state: 'publish' instead of state: 'scheduled'
 * This ensures posts are immediately published instead of going to drafts
 */
import 'dotenv/config';

const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://n8n.optimisr.com';
const WORKFLOW_ID = 'AshJPkP9yEyEKNzm';

if (!N8N_API_KEY) {
    console.log('N8N_API_KEY not found');
    process.exit(1);
}

console.log('N8N API Key found, length:', N8N_API_KEY.length);

async function updateWorkflow() {
    // Step 1: Get the current workflow
    console.log('\n1. Fetching current workflow...');
    const getRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY! }
    });

    if (!getRes.ok) {
        console.log('Failed to get workflow:', getRes.status, await getRes.text());
        return;
    }

    const workflow = await getRes.json();
    console.log('Workflow found:', workflow.name);

    // Step 2: Find the Post to Publer node and update the code
    const publerNode = workflow.nodes.find((n: any) => n.name === 'Post to Publer (All-in-One)');
    if (!publerNode) {
        console.log('Could not find Post to Publer node');
        return;
    }

    console.log('\n2. Found Post to Publer node');

    // Check current code
    const currentCode = publerNode.parameters.jsCode;
    const scheduledCount = (currentCode.match(/state: 'scheduled'/g) || []).length;
    console.log('Current "state: scheduled" count:', scheduledCount);

    if (scheduledCount === 0) {
        console.log('No state: scheduled found - already fixed!');
        return;
    }

    // Replace 'scheduled' with 'publish'
    const newCode = currentCode.replace(/state: 'scheduled'/g, "state: 'publish'");
    publerNode.parameters.jsCode = newCode;

    const publishCount = (newCode.match(/state: 'publish'/g) || []).length;
    console.log('New "state: publish" count:', publishCount);

    // Step 3: Update the workflow - only send allowed fields
    console.log('\n3. Updating workflow...');

    // N8N API only accepts specific fields - remove extra properties
    const updatePayload = {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings,
        staticData: workflow.staticData
    };

    const updateRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
        method: 'PUT',
        headers: {
            'X-N8N-API-KEY': N8N_API_KEY!,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
        console.log('Failed to update workflow:', updateRes.status, await updateRes.text());
        return;
    }

    const result = await updateRes.json();
    console.log('\n✅ Workflow updated successfully!');
    console.log('Workflow ID:', result.id);
    console.log('Active:', result.active);
    console.log('\nPosts will now be published immediately instead of going to drafts!');
}

updateWorkflow().catch(console.error);
