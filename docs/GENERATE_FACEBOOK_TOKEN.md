# 🔑 Generate Facebook Page Access Token

## Quick Start (5 minutes)

This guide will help you generate a long-lived Facebook Page Access Token to use with N8N.

---

## Step 1: Add Your Facebook App Credentials to .env

Open your `.env` file and add:

```bash
# Facebook App Credentials (from developers.facebook.com)
FB_APP_ID=your_app_id_here
FB_APP_SECRET=your_app_secret_here
```

**Where to find these:**
1. Go to: https://developers.facebook.com/apps
2. Select your existing app
3. Go to **Settings → Basic**
4. Copy **App ID** and **App Secret** (click "Show")

---

## Step 2: Run the Token Generator

```bash
npm run generate:fb-token
```

The script will guide you through getting a token!

---

## Step 3: Follow the Prompts

The script will ask you to:

1. **Open Facebook Graph API Explorer**
   - URL will be shown in the terminal
   
2. **Get a short-lived token**
   - Select your app
   - Click "Get User Access Token"
   - Select permissions: `pages_manage_posts`, `pages_read_engagement`, `pages_manage_metadata`
   - Click "Generate Access Token"

3. **Paste the token** into the terminal

4. **Script will automatically**:
   - Exchange it for a long-lived token (~60 days)
   - Get your Page Access Token
   - Find your Phuket Radar page
   - Display the final token

---

## Step 4: Add Token to N8N

After the script finishes, you'll get a long-lived Page Access Token.

**Add these to your N8N environment variables:**

```bash
FB_PAGE_ID=786684811203574
FB_PAGE_ACCESS_TOKEN=<paste_token_from_script>
DATABASE_URL=postgresql://user:pass@host.supabase.co:5432/postgres
SITE_BASE_URL=https://phuketradar.com
```

### How to Add in N8N:

**If using Docker:**
Edit your `docker-compose.yml`:
```yaml
services:
  n8n:
    environment:
      - FB_PAGE_ID=786684811203574
      - FB_PAGE_ACCESS_TOKEN=your_token_here
      - DATABASE_URL=postgresql://user:pass@host.supabase.co:5432/postgres
      - SITE_BASE_URL=https://phuketradar.com
```

**If using Coolify:**
1. Go to your N8N app
2. Click "Environment Variables"
3. Add all 4 variables

---

## Step 5: Import & Test Workflow in N8N

1. **Import the workflow**:
   - In N8N, go to Workflows
   - Click "Import from File"
   - Select: `n8n-workflows/phuket-radar-facebook-autoposter-simple.json`

2. **Test it**:
   - Click "Execute Workflow"
   - Check execution logs

3. **Activate**:
   - Toggle "Active" switch
   - Workflow runs every 30 minutes

---

## 🔄 Token Refresh (Every ~60 Days)

The token lasts about 60 days. To refresh:

```bash
npm run generate:fb-token
```

Follow the same steps, update the token in N8N environment variables, and you're good for another 60 days!

---

## 🐛 Troubleshooting

### "Invalid FB_APP_ID or FB_APP_SECRET"
- Check they're correct in `.env`
- Ensure you copied them correctly from Facebook

### "No pages found"
- Verify you're an admin of Phuket Radar page
- Check permissions were granted in Graph API Explorer

### "Error exchanging token"
- Make sure the short-lived token hasn't expired (they last minutes)
- Try generating a fresh token in Graph API Explorer

### "Permission denied"
- Ensure your app has the required permissions:
  - `pages_manage_posts`
  - `pages_read_engagement`
  - `pages_manage_metadata`
- App can be in Development Mode (that's fine!)

---

## ✅ What This Token Lets You Do

With this Page Access Token, the N8N workflow can:

✅ Post photos to your Phuket Radar page  
✅ Post multi-image grid posts  
✅ Add comments to posts  
✅ Pin comments  
✅ Read post engagement metrics  

All without needing to manually authenticate every time!

---

## 📚 Next Steps

After generating your token:

1. ✅ Add token to N8N environment variables
2. ✅ Import `phuket-radar-facebook-autoposter-simple.json`
3. ✅ Test the workflow
4. ✅ Activate it
5. ✅ Set a reminder to refresh token in 60 days

---

**Ready?** Run `npm run generate:fb-token` and let's get your token! 🚀
