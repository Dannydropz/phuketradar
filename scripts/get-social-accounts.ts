import "dotenv/config";

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;

async function getInstagramAccountId(): Promise<string | null> {
  if (!PAGE_ACCESS_TOKEN || !FB_PAGE_ID) {
    console.error('❌ Missing FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID in environment variables');
    return null;
  }

  try {
    console.log('📸 Fetching Instagram Business Account ID...');
    
    const url = `${GRAPH_API_URL}/${FB_PAGE_ID}?fields=instagram_business_account&access_token=${PAGE_ACCESS_TOKEN}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed to fetch Instagram account:', error);
      return null;
    }
    
    const data = await response.json() as { instagram_business_account?: { id: string } };
    
    if (!data.instagram_business_account) {
      console.error('❌ No Instagram Business Account connected to this Facebook Page');
      console.error('   Make sure your Facebook Page is connected to an Instagram Business Account');
      return null;
    }
    
    const igAccountId = data.instagram_business_account.id;
    console.log(`✅ Instagram Business Account ID: ${igAccountId}`);
    return igAccountId;
  } catch (error) {
    console.error('❌ Error fetching Instagram account:', error);
    return null;
  }
}

async function getThreadsUserId(igAccountId: string): Promise<string | null> {
  if (!PAGE_ACCESS_TOKEN) {
    console.error('❌ Missing FB_PAGE_ACCESS_TOKEN in environment variables');
    return null;
  }

  try {
    console.log('🧵 Fetching Threads User ID...');
    
    const url = `${GRAPH_API_URL}/${igAccountId}?fields=threads_user_id&access_token=${PAGE_ACCESS_TOKEN}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed to fetch Threads info:', error);
      console.error('   This Instagram account may not have Threads enabled');
      return null;
    }
    
    const data = await response.json() as { threads_user_id?: string };
    
    if (!data.threads_user_id) {
      console.error('❌ No Threads account found for this Instagram Business Account');
      console.error('   Make sure this Instagram account is connected to Threads');
      return null;
    }
    
    const threadsUserId = data.threads_user_id;
    console.log(`✅ Threads User ID: ${threadsUserId}`);
    return threadsUserId;
  } catch (error) {
    console.error('❌ Error fetching Threads user:', error);
    return null;
  }
}

async function main() {
  console.log('🔍 Retrieving Social Media Account IDs...\n');
  
  if (!PAGE_ACCESS_TOKEN || !FB_PAGE_ID) {
    console.error('❌ Missing required environment variables:');
    console.error('   FB_PAGE_ACCESS_TOKEN - Your Facebook Page Access Token');
    console.error('   FB_PAGE_ID - Your Facebook Page ID');
    console.error('\nPlease add these to your .env file');
    process.exit(1);
  }
  
  const igAccountId = await getInstagramAccountId();
  
  if (!igAccountId) {
    console.error('\n❌ Could not retrieve Instagram Account ID');
    console.error('   Please ensure:');
    console.error('   1. Your Facebook Page is connected to an Instagram Business Account');
    console.error('   2. Your Page Access Token has the required permissions');
    process.exit(1);
  }
  
  const threadsUserId = await getThreadsUserId(igAccountId);
  
  console.log('\n📝 Account IDs Summary:');
  console.log('═'.repeat(60));
  console.log(`Instagram Business Account ID: ${igAccountId}`);
  if (threadsUserId) {
    console.log(`Threads User ID: ${threadsUserId}`);
  } else {
    console.log('Threads User ID: Not available (Threads not connected)');
  }
  console.log('═'.repeat(60));
  
  console.log('\n💡 Add these to your environment variables:');
  console.log(`   INSTAGRAM_ACCOUNT_ID=${igAccountId}`);
  if (threadsUserId) {
    console.log(`   THREADS_USER_ID=${threadsUserId}`);
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);
