# 🔧 CORS Error Fix - Step-by-Step Guide

## 🔍 Problem Analysis

From your console error:

```
POST https://boxing-coach-123-361rdro98-nguyenhoang20015-projects.vercel.app/api/v1/auth/signup
CORS Error: No 'Access-Control-Allow-Origin' header
```

**Root Cause:** Your frontend is trying to call the API on the **same Vercel URL** (frontend), but your backend is actually deployed on **Railway**.

---

## ✅ Solution: Fix Environment Variables

### Step 1: Find Your Railway Backend URL

1. Go to https://railway.app and login
2. Open your **BoxingCoach-Backend** project
3. Click on your service/deployment
4. Look for the domain/URL (should look like):
   ```
   https://boxingcoach-backend-production.up.railway.app
   ```
   OR
   ```
   https://boxing-coach-backend.railway.app
   ```

**Copy this URL** - you'll need it in the next step!

---

### Step 2: Update Environment Variable on Vercel

1. Go to https://vercel.com and login
2. Select your **BoxingCoach** (frontend) project
3. Click **Settings** → **Environment Variables**
4. Look for `VITE_API_URL`
   - If it exists, **click Edit**
   - If it doesn't exist, **click Add New**

5. Set the value to your Railway URL + `/api/v1`:

   ```
   VITE_API_URL=https://your-railway-url.up.railway.app/api/v1
   ```

   **Example:**

   ```
   VITE_API_URL=https://boxingcoach-backend-production.up.railway.app/api/v1
   ```

6. Click **Save**

---

### Step 3: Add CORS Environment Variable to Railway Backend

1. Go back to **Railway Dashboard**
2. Open your **BoxingCoach-Backend** project
3. Click **Variables** tab
4. Add or update this variable:

   ```
   Name: CORS_ORIGIN
   Value: https://boxing-coach-123-361rdro98-nguyenhoang20015-projects.vercel.app,http://localhost:5173
   ```

   **Important:** Use **YOUR actual Vercel frontend URL** (the one showing in the error)

5. Click **Deploy** or **Save** (Railway will automatically redeploy)

---

### Step 4: Redeploy Frontend on Vercel

**IMPORTANT:** Environment variable changes don't take effect until you redeploy!

1. In Vercel, go to **Deployments** tab
2. Click the **three dots (...)** on the latest deployment
3. Click **Redeploy**
4. Wait 1-2 minutes for deployment to complete

---

## 🧪 Test the Fix

### Test 1: Check Backend is Accessible

Open this URL in your browser (replace with YOUR Railway URL):

```
https://your-railway-url.up.railway.app/health
```

You should see:

```json
{ "status": "ok", "timestamp": "..." }
```

If you get an error, your backend isn't running properly.

### Test 2: Try Signup Again

1. Go to your Vercel frontend URL
2. Click "Sign Up"
3. Fill in the form
4. Submit

**Expected result:** Account should be created successfully ✅

---

## 🔍 Verify Configuration

### Check Railway Backend Environment Variables

Your Railway should have these variables:

```env
NODE_ENV=production
PORT=5001
SUPABASE_URL=https://nshbmpyanotocyfdfgfd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
JWT_SECRET=<random-secret-string>
CORS_ORIGIN=<your-vercel-frontend-url>
```

**CRITICAL:** Make sure you're using the **SERVICE ROLE KEY** from Supabase, NOT the anon key!

To get the Service Role Key:

1. Go to https://supabase.com/dashboard
2. Select your project: `nshbmpyanotocyfdfgfd`
3. Go to **Settings** → **API**
4. Copy the **`service_role`** key (NOT anon!)

### Check Vercel Frontend Environment Variables

Your Vercel should have:

```env
VITE_API_URL=<your-railway-backend-url>/api/v1
VITE_OPENAI_API_KEY=<your-openai-key>
VITE_SUPABASE_URL=https://nshbmpyanotocyfdfgfd.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

---

## 🐛 Troubleshooting

### Still getting CORS error?

1. **Check Browser Console**
   - Press F12
   - Look at the Network tab
   - Check what URL is being called
   - It should be your Railway URL, NOT Vercel URL

2. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or use incognito/private mode

3. **Verify Railway Logs**
   - Go to Railway → Your Project → Deployments
   - Check logs for CORS errors
   - Should see: `🔒 CORS Origins: <your-vercel-url>`

### Backend not responding?

1. Check Railway logs for errors
2. Verify all environment variables are set
3. Make sure the port is set to `5001` or `PORT` variable is configured
4. Try redeploying Railway backend

### Wrong URL in requests?

If the API calls are still going to Vercel instead of Railway:

1. Make sure you added `VITE_API_URL` in Vercel
2. Make sure you **redeployed** after adding the variable
3. Check the variable is in "Production" environment

---

## 📋 Quick Checklist

- [ ] Found Railway backend URL
- [ ] Added/Updated `VITE_API_URL` in Vercel settings
- [ ] Added `CORS_ORIGIN` in Railway settings
- [ ] Redeployed Vercel frontend
- [ ] Tested backend `/health` endpoint
- [ ] Verified CORS_ORIGIN includes Vercel frontend URL
- [ ] Tested signup functionality
- [ ] Checked browser console for correct API URL

---

## ✅ Expected Results

After following all steps:

1. **Browser Network Tab** should show requests to:

   ```
   https://your-railway-url.up.railway.app/api/v1/auth/signup
   ```

2. **Response** should be `200 OK` or `201 Created`

3. **No CORS errors** in console

4. **Signup/Login** should work properly

---

**Need more help?**

Check Railway logs and browser console, then share the exact error messages.
