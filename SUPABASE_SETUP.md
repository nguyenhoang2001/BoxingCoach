# Supabase Setup Guide

## Step 1: Create Supabase Account and Project

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub or email
4. Create a new project:
   - Project name: `boxing-coach`
   - Database password: (save this securely)
   - Region: Choose closest to you
5. Wait for project to be created (~2 minutes)

## Step 2: Get Your API Keys

1. Go to Project Settings (gear icon)
2. Click "API" in the left sidebar
3. Copy these values:
   - **Project URL** - Copy and save
   - **anon (public) key** - Copy and save
   - **service_role (secret) key** - Copy and save (keep private!)

## Step 3: Create Database Tables

1. Go to "SQL Editor" in Supabase dashboard
2. Click "New Query"
3. Copy and paste the SQL below:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create training_sessions table
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  technique VARCHAR(100) NOT NULL,
  duration_seconds INT,
  score DECIMAL(5,2),
  velocity DECIMAL(5,2),
  accuracy DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_stats table
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_sessions INT DEFAULT 0,
  total_training_time INT DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0,
  best_score DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_training_sessions_user_id ON training_sessions(user_id);
CREATE INDEX idx_training_sessions_created_at ON training_sessions(created_at);
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
```

4. Click "Run"
5. Check that all tables were created successfully

## Step 4: Save Your Credentials

Create a `.env.example` file in your project root with:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Never commit actual keys to git!**

## Step 5: Create Backend Environment File

For Express backend (we'll create next), you'll need:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=your-jwt-secret-here
PORT=5000
NODE_ENV=development
```

---

## Database Schema Overview

### users table

- Stores user account information
- Email and hashed password for authentication
- Created and updated timestamps

### training_sessions table

- Records each training/punch session
- Links to user via user_id
- Stores technique, score, velocity, accuracy
- Created timestamp for tracking history

### user_stats table

- Aggregated statistics for each user
- Total sessions, training time, scores
- Updated whenever a new session is recorded

---

## Security Notes

✅ Enable RLS (Row Level Security) to ensure users can only access their own data
✅ Use service_role key only on backend
✅ Use anon key only on frontend
✅ Never commit secret keys to GitHub

---

## Next Steps

1. Complete this setup in Supabase dashboard
2. Save your credentials safely
3. We'll create the Express.js backend next
