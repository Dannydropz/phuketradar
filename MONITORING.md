# Quick Reference: Monitoring Database Health

## Check Database Health Manually

```bash
# From the project root
npm run db:health
```

This will run a health check and show:
- ✅ Connection successful
- ⏱️ Response time
- 📊 Current pool stats

## Watch Logs During Scraping

### Healthy Scrape Logs
```
🏥 Checking database health before starting scrape...
[DB-HEALTH] ✅ Database connection healthy
✅ Database is healthy - proceeding with scrape

[DB POOL] New database connection established
[DB POOL] Connection acquired from pool
```

### Warning Signs (Recoverable)
```
[DB-RETRY] Create article: ... failed (attempt 1/5)
[DB-RETRY] Error: timeout exceeded when trying to connect
[DB-RETRY] Retrying in 2000ms...

[DB-HEALTH] ❌ Database health check failed (1/3)
```

### Critical Issues (Requires Attention)
```
[DB-HEALTH] 🚨 Database appears to be down - circuit breaker triggered
❌ Database is unhealthy - aborting scrape to prevent timeouts

[DB-RETRY] Create article: ... failed after 5 attempt(s)
```

## Railway Dashboard Checks

1. **Go to Railway Dashboard** → Your Project → Metrics
2. **Check:**
   - CPU usage (should be < 80%)
   - Memory usage (should be < 80%)
   - Network activity (spikes during scrapes are normal)

## Neon Dashboard Checks

1. **Go to Neon Console** → Your Project → Monitoring
2. **Check:**
   - Active connections (should be < 10)
   - Query duration (should be < 5s average)
   - Connection errors (should be 0)

## Common Issues & Quick Fixes

### Issue: "timeout exceeded when trying to connect"
**Quick Fix:**
1. Check Neon dashboard - database might be cold starting
2. Wait 30 seconds and retry
3. If persists, check Railway logs for memory issues

### Issue: Site becomes unresponsive during scrape
**Quick Fix:**
1. Stop the scrape (if manual)
2. Check connection pool: `[DB POOL]` logs
3. Restart the Railway deployment if needed

### Issue: Scrape aborts with "Database unhealthy"
**Quick Fix:**
1. This is GOOD - it prevented a cascade failure
2. Check Neon dashboard for issues
3. Scrape will retry automatically on next schedule

## Performance Benchmarks

### Expected Scrape Performance
- **Duration:** 5-15 minutes for full scrape
- **Articles processed:** 20-50 per scrape
- **Database operations:** 100-500 queries
- **Retry rate:** < 5% of operations

### Red Flags
- Scrape takes > 30 minutes
- Retry rate > 20%
- Multiple health check failures
- Site unresponsive for > 5 minutes

## Emergency Actions

### If site is down:
1. **Check Railway deployment status**
2. **Restart deployment** if needed
3. **Check Neon database status**
4. **Review recent logs** for errors

### If scrapes keep failing:
1. **Disable auto-scraping** temporarily
2. **Run manual scrape** to test
3. **Check DATABASE_IMPROVEMENTS.md** for troubleshooting
4. **Consider increasing timeouts** further

## Useful Commands

```bash
# Check database connection
npm run db:test

# View recent logs
railway logs --tail 100

# Restart deployment
railway up --detach

# Check environment variables
railway variables
```

## Contact Points

- **Railway Status:** https://status.railway.app/
- **Neon Status:** https://status.neon.tech/
- **Project Issues:** Check GitHub issues or create new one
