import "dotenv/config";
import fs from "fs";
import path from "path";

const N8N_BASE_URL = process.env.N8N_BASE_URL || "https://n8n.phuketradar.com";
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
    console.error("❌ N8N_API_KEY not found in .env file");
    process.exit(1);
}

async function createWorkflow(workflowData: any) {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-N8N-API-KEY": N8N_API_KEY,
        },
        body: JSON.stringify(workflowData),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create workflow: ${response.status} - ${error}`);
    }

    return await response.json();
}

async function createCredential() {
    const credentialData = {
        name: "Railway Admin Auth",
        type: "httpHeaderAuth",
        data: {
            name: "Authorization",
            value: `Bearer ${process.env.CRON_API_KEY}`,
        },
    };

    const response = await fetch(`${N8N_BASE_URL}/api/v1/credentials`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-N8N-API-KEY": N8N_API_KEY,
        },
        body: JSON.stringify(credentialData),
    });

    if (!response.ok) {
        const error = await response.text();
        console.warn(`Note: Credential creation returned ${response.status}. It may already exist.`);
        return null;
    }

    return await response.json();
}

async function main() {
    console.log("🚀 Setting up N8N workflows for Smart Learning System...\n");

    try {
        // Step 1: Create credential
        console.log("1️⃣ Creating Railway Admin Auth credential...");
        const credential = await createCredential();
        if (credential) {
            console.log(`✅ Credential created: ${credential.name} (ID: ${credential.id})\n`);
        } else {
            console.log("ℹ️  Using existing credential\n");
        }

        // Step 2: Load workflow files
        console.log("2️⃣ Loading workflow configurations...");
        const dailySyncPath = path.join(process.cwd(), "docs", "n8n-daily-analytics-sync.json");
        const fbSyncPath = path.join(process.cwd(), "docs", "n8n-facebook-sync.json");

        const dailySyncWorkflow = JSON.parse(fs.readFileSync(dailySyncPath, "utf8"));
        const fbSyncWorkflow = JSON.parse(fs.readFileSync(fbSyncPath, "utf8"));

        // Step 3: Create Daily Analytics Sync workflow
        console.log("3️⃣ Creating Daily Analytics Sync workflow...");
        const dailyWorkflow = await createWorkflow(dailySyncWorkflow);
        console.log(`✅ Workflow created: ${dailyWorkflow.name} (ID: ${dailyWorkflow.id})\n`);

        // Step 4: Create Facebook Insights Sync workflow
        console.log("4️⃣ Creating Facebook Insights Sync workflow...");
        const fbWorkflow = await createWorkflow(fbSyncWorkflow);
        console.log(`✅ Workflow created: ${fbWorkflow.name} (ID: ${fbWorkflow.id})\n`);

        console.log("🎉 Setup complete!\n");
        console.log("Next steps:");
        console.log("1. Go to your N8N instance: " + N8N_BASE_URL);
        console.log("2. Open each workflow and verify the credentials are set");
        console.log("3. Test each workflow manually (Execute Workflow button)");
        console.log("4. Activate the workflows (toggle Active switch)");
        console.log("\nWorkflows:");
        console.log(`- Daily Analytics Sync: ${N8N_BASE_URL}/workflow/${dailyWorkflow.id}`);
        console.log(`- Facebook Insights Sync: ${N8N_BASE_URL}/workflow/${fbWorkflow.id}`);

    } catch (error) {
        console.error("❌ Setup failed:", error);
        process.exit(1);
    }
}

main();
