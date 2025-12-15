/**
 * Get Publer Workspace and Account IDs
 * 
 * This script fetches your Publer workspace and connected social accounts.
 * You'll need these IDs to configure the N8N auto-posting workflow.
 * 
 * Usage:
 *   PUBLER_API_KEY=your_api_key npx tsx scripts/get-publer-accounts.ts
 */

const PUBLER_API_KEY = process.env.PUBLER_API_KEY;

if (!PUBLER_API_KEY) {
    console.error('❌ Missing PUBLER_API_KEY environment variable');
    console.error('');
    console.error('Usage:');
    console.error('  PUBLER_API_KEY=your_api_key npx tsx scripts/get-publer-accounts.ts');
    console.error('');
    console.error('Get your API key from: Publer → Settings → Access & Login → API Keys');
    process.exit(1);
}

interface Workspace {
    id: string;
    name: string;
}

interface Account {
    id: string;
    name: string;
    provider: string;
    type: string;
    picture?: string;
    status: string;
}

async function getWorkspaces(): Promise<Workspace[]> {
    const response = await fetch('https://app.publer.com/api/v1/workspaces', {
        headers: {
            'Authorization': `Bearer-API ${PUBLER_API_KEY}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch workspaces: ${response.status} ${await response.text()}`);
    }

    return response.json() as Promise<Workspace[]>;
}

async function getAccounts(workspaceId: string): Promise<Account[]> {
    const response = await fetch('https://app.publer.com/api/v1/accounts', {
        headers: {
            'Authorization': `Bearer-API ${PUBLER_API_KEY}`,
            'Publer-Workspace-Id': workspaceId,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.status} ${await response.text()}`);
    }

    return response.json() as Promise<Account[]>;
}

async function main() {
    console.log('🔍 Fetching Publer Workspaces and Accounts...\n');

    try {
        // Step 1: Get workspaces
        const workspaces = await getWorkspaces();

        if (workspaces.length === 0) {
            console.error('❌ No workspaces found in your Publer account');
            process.exit(1);
        }

        console.log('📁 WORKSPACES:');
        console.log('═'.repeat(60));
        workspaces.forEach((ws, i) => {
            console.log(`  ${i + 1}. ${ws.name}`);
            console.log(`     ID: ${ws.id}`);
        });
        console.log('');

        // Step 2: Get accounts for each workspace
        for (const workspace of workspaces) {
            console.log(`\n📱 ACCOUNTS in "${workspace.name}":`);
            console.log('─'.repeat(60));

            const accounts = await getAccounts(workspace.id);

            if (accounts.length === 0) {
                console.log('  No accounts connected to this workspace');
                continue;
            }

            // Group by provider
            const byProvider: Record<string, Account[]> = {};
            accounts.forEach(acc => {
                if (!byProvider[acc.provider]) {
                    byProvider[acc.provider] = [];
                }
                byProvider[acc.provider].push(acc);
            });

            Object.entries(byProvider).forEach(([provider, accs]) => {
                console.log(`\n  ${provider.toUpperCase()}:`);
                accs.forEach(acc => {
                    console.log(`    • ${acc.name} (${acc.type})`);
                    console.log(`      ID: ${acc.id}`);
                    console.log(`      Status: ${acc.status}`);
                });
            });
        }

        // Step 3: Print summary for N8N workflow
        console.log('\n');
        console.log('═'.repeat(60));
        console.log('📝 N8N ENVIRONMENT VARIABLES:');
        console.log('═'.repeat(60));
        console.log('Add these to your N8N instance:');
        console.log('');
        console.log(`PUBLER_API_KEY=${PUBLER_API_KEY.substring(0, 10)}...`);

        // Find the first workspace
        const primaryWorkspace = workspaces[0];
        console.log(`PUBLER_WORKSPACE_ID=${primaryWorkspace.id}`);

        // Get accounts from primary workspace
        const accounts = await getAccounts(primaryWorkspace.id);

        const instagram = accounts.find(a => a.provider === 'instagram');
        const threads = accounts.find(a => a.provider === 'threads');
        const facebook = accounts.find(a => a.provider === 'facebook');

        if (instagram) {
            console.log(`PUBLER_INSTAGRAM_ACCOUNT_ID=${instagram.id}`);
        }
        if (threads) {
            console.log(`PUBLER_THREADS_ACCOUNT_ID=${threads.id}`);
        }
        if (facebook) {
            console.log(`PUBLER_FACEBOOK_ACCOUNT_ID=${facebook.id}`);
        }

        console.log('');
        console.log('✅ Done! Use these values in your N8N workflow.');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
