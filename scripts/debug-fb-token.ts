import "dotenv/config";

async function debugToken() {
    const token = process.env.FB_PAGE_ACCESS_TOKEN;
    const appId = "1130638368434604"; // Your App ID from the screenshot/code
    const clientToken = process.env.FB_CLIENT_TOKEN; // Optional, but good if you have it. 
    // Actually, we can just call /me/permissions

    if (!token) {
        console.error("❌ No FB_PAGE_ACCESS_TOKEN found in .env");
        return;
    }

    console.log(`🔍 Debugging Token: ${token.substring(0, 10)}...`);

    try {
        // 1. Check Permissions
        console.log("\n1️⃣ Checking Token Permissions...");
        const permUrl = `https://graph.facebook.com/v19.0/me/permissions?access_token=${token}`;
        const permRes = await fetch(permUrl);
        const permData = await permRes.json();

        if (permData.error) {
            console.error("❌ Error checking permissions:", permData.error.message);
        } else {
            console.log("✅ Permissions found:");
            const permissions = permData.data || [];
            permissions.forEach((p: any) => {
                const statusIcon = p.status === 'granted' ? '✅' : '❌';
                console.log(`   ${statusIcon} ${p.permission} (${p.status})`);
            });

            const hasRead = permissions.some((p: any) => p.permission === 'pages_read_engagement' && p.status === 'granted');
            if (!hasRead) {
                console.error("\n⚠️ MISSING 'pages_read_engagement' permission! This is why insights fail.");
            }
        }

        // 2. Check Identity (Who is this token for?)
        console.log("\n2️⃣ Checking Token Identity...");
        const meUrl = `https://graph.facebook.com/v19.0/me?access_token=${token}`;
        const meRes = await fetch(meUrl);
        const meData = await meRes.json();

        if (meData.error) {
            console.error("❌ Error checking identity:", meData.error.message);
        } else {
            console.log(`✅ Token belongs to: ${meData.name} (ID: ${meData.id})`);
            if (meData.id === process.env.FB_PAGE_ID) {
                console.log("✅ This is a PAGE token (Correct)");
            } else {
                console.warn(`⚠️ This looks like a USER token (ID doesn't match Page ID ${process.env.FB_PAGE_ID})`);
                console.warn("   You need to generate a PAGE Access Token, not a User Token.");
            }
        }

    } catch (error) {
        console.error("❌ Exception:", error);
    }
}

debugToken();
