# Facebook Access Token Update Guide

## Problem
Facebook auto-posting has stopped working with the error:
```
"(#200) The permission(s) publish_actions are not available. It has been deprecated."
```

The `publish_actions` permission was deprecated by Facebook. Page publishing now requires the **`pages_manage_posts`** permission instead.

---

## Solution: Regenerate Your Access Token

### Step 1: Go to Facebook Graph API Explorer
1. Visit: https://developers.facebook.com/tools/explorer/
2. Select your app from the "Meta App" dropdown in the top right
3. Select "User Token" from the "User or Page" dropdown

### Step 2: Request the Correct Permissions
Click on "Permissions" and add these permissions:
- ✅ `pages_manage_posts` (replaces `publish_actions`) - **Required for posting**
- ✅ `pages_read_engagement` - **Required for reading page data**
- ✅ `pages_show_list` - Required to see your pages

Click "Generate Access Token" and approve the permissions.

### Step 3: Get Your Page Access Token
1. Copy the User Access Token that was generated
2. In the Graph API Explorer, make a GET request to:
   ```
   /me/accounts?fields=id,name,access_token
   ```
3. Find your "Phuket Radar" page (ID: `786684811203574`) in the response
4. Copy the `access_token` for that page - this is your **Page Access Token**

### Step 4: Make It Long-Lived (Important!)
The token from Step 3 expires in ~1 hour. You need to make it long-lived (60 days):

1. In the Graph API Explorer, make a GET request to:
   ```
   /oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=PAGE_ACCESS_TOKEN_FROM_STEP_3
   ```
   
   Replace:
   - `YOUR_APP_ID` - Your Facebook App ID
   - `YOUR_APP_SECRET` - Your Facebook App Secret (found in App Settings > Basic)
   - `PAGE_ACCESS_TOKEN_FROM_STEP_3` - The page token you got in Step 3

2. The response will contain a long-lived access token

**Alternative (Easier):** Use the Access Token Debugger:
1. Go to: https://developers.facebook.com/tools/debug/accesstoken/
2. Paste your Page Access Token from Step 3
3. Click "Extend Access Token" at the bottom
4. Copy the extended token

### Step 5: Update Your Environment Variable
1. Update your `.env` file:
   ```bash
   FB_PAGE_ACCESS_TOKEN=your_new_long_lived_page_access_token_here
   ```

2. If running on Replit/production, update the environment variable in your deployment settings

3. Restart your application

---

## Verify It Works

### Test with Graph API Explorer
Make a POST request to test that the token works:
```
/{page-id}/photos?url=https://example.com/image.jpg&message=Test post&access_token=YOUR_NEW_TOKEN
```

### Test in Your App
Try posting an article to Facebook from your admin interface.

---

## Token Renewal
Page Access Tokens expire after 60 days. You'll need to repeat this process before expiration.

**Pro Tip:** Set a calendar reminder for 50 days from now to regenerate the token.

---

## Required Permissions Summary
For Facebook page posting, you need:

| Permission | Purpose |
|------------|---------|
| `pages_manage_posts` | Post content to your page |
| `pages_read_engagement` | Read post insights/engagement |
| `pages_show_list` | List pages you manage |

**DO NOT USE:**
- ❌ `publish_actions` (deprecated)
- ❌ `publish_pages` (deprecated)

---

## Troubleshooting

### "Invalid OAuth access token"
Your token expired or is incorrect. Regenerate following the steps above.

### "This endpoint requires the 'pages_manage_posts' permission"
Your token doesn't have the right permissions. Make sure you selected `pages_manage_posts` in Step 2.

### "Cannot access page"
Make sure you're an admin of the Phuket Radar page (ID: 786684811203574).

### Token still shows old permissions
When debugging your token at https://developers.facebook.com/tools/debug/accesstoken/, you should see `pages_manage_posts` in the Scopes section. If you see `publish_actions`, you need to regenerate the token.
