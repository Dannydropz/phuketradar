import 'dotenv/config';

const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://n8n.optimisr.com';
const WORKFLOW_ID = 'AshJPkP9yEyEKNzm';

async function executeWorkflow() {
    console.log('🚀 Executing Instagram/Threads workflow...\n');

    const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}/run`, {
        method: 'POST',
        headers: {
            'X-N8N-API-KEY': N8N_API_KEY!,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });

    if (!res.ok) {
        console.log('Failed:', res.status, await res.text());
        return;
    }

    const result = await res.json();
    console.log('✅ Execution started!');
    console.log('Execution ID:', result.data?.executionId || result.executionId || JSON.stringify(result));
    console.log('\nCheck n8n or Instagram/Threads to see the post!');
}

executeWorkflow().catch(console.error);
