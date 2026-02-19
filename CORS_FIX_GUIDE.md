# 🔧 CORS Error Fix Guide

## 🎯 Problem Summary

You're seeing this CORS error:

```
Access to XMLHttpRequest at 'https://boxing-coach-123-361rdro98-nguyenhoang20015-projects.vercel.app/api/v1/auth/signup'
from origin 'https://...' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🔍 Root Cause

The **backend API** (not the frontend) is missing CORS headers. The backend needs to allow requests from your frontend domain.

## ✅ Solution: Fix Backend CORS Configuration

### Option 1: If Backend is on Railway

Your backend should already have CORS configured. You need to:

1. **Go to Railway Dashboard** → Your Backend Project → Variables
2. **Add/Update this environment variable**:

   ```
   CORS_ORIGIN=https://boxing-coach-123-361rdro98-nguyenhoang20015-projects.vercel.app,http://localhost:5173
   ```

3. **Redeploy** your backend for changes to take effect

### Option 2: If Backend is a Vercel Serverless Function

If your backend is deployed as Vercel serverless functions, you need to add CORS headers to your API routes.

**For each API route file**, add this at the top:

```typescript
// api/auth/signup.ts (example)
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*"); // Or specify your frontend URL
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Your actual API logic here
  if (req.method === "POST") {
    // Handle signup
  }
}
```

### Option 3: Add CORS Middleware (Express Backend)

If you're using Express.js, ensure your backend has this configuration:

```typescript
import cors from "cors";

const allowedOrigins = [
  "https://boxing-coach-123-361rdro98-nguyenhoang20015-projects.vercel.app",
  "http://localhost:5173",
  "http://localhost:5001",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Handle preflight for all routes
app.options("*", cors());
```

## 🔄 Current Setup Analysis

Based on your error screenshot, your **frontend** is trying to call:

```
https://boxing-coach-123-361rdro98-nguyenhoang20015-projects.vercel.app/api/v1/auth/signup
```

This suggests your `VITE_API_URL` environment variable is pointing to your **frontend URL** instead of your **backend URL**.

### Fix Frontend Environment Variable

1. **Check your `.env` or `.env.local` file**:

   ```env
   # ❌ WRONG - pointing to frontend
   VITE_API_URL=https://boxing-coach-123-361rdro98-nguyenhoang20015-projects.vercel.app/api/v1

   # ✅ CORRECT - should point to backend
   VITE_API_URL=https://your-backend-url.railway.app/api/v1
   ```

2. **Update Vercel Environment Variables**:
   - Go to your Vercel project → Settings → Environment Variables
   - Update `VITE_API_URL` to point to your **backend URL**
   - Example: `https://boxingcoach-backend.up.railway.app/api/v1`
   - **Redeploy** your frontend

## 🧪 Testing the Fix

### 1. Test Backend Health Endpoint

```bash
curl https://your-backend-url/health
```

Should return:

```json
{ "status": "ok", "timestamp": "2026-02-19T..." }
```

### 2. Test CORS Headers

```bash
curl -X OPTIONS https://your-backend-url/api/v1/auth/signup \
  -H "Origin: https://boxing-coach-123-361rdro98-nguyenhoang20015-projects.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Look for these headers in the response:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 3. Test Signup from Browser

Open your browser console and run:

```javascript
fetch("https://your-backend-url/api/v1/auth/signup", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "test@example.com",
    password: "Test123!",
    fullName: "Test User",
  }),
})
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
```

## 📋 Checklist

- [ ] Backend has CORS middleware installed and configured
- [ ] Backend environment has `CORS_ORIGIN` set to frontend URLs
- [ ] Frontend `VITE_API_URL` points to backend, not frontend
- [ ] Backend is deployed and running (check `/health` endpoint)
- [ ] Frontend is redeployed after environment variable changes
- [ ] Browser console shows no CORS errors
- [ ] Signup request successfully reaches backend

## 🆘 Still Having Issues?

If you're still seeing CORS errors after following this guide:

1. **Check backend logs** on Railway/Vercel to see if requests are arriving
2. **Verify the exact URL** your frontend is calling (check Network tab in DevTools)
3. **Ensure backend is actually running** (not crashed or sleeping)
4. **Check if backend has Express CORS package installed**: `npm list cors`

## 📚 Additional Resources

- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS Middleware](https://expressjs.com/en/resources/middleware/cors.html)
- [Vercel CORS Configuration](https://vercel.com/docs/edge-network/headers#cors)
