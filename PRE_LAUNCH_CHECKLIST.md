# Merraine AI - Pre-Launch Checklist

> **Updated:** 2026-01-22
> **Status:** Ready for User Testing
> **New Credentials:** dina@lazerow.com / 1130

---

## ✅ Completed

### Security Fixes
- [x] Auth verification on API routes
- [x] Rate limiting (15/min search, 30/min enrich)
- [x] Request logging with timestamps and IPs
- [x] TypeScript compiles cleanly
- [x] Production build succeeds
- [x] Pushed to GitHub (commit: d908283)

### Credentials Updated
- [x] Username: `dina@lazerow.com`
- [x] Password: `1130`
- [x] **.env.local updated (NOT in git - stays local)**

---

## 🧪 Final Testing Before Users Access

### Step 1: Deploy to Vercel (if not auto-deployed)
```bash
# Check if auto-deploy is set up
vercel ls

# Or manually deploy
cd /Users/laz/Desktop/WADL/Clients/Merraine/AI
vercel --prod
```

### Step 2: Update Production Environment Variables
**CRITICAL:** The .env.local file doesn't deploy. You need to set these in Vercel dashboard:

1. Go to: https://vercel.com/your-project/settings/environment-variables
2. Add these variables to **Production**:
   - `AUTH_USERNAME` = `dina@lazerow.com`
   - `AUTH_PASSWORD` = `1130`
   - `PEARCH_API_KEY` = `pk_f3cc26cf14c163e59fc3ede5e553dbceb4f904c88c4bd8da`
3. Redeploy for changes to take effect

### Step 3: Test Login on Production
1. Go to: https://your-app.vercel.app/login
2. Login with:
   - Username: `dina@lazerow.com`
   - Password: `1130`
3. Should redirect to dashboard

### Step 4: Test Search Functionality
1. Go to Search page
2. Try a simple query: "React developers"
3. Should return results (or empty if no Pearch credits)
4. Check browser console for any errors

### Step 5: Test Rate Limiting (Optional)
Run this script from your machine:
```bash
# Fire 20 rapid requests (should block after 15)
for i in {1..20}; do
  curl -s https://your-app.vercel.app/api/search \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Cookie: merraine-auth=authenticated" \
    -d "{\"query\":\"test $i\",\"type\":\"fast\",\"limit\":1}" &
done
wait

# Check Vercel logs
vercel logs --follow
# Look for "Too many requests" errors after request 15
```

### Step 6: Monitor Logs
```bash
vercel logs --follow

# Watch for:
# - "endpoint": "/api/search" - successful searches
# - "Too many requests" - rate limiting triggered
# - Any error messages
```

---

## 📋 User Instructions

Share this with users:

---

### How to Access Merraine AI

**URL:** https://your-app.vercel.app

**Login Credentials:**
- Username: `dina@lazerow.com`
- Password: `1130`

**How to Search:**
1. Login with credentials above
2. Click "Search" in navigation
3. Enter your search query (e.g., "Senior React developers in Austin")
4. Select search type (Fast or Pro)
5. Click "Search"

**Features:**
- **Save Candidates:** Click save button on any result
- **Find Similar:** Click "Find Similar" to discover related profiles
- **Export:** Export results to CSV, Markdown, or JSON
- **View Saved:** Access saved candidates from navigation

**Credit System:**
- You start with 5,000 credits
- Fast search: 1 credit per profile
- Pro search: 5 credits per profile
- Additional features (email, phone) cost extra credits

**Rate Limits:**
- Maximum 15 searches per minute
- If you hit the limit, wait 60 seconds

**Support:**
- Issues? Contact Laz

---

## 🚨 Known Limitations (Communicate to Users)

1. **Credit tracking is client-side** - Refreshing browser may reset credit display
2. **Saved candidates are local** - Clearing browser data will delete saved profiles
3. **Single shared account** - All users use same credentials
4. **Rate limit is per-IP** - If multiple users share an IP, they share the 15/min limit

---

## 🔐 Security Notes

### What's Protected:
- ✅ Rate limiting prevents API abuse (15 searches/min)
- ✅ Auth required on all routes
- ✅ Pearch API key never exposed to browser
- ✅ Request logging for audit trail

### What's NOT Protected Yet:
- ❌ Credit manipulation (users can reset via DevTools)
- ❌ No per-user credit budgets
- ❌ Audit logs clear on server restart

**Recommendation:** For MVP/internal testing, this is fine. Before charging users or scaling, implement Phase 1 from BUILD_LOG.md (server-side credit validation).

---

## 🎯 Next Steps After Launch

### Immediate (First 24 Hours)
1. Monitor Vercel logs for errors
2. Watch for rate limiting triggers
3. Check if users report any issues

### Short-term (Next Week)
1. Gather user feedback
2. Adjust rate limits if needed (too strict/loose?)
3. Plan Phase 1: Server-side credit validation

### Medium-term (Next Month)
1. Implement database (Postgres/Supabase/PlanetScale)
2. Server-side credit tracking
3. Per-user authentication
4. Persistent audit logging

See `BUILD_LOG.md` for full roadmap.

---

## ✅ Final Checklist

Before sharing with users:

- [ ] Deployed to Vercel
- [ ] Environment variables set in Vercel dashboard
- [ ] Tested login on production URL
- [ ] Tested search works
- [ ] Confirmed rate limiting active
- [ ] Logs visible in Vercel dashboard
- [ ] Shared login credentials with users
- [ ] Communicated known limitations

---

## 🆘 Troubleshooting

### Login fails with correct credentials
- Check Vercel environment variables are set
- Redeploy after adding env vars
- Clear browser cookies and try again

### Search returns empty results
- Check Pearch API key is valid
- Verify credits available in Pearch account
- Check Vercel logs for API errors

### Rate limiting too aggressive
- Edit `app/api/search/route.ts` line 74
- Change `limit: 15` to higher number (e.g., `limit: 30`)
- Commit and push to GitHub
- Vercel will auto-deploy

### Users can't log in
- Verify you shared correct credentials
- Check they're not mistyping email (has @ symbol)
- Try incognito mode (clears cookies)

---

**Ready to launch!** ✨

Push to GitHub: ✅ Complete (commit d908283)
Credentials: ✅ Updated (dina@lazerow.com / 1130)
Build: ✅ Passing
Security: ✅ Enhanced (auth + rate limiting + logging)
