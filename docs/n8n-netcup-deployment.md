# N8N Deployment on Netcup VPS

Guide for deploying N8N on your Netcup VPS to automate workflows for Phuket Radar (hosted on Railway).

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Netcup VPS (Germany)            │
│  ┌───────────────────────────────────┐  │
│  │           N8N Server              │  │
│  │  - Workflow Automation            │  │
│  │  - Scheduled Jobs                 │  │
│  │  - API Integrations               │  │
│  └───────────────┬───────────────────┘  │
└──────────────────┼──────────────────────┘
                   │
                   │ HTTPS API Calls
                   │
  ┌────────────────┼────────────────────────────┐
  │                ▼                            │
  │   Railway (Phuket Radar Production)        │
  │  ┌─────────────────────────────────────┐   │
  │  │  Node.js App + PostgreSQL/Supabase  │   │
  │  │  Exposes API endpoints for N8N      │   │
  │  └─────────────────────────────────────┘   │
  └────────────────────────────────────────────┘
```

**Key Points:**
- N8N runs on Netcup VPS (always on, scheduled workflows)
- Phuket Radar stays on Railway (current setup, no migration needed)
- N8N connects to Railway via HTTPS API calls
- N8N can also connect to Supabase database directly

---

## Prerequisites

- [x] Netcup VPS with root access
- [x] Domain/subdomain for N8N (e.g., `n8n.yourdomain.com`)
- [ ] SSL certificate (Let's Encrypt, free)
- [ ] Docker installed on VPS

---

## Deployment Steps

### 1. Initial VPS Setup

SSH into your Netcup VPS:

```bash
ssh root@your-vps-ip
```

Update system and install Docker:

```bash
# Update packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version
```

### 2. Create N8N Directory Structure

```bash
# Create directory for N8N
mkdir -p /opt/n8n
cd /opt/n8n

# Create data directory (persists workflows, credentials)
mkdir -p data
```

### 3. Create Docker Compose Configuration

Create `/opt/n8n/docker-compose.yml`:

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      # Basic Configuration
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      
      # Security - Change these!
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=ChangeThisStrongPassword123!
      
      # Timezone
      - GENERIC_TIMEZONE=Asia/Bangkok
      - TZ=Asia/Bangkok
      
      # Execution settings
      - EXECUTIONS_PROCESS=main
      - EXECUTIONS_MODE=regular
      
      # Webhook URL (for external services to trigger workflows)
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      
    volumes:
      - ./data:/home/node/.n8n
    
    # Optional: Use custom network
    networks:
      - n8n-network

networks:
  n8n-network:
    driver: bridge
```

### 4. Set Up Nginx Reverse Proxy with SSL

Install Nginx and Certbot:

```bash
apt install nginx certbot python3-certbot-nginx -y
```

Create Nginx config `/etc/nginx/sites-available/n8n`:

```nginx
server {
    listen 80;
    server_name n8n.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name n8n.yourdomain.com;
    
    # SSL certificate paths (will be filled by certbot)
    ssl_certificate /etc/letsencrypt/live/n8n.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/n8n.yourdomain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Proxy settings
    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running workflows
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}
```

Enable the site:

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/

# Test Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx
```

### 5. Obtain SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt (interactive)
certbot --nginx -d n8n.yourdomain.com

# Auto-renewal is set up automatically
# Test renewal:
certbot renew --dry-run
```

### 6. Start N8N

```bash
cd /opt/n8n
docker-compose up -d

# Check logs
docker-compose logs -f n8n

# You should see: "Editor is now accessible via: https://n8n.yourdomain.com"
```

### 7. Access N8N

Open browser and go to: `https://n8n.yourdomain.com`

Login with credentials you set in docker-compose.yml:
- Username: `admin`
- Password: `ChangeThisStrongPassword123!`

---

## Connecting N8N to Railway-Hosted Phuket Radar

### Option 1: Via API Endpoints (Recommended)

N8N will call your Railway API endpoints via HTTPS.

**Add API endpoints to Phuket Radar** for N8N to trigger actions:

```typescript
// server/routes.ts

// N8N webhook endpoint - sync analytics
app.post("/api/n8n/sync-analytics", async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  // Verify API key
  if (apiKey !== process.env.N8N_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Trigger analytics sync
  await syncAnalyticsData();
  res.json({ success: true });
});

// N8N webhook - get viral articles
app.get("/api/n8n/viral-articles", async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== process.env.N8N_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get articles with >100 views in last hour
  const viralArticles = await getViralArticles();
  res.json(viralArticles);
});
```

**In N8N workflow**, use HTTP Request node:
- Method: POST
- URL: `https://your-app.railway.app/api/n8n/sync-analytics`
- Headers: `x-api-key: your-secret-key`

### Option 2: Direct Database Access

N8N can connect directly to your Supabase/PostgreSQL database.

**In N8N:**
1. Go to Credentials → Add Credential → Postgres
2. Enter your Supabase connection details:
   - Host: `your-project.supabase.co`
   - Database: `postgres`
   - User: `postgres`
   - Password: `your-supabase-password`
   - Port: `5432`
   - SSL: `require`

**Use Postgres node in workflows** to query/insert data directly.

---

## Essential N8N Workflows for Smart Learning

### Workflow 1: Daily Analytics Sync

**Schedule:** Every day at 2 AM Bangkok time

```
[Schedule Trigger: 0 2 * * *]
    ↓
[HTTP Request: Trigger Railway API sync-analytics endpoint]
    ↓
[If: Success]
    ↓
[Slack/Email: Send confirmation]
```

**Setup:**
1. Add "Schedule Trigger" node: Cron `0 2 * * *` (2 AM daily)
2. Add "HTTP Request" node:
   - URL: `https://your-app.railway.app/api/n8n/sync-analytics`
   - Method: POST
   - Headers: `x-api-key: your-key`
3. Add "Slack" node to notify on completion

### Workflow 2: Viral Story Alert

**Schedule:** Every 15 minutes

```
[Schedule Trigger: */15 * * * *]
    ↓
[HTTP Request: Get viral articles from Railway API]
    ↓
[If: Has viral articles]
    ↓
[Twitter/X: Post article] + [Slack: Alert team]
```

### Workflow 3: Weekly Content Gap Report

**Schedule:** Every Monday at 9 AM

```
[Schedule Trigger: 0 9 * * 1]
    ↓
[Postgres: Query Search Console data for high-impression queries]
    ↓
[OpenAI: Analyze content gaps]
    ↓
[Email: Send report to admin]
```

### Workflow 4: Facebook Insights Sync

**Schedule:** Daily at 10 AM

```
[Schedule Trigger: 0 10 * * *]
    ↓
[Postgres: Get articles posted to Facebook in last 7 days]
    ↓
[Facebook Graph API: Fetch insights for each post]
    ↓
[Postgres: Update social_media_analytics table]
    ↓
[Slack: Notify completion]
```

---

## Security Best Practices

### 1. Use Environment Variables

In `/opt/n8n/.env`:

```bash
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-strong-password
RAILWAY_API_KEY=your-railway-api-key
SUPABASE_PASSWORD=your-supabase-password
OPENAI_API_KEY=your-openai-key
SLACK_WEBHOOK_URL=your-slack-webhook
```

Update docker-compose.yml:

```yaml
services:
  n8n:
    env_file:
      - .env
```

### 2. Firewall Configuration

```bash
# Install UFW firewall
apt install ufw -y

# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### 3. Regular Backups

```bash
# Backup N8N data (workflows, credentials)
cd /opt/n8n
tar -czf n8n-backup-$(date +%Y%m%d).tar.gz data/

# Restore from backup
tar -xzf n8n-backup-20250128.tar.gz
```

### 4. Update N8N Regularly

```bash
cd /opt/n8n
docker-compose pull
docker-compose up -d
```

---

## Monitoring & Maintenance

### Check N8N Status

```bash
# Check if container is running
docker ps | grep n8n

# View logs
docker-compose logs -f n8n

# Restart N8N
docker-compose restart n8n
```

### Monitor Resource Usage

```bash
# Check CPU/RAM usage
docker stats n8n

# Check disk usage
df -h
du -sh /opt/n8n/data
```

### Set Up Automatic Restarts

N8N is already configured with `restart: unless-stopped` in docker-compose.yml, so it will auto-restart on VPS reboot.

---

## Troubleshooting

### N8N won't start

```bash
# Check logs
docker-compose logs n8n

# Common issues:
# 1. Port 5678 already in use
netstat -tulpn | grep 5678

# 2. Permission issues
chown -R 1000:1000 /opt/n8n/data
```

### Can't access N8N web interface

```bash
# Check Nginx status
systemctl status nginx

# Check SSL certificate
certbot certificates

# Test Nginx config
nginx -t
```

### Workflows not executing

1. Check N8N logs for errors
2. Verify credentials are correctly set
3. Test API endpoints manually with curl:

```bash
curl -X POST https://your-app.railway.app/api/n8n/sync-analytics \
  -H "x-api-key: your-key"
```

---

## Cost Analysis

**Netcup VPS:** ~€5-10/month (your current plan)
**N8N:** FREE (self-hosted)
**Total:** No additional cost beyond VPS

**Comparison:**
- Zapier equivalent: €29-99/month
- Make.com equivalent: €9-29/month
- **Savings:** €108-1,188/year

---

## Next Steps

1. ✅ Set up N8N on Netcup VPS
2. ✅ Add API endpoints to Railway app for N8N
3. ✅ Create first workflow (Analytics Sync)
4. ✅ Test end-to-end integration
5. ✅ Add monitoring/alerts

Ready to proceed?
