# 🥊 Boxing Coach - Deployment Guide

## Quick Deploy to Vercel

### Option 1: One-Click Deploy (Easiest)

Click the button below to deploy to Vercel instantly:

```
https://vercel.com/new?repository-url=https://github.com/nguyenhoang2001/BoxingCoach
```

### Option 2: Manual Deployment

#### Prerequisites

- GitHub account
- OpenAI API key (from https://platform.openai.com/api-keys)

#### Steps

1. **Fork or Push to GitHub**
   - Ensure your code is pushed to GitHub (already done ✅)

2. **Go to Vercel**
   - Visit https://vercel.com
   - Sign up/login with GitHub

3. **Import Project**
   - Click "Add New" → "Project"
   - Select `BoxingCoach` repository
   - Click "Import"

4. **Set Environment Variables**
   - In the "Environment Variables" section, add:
     ```
     Name: VITE_OPENAI_API_KEY
     Value: sk-proj-your-actual-key-here
     ```
   - Click "Add"

5. **Deploy**
   - Click "Deploy"
   - Wait 2-5 minutes for deployment to complete

6. **Get Your Live URL**
   - After deployment, you'll see:
     ```
     ✅ Production Deployment Ready
     https://boxing-coach.vercel.app
     ```

### Automatic Deployments

Once deployed:

- Every push to `main` branch automatically redeploys
- Preview deployments for pull requests
- Rollback to previous versions with one click

## Environment Variables

### Required

- `VITE_OPENAI_API_KEY` - Your OpenAI API key for ChatGPT coaching tips

### Optional

- None at the moment

## Features Deployed

✅ Real-time pose detection with MoveNet  
✅ Live punch analysis (Jab, Cross, Hook, Uppercut, etc.)  
✅ OpenAI ChatGPT coaching tips (every 4 seconds)  
✅ Real-time metrics display  
✅ Punch form scoring  
✅ Responsive design

## Troubleshooting

### Deployment Failed?

1. Check that `npm run build` works locally:

   ```bash
   npm install
   npm run build
   ```

2. Check build logs on Vercel dashboard

3. Ensure all environment variables are set correctly

### ChatGPT Tips Not Working?

1. Verify `VITE_OPENAI_API_KEY` is set in Vercel environment
2. Check your OpenAI account has credits
3. Open browser console (F12) to see error messages

### Camera Not Working?

- Requires HTTPS (Vercel uses HTTPS ✅)
- Allow browser camera permissions
- Use Chrome/Firefox/Safari (latest versions)

## Custom Domain (Optional)

1. Go to your Vercel project settings
2. Click "Domains"
3. Add your custom domain
4. Update DNS records according to instructions

## Support

- 📖 [Vercel Docs](https://vercel.com/docs)
- 🆘 [Vercel Support](https://vercel.com/support)
- 🤖 [OpenAI Docs](https://platform.openai.com/docs)
