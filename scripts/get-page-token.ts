import "dotenv/config";

async function getPageToken() {
    const userToken = process.env.FB_PAGE_ACCESS_TOKEN; // This is currently your User Token
    const targetPageId = process.env.FB_PAGE_ID;

    if (!userToken) {
        console.error("❌ No FB_PAGE_ACCESS_TOKEN found in .env");
        return;
    }

    console.log(`🔍 Using User Token: ${userToken.substring(0, 10)}...`);
    console.log(`🎯 Looking for Page ID: ${targetPageId}`);

    try {
        // Fetch accounts (pages) this user manages
        const url = `https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ Error fetching accounts:", data.error.message);
            return;
        }

        const pages = data.data || [];
        console.log(`📋 Found ${pages.length} pages.`);

        const targetPage = pages.find((p: any) => p.id === targetPageId);

        if (targetPage) {
            console.log("\n✅ FOUND PHUKET RADAR PAGE TOKEN!");
            console.log("---------------------------------------------------");
            console.log(targetPage.access_token);
            console.log("---------------------------------------------------");
            console.log("👉 Copy the token above and paste it into your .env file as FB_PAGE_ACCESS_TOKEN");
        } else {
            console.error(`❌ Could not find page with ID ${targetPageId} in your accounts.`);
            console.log("Available pages:", pages.map((p: any) => `${p.name} (${p.id})`).join(", "));
        }

    } catch (error) {
        console.error("❌ Exception:", error);
    }
}

getPageToken();
