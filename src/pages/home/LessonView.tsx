import styles from './LessonView.module.css';
import Header from './Header';

interface Technique {
  id: string;
  title: string;
  level: string;
  duration: string;
  image: string;
}

interface LessonViewProps {
  technique: Technique;
  onBack: () => void;
  onStartAnalysis: () => void;
}

// Technique data with tutorial videos and key points
const TECHNIQUE_DATA: Record<string, { videoUrl: string; keyPoints: string[] }> = {
  jab: {
    videoUrl: '/tutorial-videos/jab-video.mp4',
    keyPoints: [
      '1. Keep your guard up at all times.',
      '2. Extend your arm fully with a snap.',
      '3. Rotate your hips for power.',
    ],
  },
  cross: {
    videoUrl: '/tutorial-videos/cross-lesson.mp4',
    keyPoints: [
      '1. Generate power from your legs.',
      '2. Drive through your back shoulder.',
      '3. Keep your guard tight.',
    ],
  },
  hook: {
    videoUrl: '/tutorial-videos/hook-lesson.mp4',
    keyPoints: [
      '1. Pivot on your feet.',
      '2. Rotate your hips explosively.',
      '3. Keep your elbow up.',
    ],
  },
  uppercut: {
    videoUrl: '/tutorial-videos/uppercut-lesson.mp4',
    keyPoints: [
      '1. Bend your knees for leverage.',
      '2. Drive upward with your hips.',
      '3. Keep your guard up.',
    ],
  },
  footwork: {
    videoUrl: '/tutorial-videos/footwork-video.mp4',
    keyPoints: [
      '1. Keep your feet shoulder-width apart.',
      '2. Move in controlled steps.',
      '3. Maintain balance at all times.',
    ],
  },
  defense: {
    videoUrl: '/tutorial-videos/defense-video.mp4',
    keyPoints: [
      '1. Slip punches with head movement.',
      '2. Block with your forearms.',
      '3. Counter with composure.',
    ],
  },
};

export default function LessonView({
  technique,
  onBack,
  onStartAnalysis,
}: LessonViewProps): JSX.Element {
  const techniqueData = TECHNIQUE_DATA[technique.id] || TECHNIQUE_DATA.jab;

  return (
    <>
      <Header onBack={onBack} />
      <div className={styles.container}>
      {/* Lesson Title */}
      <h1 className={styles.lessonTitle}>LESSON: {technique.title.toUpperCase()}</h1>

      {/* Tutorial Video */}
      <div className={styles.videoContainer}>
        <video
          className={styles.video}
          controls
          crossOrigin="anonymous"
          key={techniqueData.videoUrl}
        >
          <source src={techniqueData.videoUrl} type="video/mp4" />
          <p style={{ color: '#fff', padding: '20px' }}>
            Your browser does not support the video tag or the video file format is not supported. 
            Please ensure the video is encoded in H.264 codec with AAC audio.
          </p>
        </video>
      </div>

      {/* Key Technique Points */}
      <div className={styles.keyPointsBox}>
        <h2 className={styles.keyPointsTitle}>KEY TECHNIQUE POINTS</h2>
        <ul className={styles.keyPointsList}>
          {techniqueData.keyPoints.map((point, index) => (
            <li key={index} className={styles.keyPointItem}>
              <span className={styles.pointIcon}>●</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Start Analysis Button */}
      <button className={styles.startButton} onClick={onStartAnalysis}>
        START ANALYSIS
      </button>
    </div>
    </>
  );
}
