import TechniqueCard from './TechniqueCard';
import styles from './FeaturedTechniques.module.css';

interface Technique {
  id: string;
  title: string;
  level: string;
  duration: string;
  image: string;
}

interface FeaturedTechniquesProps {
  onTechniqueSelect: (technique: Technique) => void;
}

const TECHNIQUES: Technique[] = [
  {
    id: 'jab',
    title: 'Jab',
    level: 'BEGINNER',
    duration: '5 MINS',
    image: '/jab-lesson.png',
  },
  {
    id: 'cross',
    title: 'Cross',
    level: 'INTERMEDIATE',
    duration: '7 MINS',
    image: '/cross-lesson.png',
  },
  {
    id: 'hook',
    title: 'Left Hook',
    level: 'PRO',
    duration: '7 MINS',
    image: '/left-hook-lesson.png',
  },
  {
    id: 'uppercut',
    title: 'Uppercut',
    level: 'PRO',
    duration: '8 MINS',
    image: '/uppercut-lesson.png',
  },
  {
    id: 'footwork',
    title: 'Footwork Drills',
    level: 'ALL LEVELS',
    duration: '10 MINS',
    image: '/footwork-lesson.png',
  },
  {
    id: 'defense',
    title: 'Defense Techniques',
    level: 'INTERMEDIATE',
    duration: '8 MINS',
    image: '/defensive-lesson.png',
  },
];

export default function FeaturedTechniques({
  onTechniqueSelect,
}: FeaturedTechniquesProps): JSX.Element {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Featured Techniques</h2>
      
      <div className={styles.grid}>
        {TECHNIQUES.map((technique) => (
          <TechniqueCard
            key={technique.id}
            title={technique.title}
            level={technique.level}
            duration={technique.duration}
            image={technique.image}
            onStart={() => onTechniqueSelect(technique)}
          />
        ))}
      </div>
    </section>
  );
}
