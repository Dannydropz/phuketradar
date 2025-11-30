---
description: Setup Netcup VPS and Install Coolify
---

# Setup Netcup VPS and Install Coolify

This workflow guides you through setting up your Netcup VPS (159.195.49.123) and installing Coolify for application deployment.

## Prerequisites
- SSH access to your Netcup VPS
- Root password (should be provided by Netcup via email)
- A domain name (optional but recommended for SSL)

## Step 1: Connect to Your VPS

First, connect to your server via SSH:

```bash
ssh root@159.195.49.123
```

Enter your root password when prompted.

## Step 2: Update System Packages

Once connected, update all system packages:

```bash
apt update && apt upgrade -y
```

## Step 3: Install Essential Tools

```bash
apt install -y curl wget git ufw fail2ban
```

## Step 4: Configure Firewall (UFW)

Set up basic firewall rules:

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP and HTTPS (for Coolify and apps)
ufw allow 80/tcp
ufw allow 443/tcp

# Allow Coolify's management port
ufw allow 8000/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

## Step 5: Create a Non-Root User (Optional but Recommended)

```bash
# Create user
adduser coolify

# Add to sudo group
usermod -aG sudo coolify

# Switch to new user
su - coolify
```

## Step 6: Install Docker

Coolify requires Docker. Install it:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER

# Start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Verify installation
docker --version
```

**Important:** Log out and log back in for docker group changes to take effect.

## Step 7: Install Coolify

Run the official Coolify installation script:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

This will:
- Install Coolify and its dependencies
- Set up the necessary containers
- Configure the system
- Start Coolify services

## Step 8: Access Coolify Dashboard

After installation completes:

1. Open your browser and navigate to:
   - `http://159.195.49.123:8000` (or your domain if configured)

2. Complete the initial setup:
   - Create an admin account
   - Set up email notifications (optional)
   - Configure your first server (localhost)

## Step 9: Configure Domain and SSL (Recommended)

If you have a domain:

1. Point your domain's A record to: `159.195.49.123`
2. In Coolify dashboard:
   - Go to Settings → Configuration
   - Set your domain (e.g., `coolify.yourdomain.com`)
   - Enable automatic SSL certificate

## Step 10: Deploy Your First Application

To deploy the phuketradar application:

1. In Coolify dashboard, click "New Resource"
2. Choose deployment method:
   - **Option A:** GitHub repository (recommended)
   - **Option B:** Docker Compose
   - **Option C:** Dockerfile

3. Configure environment variables from your `.env` file
4. Set up database (PostgreSQL/Neon)
5. Deploy!

## Useful Coolify Commands

```bash
# Check Coolify status
docker ps | grep coolify

# View Coolify logs
docker logs -f coolify

# Restart Coolify
docker restart coolify

# Update Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

## Security Best Practices

1. **Change SSH Port (Optional):**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Change Port 22 to Port 2222
   sudo systemctl restart sshd
   sudo ufw allow 2222/tcp
   sudo ufw delete allow 22/tcp
   ```

2. **Set Up Fail2Ban:**
   ```bash
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

3. **Regular Updates:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **Enable Automatic Security Updates:**
   ```bash
   sudo apt install unattended-upgrades -y
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```

## Troubleshooting

**Coolify won't start:**
```bash
docker logs coolify
sudo systemctl restart docker
```

**Can't access dashboard:**
- Check firewall: `sudo ufw status`
- Verify Coolify is running: `docker ps`
- Check port 8000 is accessible

**Out of disk space:**
```bash
# Clean up Docker
docker system prune -a

# Check disk usage
df -h
```

## Next Steps

1. Deploy phuketradar application
2. Set up automated backups
3. Configure monitoring
4. Set up staging environment
5. Configure CI/CD pipelines
