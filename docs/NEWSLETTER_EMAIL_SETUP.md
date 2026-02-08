# Newsletter Email Integration Setup Guide

## Overview

The Phuket Radar newsletter system supports two email providers:
1. **Maillayer** (preferred) - Self-hosted email marketing platform
2. **Resend** (fallback) - Cloud-based email API

The system automatically tries Maillayer first, then falls back to Resend if Maillayer is not configured.

---

## Option 1: Maillayer Setup (Recommended)

Maillayer is a self-hosted email marketing platform that connects to providers like Amazon SES, SendGrid, or Mailgun.

### Prerequisites
- A deployed Maillayer instance (e.g., on Coolify, Railway, Render, etc.)
- An email provider account (Amazon SES, SendGrid, or Mailgun) connected to Maillayer

### Steps

1. **Deploy Maillayer**
   - Follow the [Maillayer deployment guide](https://maillayer.com/docs/)
   - Connect your email provider (Amazon SES recommended for cost)

2. **Create a Transactional Template**
   - Open your Maillayer dashboard
   - Go to **Transactional** in the sidebar
   - Click **Create Template**
   - Design your newsletter template with these variables:
     ```
     Subject: {{subject}}
     Body: {{content}} or {{htmlContent}}
     ```
   - Or create a simple template that just passes through HTML content

3. **Get Your API Key**
   - After saving the template, copy the API Key
   - It looks like: `txn_67f21b6001f510a2a8c87574_m958x7up`

4. **Configure Environment Variables**
   Add these to your `.env` file (or Railway/Coolify environment):
   
   ```env
   # Maillayer Configuration
   MAILLAYER_API_URL=https://your-maillayer-instance.com
   MAILLAYER_API_KEY=txn_xxxxx_xxxxxxxx
   MAILLAYER_FROM_EMAIL=newsletter@phuketradar.com
   ```

### Testing
After configuration, the newsletter subscription should work immediately. Check the server logs for:
```
📧 Sending newsletter via Maillayer to user@example.com
✅ Newsletter sent via Maillayer to user@example.com: [messageId]
```

---

## Option 2: Resend Setup (Fallback)

Resend is a cloud-based email API that's simpler to set up but requires a subscription for production use.

### Steps

1. **Create a Resend Account**
   - Go to [resend.com](https://resend.com)
   - Sign up for an account

2. **Get Your API Key**
   - In the Resend dashboard, go to **API Keys**
   - Create a new API key

3. **Verify Your Domain (Production)**
   - Add DNS records to verify your sending domain
   - This is required for sending from your own domain

4. **Configure Environment Variables**
   ```env
   # Resend Configuration
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=newsletter@phuketradar.com
   ```

---

## Troubleshooting

### "Subscription failed" Error

This typically means:
1. **No email provider configured** - Check that either Maillayer or Resend environment variables are set
2. **Invalid API key** - Verify the API key is correct
3. **Domain not verified** - For production, ensure your sending domain is verified

### Checking Configuration

Check the server logs for email configuration status:
```
❌ Maillayer not configured. Missing MAILLAYER_API_URL or MAILLAYER_API_KEY
❌ RESEND_API_KEY not found in environment variables
```

### Common Issues

1. **Maillayer template not accepting HTML**
   - Ensure your Maillayer template has a variable for HTML content
   - Try using `{{content}}`, `{{htmlContent}}`, or `{{body}}`

2. **Emails going to spam**
   - Set up proper SPF, DKIM, and DMARC records
   - Use a dedicated domain for sending
   - Start with low volume and "warm up" your sending domain

3. **Rate limiting**
   - Amazon SES starts with sandbox limits (200 emails/day)
   - Apply for production access to increase limits

---

## File Locations

- **Maillayer Client**: `server/lib/maillayer-client.ts`
- **Newsletter Service**: `server/services/newsletter.ts`
- **Subscribe Endpoint**: `server/routes.ts` - `/api/subscribe`
- **Environment Example**: `.env.example`
