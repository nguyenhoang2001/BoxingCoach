# 🔧 Fix 405 Error - Deployment Configuration

## ❌ Problem Identified

Your signup is trying to POST to:

```
https://boxing-coach-123.vercel.app/boxingcoach-backend-405
```

This is **WRONG** because:

1. ❌ You're POSTing to your Vercel frontend URL (which only serves static files)
2. ❌ Vercel can't handle POST requests - it only serves your React app
3. ❌ Your backend is on Railway, NOT Vercel

## ✅ Solution: Fix Environment Variables

### Step 1: Find Your Railway Backend URL

1. Go to https://railway.app
2. Open your BoxingCoach-Backend project
3. Click on "Settings" → "Networking"
4. Copy your Railway URL (should look like):
   ```
   https://boxingcoach-backend-production.up.railway.app
   ```

### Step 2: Update Vercel Environment Variables

1. Go to https://vercel.com
2. Open your BoxingCoach project (boxing-coach-123)
3. Go to **Settings** → **Environment Variables**
4. Add/Update this variable:

   ```
   Name: VITE_API_URL
   Value: https://your-railway-url.up.railway.app/api/v1
   ```

   Example:

   ```
   Name: VITE_API_URL
   Value: https://boxingcoach-backend-production.up.railway.app/api/v1
   ```

5. Click "Save"
6. **IMPORTANT**: Go to "Deployments" tab and click "Redeploy" for the change to take effect

### Step 3: Verify Railway Backend is Running

Check these on Railway:

#### ✅ Environment Variables on Railway:

```env
NODE_ENV=production
PORT=5001
SUPABASE_URL=https://nshbmpyanotocyfdfgfd.supabase.co
SUPABASE_SERVICE_KEY=<your-supabase-service-key>
JWT_SECRET=<your-jwt-secret>
```

**Note:** You need the **Service Role Key** from Supabase, NOT the Anon key!

#### ✅ Test Your Railway Backend:

Open this URL in your browser:

```
https://your-railway-url.up.railway.app/health
```

You should see:

```json
{ "status": "ok", "timestamp": "..." }
```

If you get an error, your backend isn't running properly.

## 🔍 Diagnostic Checklist

### 1. Check Vercel Environment Variables

```bash
# Your Vercel should have:
VITE_API_URL=https://your-railway-backend.up.railway.app/api/v1
VITE_OPENAI_API_KEY=sk-proj-...
VITE_SUPABASE_URL=https://nshbmpyanotocyfdfgfd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Check Railway Environment Variables

```bash
# Your Railway should have:
NODE_ENV=production
PORT=5001
SUPABASE_URL=https://nshbmpyanotocyfdfgfd.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (SERVICE ROLE KEY!)
JWT_SECRET=your-very-long-random-secret-string
```

### 3. Get Supabase Service Role Key

**CRITICAL:** You're using the wrong Supabase key!

1. Go to https://supabase.com/dashboard
2. Select your project: `nshbmpyanotocyfdfgfd`
3. Go to **Settings** → **API**
4. Copy the **`service_role` key** (NOT the anon key!)
5. Add it to Railway as `SUPABASE_SERVICE_KEY`

### 4. Test Backend Endpoints

After Railway is configured, test these URLs:

```bash
# Health check
GET https://your-railway-url.up.railway.app/health

# API health
GET https://your-railway-url.up.railway.app/api/v1/health

# Signup test (should work after fixing env vars)
POST https://your-railway-url.up.railway.app/api/v1/auth/signup
Body: {
  "email": "test@example.com",
  "password": "test123",
  "fullName": "Test User"
}
```

## 🚀 Quick Fix Steps

1. **Railway**: Add/verify environment variables (especially SUPABASE_SERVICE_KEY)
2. **Vercel**: Set VITE_API_URL to your Railway backend URL
3. **Vercel**: Redeploy your frontend
4. **Test**: Try signing up again

## 📋 Common Issues

### Issue: 405 Method Not Allowed

- **Cause**: Frontend is POSTing to Vercel instead of Railway
- **Fix**: Update VITE_API_URL in Vercel and redeploy

### Issue: 401 Unauthorized

- **Cause**: Wrong Supabase key (using anon key instead of service_role)
- **Fix**: Get service_role key from Supabase and add to Railway

### Issue: Connection refused

- **Cause**: Railway backend is not running
- **Fix**: Check Railway logs, verify environment variables

### Issue: CORS error

- **Cause**: Backend CORS not configured properly
- **Fix**: Verify your backend CORS allows your Vercel domain

## 🔗 Correct Architecture

```
User Browser
    ↓
Vercel Frontend (https://boxing-coach-123.vercel.app)
    ↓ API Calls (VITE_API_URL)
Railway Backend (https://your-backend.up.railway.app)
    ↓
Supabase Database (PostgreSQL)
```

## 📝 Environment Variables Summary

### Vercel (Frontend) - 4 variables:

1. `VITE_API_URL` → Railway backend URL + /api/v1
2. `VITE_OPENAI_API_KEY` → Your OpenAI key
3. `VITE_SUPABASE_URL` → Your Supabase project URL
4. `VITE_SUPABASE_ANON_KEY` → Supabase anon key (for client-side auth)

### Railway (Backend) - 5 variables:

1. `NODE_ENV` → production
2. `PORT` → 5001
3. `SUPABASE_URL` → Your Supabase project URL
4. `SUPABASE_SERVICE_KEY` → Supabase SERVICE ROLE key (NOT anon!)
5. `JWT_SECRET` → Random secret string for JWT signing

## 🎯 Next Steps

After fixing:

1. ✅ Verify Railway backend is accessible
2. ✅ Update Vercel VITE_API_URL
3. ✅ Redeploy Vercel frontend
4. ✅ Test signup on production URL
5. ✅ Check browser console for correct API URL

---

**Need Help?**

- Check Railway logs for backend errors
- Check browser console for exact error messages
- Verify all environment variables are set correctly
