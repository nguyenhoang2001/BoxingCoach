import { useState, useEffect } from 'react';
import Header from './Header';
import HeroSection from './HeroSection';
import FeaturedTechniques from './FeaturedTechniques';
import LessonView from './LessonView';
import TrainingView from './TrainingView';
import FootworkLesson from '../lessons/Footwork';
import DefenseLesson from '../lessons/Defense';
import Auth from '../auth/Auth';
import Profile from '../profile/Profile';
import styles from './home.module.css';

interface Technique {
  id: string;
  title: string;
  level: string;
  duration: string;
  image: string;
}

export default function Home(): JSX.Element {
  console.log('Home component rendering...');
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'login' | 'signup' | 'profile'>('home');

  // Handle URL-based navigation
  useEffect(() => {
    console.log('Home useEffect running...');
    const path = window.location.pathname;
    if (path === '/login') {
      setCurrentPage('login');
    } else if (path === '/signup') {
      setCurrentPage('signup');
    } else if (path === '/profile') {
      setCurrentPage('profile');
    } else {
      setCurrentPage('home');
    }
    console.log('Current page:', path);
  }, []);

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

  const handleBackToTutorial = () => {
    setIsAnalyzing(false); // Go back to lesson view without changing selectedTechnique
  };

  const handleStartAnalysis = () => {
    setIsAnalyzing(true); // Move to training/analysis view
  };

  // Scroll to top when footwork lesson is selected
  useEffect(() => {
    if (selectedTechnique?.id === 'footwork' || selectedTechnique?.id === 'defense') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedTechnique]);

  // Show auth page if requested
  if (currentPage === 'login' || currentPage === 'signup') {
    return <Auth initialTab={currentPage === 'signup' ? 'signup' : 'login'} />;
  }

  // Show profile page if requested
  if (currentPage === 'profile') {
    return <Profile onBack={() => {
      setCurrentPage('home');
      window.history.pushState({}, '', '/');
    }} />;
  }

  // If defense lesson is selected, show the defense component
  if (selectedTechnique?.id === 'defense') {
    return (
      <div className={styles.container}>
        <DefenseLesson onBack={handleBackToLessons} />
      </div>
    );
  }

  // If footwork lesson is selected, show the footwork component
  if (selectedTechnique?.id === 'footwork') {
    return (
      <div className={styles.container}>
        <FootworkLesson onBack={handleBackToLessons} />
      </div>
    );
  }

  // If a technique is selected and analysis started, show the training view
  if (selectedTechnique && isAnalyzing) {
    return (
      <div className={styles.container}>
        <TrainingView
          technique={selectedTechnique}
          onBack={handleBackToTutorial}
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
