import styles from "./header.module.css";

export default function Header(): JSX.Element {
    return (
        <header className={styles.container} role="banner">
            <div className={styles.left}>
                <a href="/" className={styles.logoLink} aria-label="IBOX Home">
                    <div className={styles.logo} aria-hidden="true" />
                    <div className={styles.title}>IBOX</div>
                </a>
            </div>

            <nav className={styles.right} aria-label="Main navigation">
                <a href="/" className={styles.navLink}>
                    Home
                </a>

                <a href="/contact" className={styles.navLink}>
                    Contact
                </a>

                <button className={styles.signUp} type="button">
                    Sign Up
                </button>
            </nav>
        </header>
    );
}