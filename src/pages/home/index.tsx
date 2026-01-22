import { useState } from 'react';
import Header from './Header';
import HeroSection from './HeroSection';
import FeaturedTechniques from './FeaturedTechniques';
import LessonView from './LessonView';
import TrainingView from './TrainingView';
import styles from './home.module.css';

interface Technique {
  id: string;
  title: string;
  level: string;
  duration: string;
  image: string;
}

export default function Home(): JSX.Element {
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const handleStartTraining = () => {
    // Scroll to featured techniques section
    const element = document.getElementById('featured-techniques');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTechniqueSelect = (technique: Technique) => {
    setSelectedTechnique(technique);
    setIsAnalyzing(false); // Start with lesson view
  };

  const handleBackToLessons = () => {
    setSelectedTechnique(null);
    setIsAnalyzing(false);
  };

  const handleStartAnalysis = () => {
    setIsAnalyzing(true); // Move to training/analysis view
  };

  // If a technique is selected and analysis started, show the training view
  if (selectedTechnique && isAnalyzing) {
    return (
      <div className={styles.container}>
        <TrainingView 
          technique={selectedTechnique} 
          onBack={handleBackToLessons}
        />
      </div>
    );
  }

  // If a technique is selected, show the lesson view first
  if (selectedTechnique) {
    return (
      <div className={styles.container}>
        <LessonView 
          technique={selectedTechnique} 
          onBack={handleBackToLessons}
          onStartAnalysis={handleStartAnalysis}
        />
      </div>
    );
  }

  // Otherwise show the main homepage with hero and lessons
  return (
    <div className={styles.container}>
      <Header />
      
      <main className={styles.main}>
        <HeroSection onStartTraining={handleStartTraining} />
        
        <div id="featured-techniques">
          <FeaturedTechniques onTechniqueSelect={handleTechniqueSelect} />
        </div>
      </main>
    </div>
  );
}
