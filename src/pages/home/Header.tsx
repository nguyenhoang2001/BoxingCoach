import { useState, useEffect } from "react";
import styles from "./header.module.css";

interface HeaderProps {
    onBack?: () => void;
    backButtonLabel?: string;
}

export default function Header({ onBack, backButtonLabel = "Back to Lessons" }: HeaderProps): JSX.Element {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem('authToken');
        setIsAuthenticated(!!token);

        // Listen for storage changes (login/logout events)
        const handleStorageChange = () => {
            const token = localStorage.getItem('authToken');
            setIsAuthenticated(!!token);
        };

        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        window.location.href = '/';
    };

    return (
        <header className={styles.container} role="banner">
            <div className={styles.left}>
                {onBack && (
                    <button className={styles.backButton} onClick={onBack} aria-label={backButtonLabel}>
                        ← {backButtonLabel}
                    </button>
                )}
                <a href="/" className={styles.logoLink} aria-label="IBOX Home">
                    <div className={styles.logo} aria-hidden="true" />
                    <div className={styles.title}>IBOX</div>
                </a>
            </div>

            <nav className={styles.right} aria-label="Main navigation">
                <a href="/lessons" className={styles.navLink}>
                    Lessons
                </a>

                {isAuthenticated ? (
                    <>
                        <a href="/profile" className={styles.navLink}>
                            Profile
                        </a>
                        <button
                            className={styles.logoutButton}
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <a
                          href="/login"
                          className={styles.loginLink}
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.href = '/login';
                          }}
                        >
                            Login
                        </a>

                        <a
                          href="/signup"
                          className={styles.signupButton}
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.href = '/signup';
                          }}
                        >
                            Sign Up
                        </a>
                    </>
                )}
            </nav>
        </header>
    );
}