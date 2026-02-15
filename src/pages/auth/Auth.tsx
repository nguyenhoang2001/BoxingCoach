import { useState } from 'react';
import styles from './Auth.module.css';
import { authAPI } from '../../services/api';

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
      // Trigger a storage event to notify other components
      window.dispatchEvent(new Event('storage'));
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
      // Trigger a storage event to notify other components
      window.dispatchEvent(new Event('storage'));
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

        {/* Login Tab Content */}
        {activeTab === 'login' && (
          <div className={styles.tabContent}>
            <h1 className={styles.authTitle}>Welcome Back</h1>
            <p className={styles.authSubtitle}>Continue your boxing journey</p>

            <form onSubmit={handleLoginSubmit}>
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

              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="remember" className={styles.checkboxInput} />
                <label htmlFor="remember" className={styles.checkboxLabel}>
                  Remember me
                </label>
              </div>

              <div className={styles.forgotPassword}>
                <a href="#">Forgot password?</a>
              </div>

              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <div className={styles.divider}>
                <div className={styles.dividerLine}></div>
                <span className={styles.dividerText}>Or continue with</span>
                <div className={styles.dividerLine}></div>
              </div>

              <div className={styles.socialButtons}>
                <button type="button" className={styles.btnSocial}>
                  <span>🔵</span> Google
                </button>
                <button type="button" className={styles.btnSocial}>
                  <span>📘</span> Facebook
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sign Up Tab Content */}
        {activeTab === 'signup' && (
          <div className={styles.tabContent}>
            <h1 className={styles.authTitle}>Start Training</h1>
            <p className={styles.authSubtitle}>Join IBOX and master your skills</p>

            <form onSubmit={handleSignupSubmit}>
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

              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="terms" className={styles.checkboxInput} required />
                <label htmlFor="terms" className={styles.checkboxLabel}>
                  I agree to the Terms & Conditions
                </label>
              </div>

              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>

              <div className={styles.divider}>
                <div className={styles.dividerLine}></div>
                <span className={styles.dividerText}>Or sign up with</span>
                <div className={styles.dividerLine}></div>
              </div>

              <div className={styles.socialButtons}>
                <button type="button" className={styles.btnSocial}>
                  <span>🔵</span> Google
                </button>
                <button type="button" className={styles.btnSocial}>
                  <span>📘</span> Facebook
                </button>
              </div>
            </form>

            <div className={styles.features}>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>🥊</span>
                <span>Expert boxing lessons & techniques</span>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>⏱️</span>
                <span>Shadow boxing timer & drills</span>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>📊</span>
                <span>Track progress & achievements</span>
              </div>
            </div>
          </div>
        )}

        <div className={styles.backLink}>
          <a href="/">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
