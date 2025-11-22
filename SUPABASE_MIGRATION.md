# Supabase Migration Guide

## Why Migrate to Supabase?

**Current Issues with Neon:**
- ❌ Persistent 502 errors
- ❌ WebSocket connection timeouts
- ❌ Slow query performance on free tier
- ❌ Connection pool exhaustion

**Supabase Benefits:**
- ✅ Better free tier (8GB storage vs 0.5GB)
- ✅ Always-on database (no cold starts)
- ✅ 60 direct connections (vs limited on Neon)
- ✅ Built-in connection pooling
- ✅ More stable for Railway deployments

---

## Migration Steps (30 minutes total)

### Step 1: Create Supabase Project (5 min)

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign in with GitHub
4. Click "New Project"
5. Choose:
   - **Name:** phuketradar
   - **Database Password:** (generate strong password - SAVE THIS!)
   - **Region:** Singapore (closest to Phuket)
   - **Plan:** Free

### Step 2: Get Connection String (2 min)

1. In Supabase dashboard, go to **Project Settings** (gear icon)
2. Click **Database** in left sidebar
3. Scroll to **Connection string**
4. Copy the **Connection pooling** string (starts with `postgresql://`)
5. Replace `[YOUR-PASSWORD]` with your database password

**Example:**
```
postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

### Step 3: Update Railway Environment (2 min)

1. Go to Railway dashboard
2. Click your `phuketradar` project
3. Click **Variables** tab
4. Find `DATABASE_URL`
5. Click **Edit**
6. Paste your Supabase connection string
7. Click **Save**

### Step 4: Create Schema in Supabase (5 min)

The schema will be created automatically when Railway redeploys with the new DATABASE_URL.

**Or manually run:**
```bash
npm run db:push
```

This uses Drizzle to create all tables in Supabase.

### Step 5: Migrate Data (15 min)

**Option A: Export from Neon, Import to Supabase**

1. **Export from Neon:**
```bash
# Install pg_dump if needed
brew install postgresql

# Export data
pg_dump $NEON_DATABASE_URL > neon_backup.sql
```

2. **Import to Supabase:**
```bash
# Import to Supabase
psql $SUPABASE_DATABASE_URL < neon_backup.sql
```

**Option B: Manual Migration (for critical data only)**

If you only need recent articles and journalists:

1. Go to Neon dashboard → SQL Editor
2. Export articles:
```sql
COPY (SELECT * FROM articles WHERE published_at > NOW() - INTERVAL '30 days') 
TO STDOUT WITH CSV HEADER;
```

3. Go to Supabase dashboard → SQL Editor
4. Import the CSV

### Step 6: Verify Migration (5 min)

1. **Check Railway logs:**
```
✅ [DB POOL] New database connection established
✅ Server started on port 5000
```

2. **Visit site:** https://phuketradar.com
3. **Test:**
   - Homepage loads
   - Articles display
   - Can read full articles
   - Scraper works

---

## Rollback Plan (if needed)

If something goes wrong:

1. Go to Railway → Variables
2. Change `DATABASE_URL` back to Neon
3. Railway will auto-redeploy
4. Site returns to previous state

---

## Cost Comparison

| Feature | Neon Free | Neon Launch | Supabase Free | Supabase Pro |
|---------|-----------|-------------|---------------|--------------|
| **Cost** | $0 | $5/mo | $0 | $25/mo |
| **Storage** | 0.5 GB | Unlimited | **8 GB** | 100 GB |
| **Compute** | 2 CU | 16 CU | Always-on | Always-on |
| **Connections** | Limited | Better | **60 direct** | 200 direct |
| **Pooling** | Basic | Better | **Built-in** | Built-in |
| **Cold starts** | Yes | Yes | **No** | No |

**Recommendation:** Start with Supabase Free. Upgrade to Pro ($25/mo) only if you exceed 8GB or need more connections.

---

## Troubleshooting

### "Connection refused"
- Check DATABASE_URL is correct
- Ensure password has no special characters that need escaping
- Use connection pooling URL (port 6543), not direct (port 5432)

### "Schema not found"
- Run `npm run db:push` to create tables
- Or wait for Railway to auto-deploy

### "Data missing"
- Check if data was exported correctly
- Verify import completed without errors
- Check Supabase dashboard → Table Editor

---

## Post-Migration Checklist

- [ ] Site loads without 502 errors
- [ ] Articles display correctly
- [ ] Images load properly
- [ ] Scraper runs successfully
- [ ] No database timeout errors in logs
- [ ] Performance is improved

---

## Need Help?

If you encounter issues:
1. Check Railway logs for errors
2. Check Supabase logs (Project Settings → Logs)
3. Verify DATABASE_URL is correct
4. Try rolling back to Neon temporarily

---

**Ready to migrate? Let's start with Step 1!**
