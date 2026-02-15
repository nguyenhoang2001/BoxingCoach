# Frontend Integration Guide

This guide helps you connect your React frontend to the Express.js backend.

## Step 1: Install Axios

```bash
npm install axios
```

## Step 2: Create API Service

Create file: `src/services/api.ts`

```typescript
import axios, { AxiosInstance } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: Add JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: Handle responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear and redirect to login
      localStorage.removeItem("authToken");
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authAPI = {
  signup: (email: string, password: string, fullName: string) =>
    api.post("/auth/signup", { email, password, fullName }),

  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
};

// User API
export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (fullName: string) => api.put("/users/profile", { fullName }),
  getStats: () => api.get("/users/stats"),
};

// Training API
export const trainingAPI = {
  recordSession: (data: {
    technique: string;
    durationSeconds: number;
    score: number;
    velocity: number;
    accuracy: number;
  }) => api.post("/training/sessions", data),

  getSessions: (limit: number = 20, offset: number = 0) =>
    api.get("/training/sessions", { params: { limit, offset } }),

  getSession: (id: string) => api.get(`/training/sessions/${id}`),

  getStats: () => api.get("/training/stats"),
};

export default api;
```

## Step 3: Update Auth Component

Update `src/pages/auth/Auth.tsx`:

```typescript
import { useState } from 'react';
import { authAPI } from '../../services/api';
import styles from './Auth.module.css';

interface AuthProps {
  initialTab?: 'login' | 'signup';
  onAuthSuccess?: (token: string) => void;
}

export default function Auth({ initialTab = 'login', onAuthSuccess }: AuthProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      const response = await authAPI.login(email, password);
      const token = response.data.token;

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      onAuthSuccess?.(token);
      // Navigate to home or dashboard
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const fullName = formData.get('fullName') as string;

      const response = await authAPI.signup(email, password, fullName);
      const token = response.data.token;

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      onAuthSuccess?.(token);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.body}>
      <div className={styles.logo}>IBOX</div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.authContainer}>
        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'login' ? styles.active : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'signup' ? styles.active : ''}`}
            onClick={() => setActiveTab('signup')}
          >
            Sign Up
          </button>
        </div>

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className={styles.form}>
            <h1 className={styles.authTitle}>Welcome Back</h1>
            <p className={styles.authSubtitle}>Continue your boxing journey</p>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email</label>
              <input
                type="email"
                name="email"
                className={styles.formInput}
                placeholder="your@email.com"
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Password</label>
              <input
                type="password"
                name="password"
                className={styles.formInput}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {/* Signup Form */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignupSubmit} className={styles.form}>
            <h1 className={styles.authTitle}>Start Training</h1>
            <p className={styles.authSubtitle}>Join IBOX and master your skills</p>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Full Name</label>
              <input
                type="text"
                name="fullName"
                className={styles.formInput}
                placeholder="John Doe"
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email</label>
              <input
                type="email"
                name="email"
                className={styles.formInput}
                placeholder="your@email.com"
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Password</label>
              <input
                type="password"
                name="password"
                className={styles.formInput}
                placeholder="Create a password"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

## Step 4: Add Environment Variables

Create `.env.local` in your React project:

```
VITE_API_URL=http://localhost:5000/api/v1
```

For production on Vercel, add in project settings:

```
VITE_API_URL=https://your-backend-url.herokuapp.com/api/v1
```

## Step 5: Create Auth Context (Optional)

For managing auth state across app:

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage on mount
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

    setIsLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## Step 6: Example - Save Training Session

After punch analysis completes:

```typescript
// In your training/analysis component
import { trainingAPI } from "../../services/api";

async function savePunchSession(score: number, velocity: number) {
  try {
    const response = await trainingAPI.recordSession({
      technique: "Jab",
      durationSeconds: 180,
      score,
      velocity,
      accuracy: 92.0,
    });
    console.log("Session saved:", response.data);
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}
```

## Step 7: Test Everything

1. **Start backend:**

   ```bash
   cd BoxingCoach-Backend
   npm run dev
   ```

2. **In another terminal, start frontend:**

   ```bash
   npm run dev
   ```

3. **Test signup:**
   - Go to http://localhost:5173
   - Click "Sign Up"
   - Fill in form
   - Should create account and save token

4. **Test login:**
   - Logout
   - Click "Login"
   - Use credentials from signup

## Troubleshooting

### "API calls 404 errors"

- Check backend is running on port 5000
- Verify `VITE_API_URL` in `.env.local`
- Check CORS settings in backend

### "CORS errors"

- Backend `.env` has correct `CORS_ORIGIN`
- Includes both localhost and production URLs

### "Token errors"

- Check localStorage has `authToken`
- Token might be expired (valid for 7 days)
- Try logout and login again

## Next: Build Features

Now you can:

1. ✅ Save training sessions automatically
2. ✅ Load user profile on app start
3. ✅ Create stats dashboard
4. ✅ Add progress tracking
5. ✅ Build leaderboard

Good luck! 🥊
