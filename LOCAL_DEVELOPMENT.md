# Local Development Workflow

## Running Locally

1. **Start the development server:**
```bash
npm run dev
```

2. **Open in browser:**
```
http://localhost:5000
```

3. **Make changes:**
   - Edit files
   - See changes instantly (hot reload)
   - Test thoroughly

4. **When satisfied:**
```bash
git add -A
git commit -m "Your changes"
git push origin main  # Goes live
```

---

## Environment Variables

Your local `.env` file is already configured with:
- `DATABASE_URL` - Supabase connection
- `OPENAI_API_KEY` - For AI features
- Other secrets

**Note:** Local dev uses the SAME database as production (Supabase). Be careful with:
- Scraping (might create duplicate articles)
- Database migrations
- Deleting data

---

## Recommended: Use Staging Branch

For safer testing:

1. **Create staging branch:**
```bash
git checkout -b staging
```

2. **Make changes and test locally:**
```bash
npm run dev
```

3. **Push to staging:**
```bash
git push origin staging
```

4. **When ready for production:**
```bash
git checkout main
git merge staging
git push origin main
```

---

## Hot Tips

- **Quick test:** `npm run dev` (instant feedback)
- **Build test:** `npm run build` (catches build errors)
- **Type check:** `npm run check` (catches TypeScript errors)
- **Lint:** `npm run lint` (code quality)

---

## Database Considerations

Since you're using the same Supabase database locally and in production:

**Safe operations:**
- ✅ Reading data
- ✅ Testing UI changes
- ✅ Testing search/filters

**Risky operations:**
- ⚠️ Running scrapers (creates real articles)
- ⚠️ Deleting articles
- ⚠️ Database migrations

**Solution:** Create a separate Supabase project for local dev if you need to test scrapers.
