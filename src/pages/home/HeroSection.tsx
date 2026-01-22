import styles from './HeroSection.module.css';

interface HeroSectionProps {
  onStartTraining: () => void;
}

export default function HeroSection({ onStartTraining }: HeroSectionProps): JSX.Element {
  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <div className={styles.textContent}>
          <h1 className={styles.title}>
            Master the Art<br/>
            of Boxing
          </h1>
          <button className={styles.ctaButton} onClick={onStartTraining}>
            Start Training
          </button>
        </div>
        
        <div className={styles.imageContent}>
          <img 
            src="/boxer-punching.png" 
            alt="Boxer punching" 
            className={styles.boxerImage}
          />
        </div>
      </div>
      
      <div className={styles.gradient} />
    </section>
  );
}
