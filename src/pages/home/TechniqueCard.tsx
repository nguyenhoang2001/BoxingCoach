import styles from './TechniqueCard.module.css';

interface TechniqueCardProps {
  image: string;
  title: string;
  level: string;
  duration: string;
  onStart: () => void;
}

export default function TechniqueCard({
  image,
  title,
  level,
  duration,
  onStart,
}: TechniqueCardProps): JSX.Element {
  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <img src={image} alt={title} className={styles.image} />
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        
        <div className={styles.metadata}>
          <span className={styles.level}>{level}</span>
          <span className={styles.duration}>{duration}</span>
        </div>
        
        <button className={styles.button} onClick={onStart}>
          Start Lesson
        </button>
      </div>
    </div>
  );
}
