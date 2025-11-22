# Deployment Workflow Guide

## Three Ways to Deploy Changes

### Option 1: 🚀 Push Live Immediately

**When to use:** Small fixes, urgent updates, confident changes

**Steps:**
```bash
git add -A
git commit -m "Your change description"
git push origin main
```

**Result:** 
- ✅ Deploys to https://phuketradar.com in ~2 minutes
- ✅ Goes live immediately
- ⚠️ No testing step

---

### Option 2: 🧪 Test Locally First

**When to use:** UI changes, want to see it before deploying

**Steps:**
```bash
npm run dev
```

**Result:**
- ✅ Opens at http://localhost:5000
- ✅ Instant hot-reload (changes appear immediately)
- ✅ Test thoroughly before pushing
- ⚠️ Uses production database (be careful with scrapers)

**When satisfied:**
```bash
git add -A
git commit -m "Your change description"
git push origin main  # Now goes live
```

---

### Option 3: 🔍 Create Preview Deployment

**When to use:** Big features, want to share with others, need real deployment testing

**Steps:**

1. **Switch to staging branch:**
```bash
git checkout staging
```

2. **Make your changes and commit:**
```bash
git add -A
git commit -m "Your change description"
git push origin staging
```

3. **Create Pull Request:**
   - Go to https://github.com/Dannydropz/phuketradar/pulls
   - Click "New Pull Request"
   - Base: `main` ← Compare: `staging`
   - Click "Create Pull Request"

4. **Railway auto-creates preview:**
   - Check Railway dashboard
   - Find the preview deployment
   - Get the preview URL (e.g., `phuketradar-staging-abc123.up.railway.app`)

5. **Test the preview:**
   - Visit the preview URL
   - Test everything
   - Share with others if needed

6. **When ready to go live:**
   - Click "Merge Pull Request" on GitHub
   - Railway auto-deploys to production
   - Preview deployment is deleted

---

## Quick Decision Guide

**Ask yourself:**

- **Is this a tiny fix?** → Option 1 (Push Live)
- **Do I want to see it first?** → Option 2 (Test Locally)
- **Is this a big change?** → Option 3 (Preview Deployment)
- **Do I need to show someone?** → Option 3 (Preview Deployment)

---

## Railway PR Preview Setup

### Enable PR Deployments:

1. **Go to Railway Dashboard:**
   - https://railway.app
   - Select your `phuketradar` project

2. **Project Settings:**
   - Click "Settings" tab
   - Scroll to "Environments"
   - Enable "PR Deployments"

3. **Configure:**
   - Base branch: `main`
   - Deploy PRs from: `staging`
   - Auto-delete after merge: ✅ Yes

**Done!** Now every PR from `staging` → `main` gets a preview URL.

---

## Common Workflows

### Quick Fix Workflow:
```bash
# Make change
git add -A
git commit -m "Fix typo"
git push origin main
# ✅ Live in 2 minutes
```

### Feature Development Workflow:
```bash
# Switch to staging
git checkout staging

# Make changes
# ... edit files ...

# Test locally
npm run dev

# Commit to staging
git add -A
git commit -m "Add new feature"
git push origin staging

# Create PR on GitHub
# Test preview URL
# Merge when ready
```

### Emergency Rollback:
```bash
# Revert last commit
git revert HEAD
git push origin main
# ✅ Rolls back in 2 minutes
```

---

## Tips

- **Always test locally first** for UI changes (`npm run dev`)
- **Use preview deployments** for features that touch the database
- **Push to main** for typos, copy changes, small CSS tweaks
- **Check Railway logs** after deploying to catch errors early

---

## Need Help?

Just tell me:
- "Push this live" → I'll commit to main
- "Let me test first" → I'll tell you to run `npm run dev`
- "Create a preview" → I'll push to staging and guide you through PR
