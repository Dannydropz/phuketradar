# Phuket Radar Migration to Netcup

This guide migrates Phuket Radar from Railway + Supabase to your Netcup VPS (159.195.49.123) with Coolify.

## Why Migrate?

| Current Setup | New Setup |
|---------------|-----------|
| Railway (US) + Supabase (US) | Netcup VPS (Germany) |
| ~800-2000ms TTFB | ~100-200ms TTFB |
| Cold starts | Always warm |
| ~$29+/month (Railway + Supabase Pro) | ~€5/month |
| 5.5GB egress limit | Unlimited |

---

## Pre-Migration Checklist

- [ ] Netcup VPS running (159.195.49.123)
- [ ] Coolify installed and accessible
- [ ] Domain DNS pointing to Netcup for testing subdomain
- [ ] Supabase data export ready

---

## Step 1: Export Data from Supabase

### Option A: Use pg_dump (Recommended)

SSH into any machine with PostgreSQL client installed, then run:

```bash
# Export from Supabase
PGPASSWORD="your_supabase_password" pg_dump \
  -h db.lcnkazxuuythqurmonqh.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -F c \
  -f phuketradar_backup.dump
```

### Option B: Export via Supabase Dashboard

1. Go to Supabase Dashboard → Project Settings → Database
2. Download a backup (if available on your plan)

---

## Step 2: Create PostgreSQL in Coolify

1. Open Coolify dashboard: `http://159.195.49.123:8000`
2. Click **"Resources"** → **"+ New"**
3. Select **"Databases"** → **"PostgreSQL"**
4. Configure:
   - Name: `phuketradar-db`
   - Version: `16` (latest)
   - Password: Generate a strong password (save it!)
   - Public Port: `5432` (or leave random for security)
5. Click **Deploy**

### Get Database Credentials

After deployment, note these:
- **Host:** `localhost` (or container name if using Docker network)
- **Port:** The port assigned by Coolify
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** The one you set

---

## Step 3: Import Data to Netcup PostgreSQL

### From your local machine:

```bash
# SSH into Netcup and copy the dump file first
scp phuketradar_backup.dump root@159.195.49.123:/tmp/

# SSH into Netcup
ssh root@159.195.49.123

# Find the PostgreSQL container
docker ps | grep postgres

# Copy dump into container
docker cp /tmp/phuketradar_backup.dump <container_id>:/tmp/

# Restore inside container
docker exec -it <container_id> pg_restore \
  -U postgres \
  -d postgres \
  -c /tmp/phuketradar_backup.dump
```

---

## Step 4: Deploy Phuket Radar App in Coolify

### Create a Dockerfile for Production

The project already has a Dockerfile. Ensure it's production-ready:

```dockerfile
# Already in repo at /Dockerfile
```

### In Coolify:

1. Click **"Resources"** → **"+ New"**
2. Select **"Nixpacks"** or **"Dockerfile"**
3. Connect your GitHub repo: `https://github.com/Dannydropz/phuketradar`
4. Configure:
   - **Branch:** `main`
   - **Build Pack:** Dockerfile
   - **Port:** `5000`

### Add Environment Variables

Click **"Environment Variables"** and add all from your `.env`:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@phuketradar-db:5432/postgres
NODE_ENV=production
PORT=5000
SESSION_SECRET=your_session_secret

# OpenAI
OPENAI_API_KEY=your_key

# Facebook
FACEBOOK_ACCESS_TOKEN=your_token
FACEBOOK_PAGE_ID=your_page_id

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# Add all other env vars from Railway...
```

### Configure Domain

1. In Coolify app settings, go to **"Domains"**
2. Add: `phuketradar.com` or `test.phuketradar.com` for testing
3. Enable **"Auto SSL"** (Let's Encrypt)

---

## Step 5: Test the Deployment

1. Deploy the app in Coolify
2. Check logs: **"Logs"** tab
3. Test the staging URL: `https://test.phuketradar.com` (or the Coolify-provided URL)
4. Verify:
   - [ ] Homepage loads
   - [ ] Articles display
   - [ ] Admin login works
   - [ ] Scraping works
   - [ ] Facebook posting works

---

## Step 6: DNS Cutover

Once testing is complete:

### In Cloudflare:

1. Go to **DNS** → **Records**
2. Find the A record for `phuketradar.com`
3. Change it from Railway's IP to: `159.195.49.123`
4. Set **Proxy status** to **Proxied** (orange cloud)
5. TTL: Auto

### Wait for propagation (5-30 minutes)

Check with: `dig phuketradar.com`

---

## Step 7: Update N8N Workflows for Netcup

Since N8N workflows connect to the database and API, update credentials after migration:

### Update PostgreSQL Credentials in N8N

1. Go to **N8N Dashboard** → **Credentials**
2. Find **"Postgres account"** (or similar)
3. Update connection details:
   - **Host:** `phuketradar-postgres` (internal Docker hostname)
   - **Port:** `5432`
   - **Database:** `phuketradar`
   - **User:** `postgres`
   - **Password:** Your Netcup PostgreSQL password
   - **SSL:** Disable (internal connection)

### Verify Workflows Still Work

Test these workflows after updating credentials:
- ✅ **Facebook Auto-Poster** - Posts articles to Facebook
- ✅ **Instagram/Threads Auto-Poster** - Posts via Publer
- ✅ **Daily Analytics Sync** - Syncs Google Analytics data
- ✅ **Facebook Insights Sync** - Syncs Facebook engagement data

### API Endpoints (No Changes Needed)

The following workflows use `https://phuketradar.com/api/...` URLs, which automatically point to Netcup once DNS is updated:
- Daily Analytics Sync
- Facebook Insights Sync

---

## Step 8: Cleanup Old Services

After confirming everything works:

1. **Railway:** Delete project or pause billing
2. **Supabase:** Export final backup, then delete project
3. **Verify N8N:** Run each workflow manually to confirm they work

---

## Coolify Docker Compose (Alternative)

If you prefer docker-compose:

```yaml
version: '3.8'

services:
  phuketradar:
    build: .
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/postgres
      NODE_ENV: production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: your_secure_password
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## Expected Performance Improvement

| Metric | Before (Railway+Supabase) | After (Netcup) |
|--------|---------------------------|----------------|
| TTFB | 800-2000ms | 100-300ms |
| LCP | 4-6s | 2-3s |
| DB Query | 150-300ms | <5ms |
| PageSpeed | 70 | 85-95 |
| Cold Start | 2-5s | None |
| Monthly Cost | ~$29+ | ~€5 |

---

## Troubleshooting

### App won't start
```bash
# Check logs in Coolify dashboard
# Or SSH and run:
docker logs <container_id>
```

### Database connection error
- Verify DATABASE_URL uses the correct container name
- Check PostgreSQL is running: `docker ps | grep postgres`

### SSL issues
- Ensure domain is pointing to 159.195.49.123
- Wait for DNS propagation
- Check Coolify SSL logs

---

## Rollback Plan

If anything goes wrong:

1. Point DNS back to Railway's URL
2. Railway app should still be running
3. Investigate issues on Netcup
4. Re-attempt migration
