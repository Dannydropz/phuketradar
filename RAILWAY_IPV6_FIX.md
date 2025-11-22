# IPv4 Fix for Supabase on Railway

## The Problem
Railway's network is trying to connect to Supabase via IPv6, but Supabase's pooler isn't accessible via IPv6 from Railway's infrastructure, causing `ENETUNREACH` errors.

## The Solution

### Option 1: Force IPv4 via Environment Variable (RECOMMENDED)

Add this to Railway environment variables:

**Variable Name:** `NODE_OPTIONS`
**Value:** `--dns-result-order=ipv4first`

**Steps:**
1. Railway Dashboard → Your Project → Variables
2. Click "New Variable"
3. Name: `NODE_OPTIONS`
4. Value: `--dns-result-order=ipv4first`
5. Click "Add"
6. Railway will auto-redeploy

---

### Option 2: Use Supabase Direct Connection (Port 5432)

If Option 1 doesn't work, switch to direct connection:

**In Supabase:**
1. Go to "Connect" → "Direct Connection" tab
2. Copy the connection string (port 5432, not 6543)
3. Update Railway's `DATABASE_URL`

**Note:** Direct connection has a limit of 60 connections, but should work for now.

---

### Option 3: Use Transaction Mode Pooler (Port 6543)

Try the transaction mode pooler URL instead:

**In Supabase:**
1. Go to "Connect" → "Connection Pooling"
2. Select "Transaction" mode (not Session)
3. Copy that connection string
4. Update Railway's `DATABASE_URL`

---

## Recommended Order

1. Try Option 1 first (NODE_OPTIONS)
2. If that fails, try Option 3 (Transaction mode)
3. If that fails, use Option 2 (Direct connection)

---

## Why This Happens

Railway's infrastructure has IPv6 enabled, and Node.js's DNS resolver prefers IPv6 when available. However, Supabase's connection pooler may not be fully accessible via IPv6 from all networks, causing connection failures.

The `NODE_OPTIONS=--dns-result-order=ipv4first` flag tells Node.js to prefer IPv4 addresses when resolving DNS, which should fix the issue.
