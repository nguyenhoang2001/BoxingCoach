import { useRef, useState } from 'react';
import StatContainer from './StatContainer';
import PunchScore from './PunchScore';
import PunchSettingButton from './PunchSettingButton';
import VideoDisplay from './VideoDisplay';
import StartStopButtons from './StartStopButtons';
import TipsPanel from './TipsPanel';
import { useWorkoutControl } from './hooks/useWorkoutControl';
import { PunchStat } from '../../components/boxing-pose/PunchStat';
import { PunchAnalysisService } from '../../components/boxing-pose/PunchAnalysisService';
import styles from './TrainingView.module.css';
import { DisplayVideoHandle } from './interfaces';

interface Technique {
  id: string;
  title: string;
  level: string;
  duration: string;
  image: string;
}

interface TrainingViewProps {
  technique: Technique;
  onBack: () => void;
}

export default function TrainingView({ technique, onBack }: TrainingViewProps): JSX.Element {
  const videoDisplayRef = useRef<DisplayVideoHandle>(null);
  const punchAnalysisService = useRef(new PunchAnalysisService());

  const [punchStat, setPunchStat] = useState<PunchStat>({
    leadHand: true,
    velocity: 0,
    leftShoulderAngle: 0,
    headAngle: 90,
    rightShoulderAngle: 0,
    hipRotation: 0,
    rightElbowAngle: 0,
    leftElbowAngle: 0,
  });

  const [selectedPunch, setSelectedPunch] = useState<string>(technique.title);
  const [selectedHand, setSelectedHand] = useState<string>('Left');
  const [punchScore, setPunchScore] = useState<number>(0);
  const [currentTip, setCurrentTip] = useState<string>('Guard your right hand up');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const {
    isRunning, 
    isInitialized,
    handleStart: hookHandleStart, 
    handleStop: hookHandleStop,
    setIsInitialized 
  } = useWorkoutControl({
    onStart: async () => {
      if (videoDisplayRef.current) {
        await videoDisplayRef.current.handleStart();
        setIsAnalyzing(true);
      }
    },
    onStop: () => {
      if (videoDisplayRef.current) {
        videoDisplayRef.current.handleStop();
        setIsAnalyzing(false);
      }
    },
    onProcessFrame: () => {
      if (videoDisplayRef.current) {
        videoDisplayRef.current.processFrame();
      }
    }
  });

  const handleMetricsUpdate = (stat: PunchStat) => {
    setPunchStat(stat);

    if (selectedPunch === 'Jab' && selectedHand === 'Left' && isAnalyzing) {
      const analysis = punchAnalysisService.current.analyzeJab(stat);
      setPunchScore(analysis.score);
      
      if (analysis.tips.length > 0) {
        const randomIndex = Math.floor(Math.random() * analysis.tips.length);
        setCurrentTip(analysis.tips[randomIndex]);
      }
    }
  };

  const handlePunchSelect = (punch: string) => {
    setSelectedPunch(punch);
  };

  const handleHandSelect = (hand: string) => {
    setSelectedHand(hand);
    if (videoDisplayRef.current && videoDisplayRef.current.setLeadHand) {
      videoDisplayRef.current.setLeadHand(hand === 'Left');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <button className={styles.backButton} onClick={onBack}>
          ← Back to Lessons
        </button>
        <h1 className={styles.title}>LESSON ANALYSIS: {technique.title.toUpperCase()}</h1>
      </div>
      
      <main className={styles.content}>
        {/* Left column - Video, tips and controls */}
        <div className={styles.leftColumn}>
          <div className={styles.videoContainer}>
            <VideoDisplay 
              ref={videoDisplayRef} 
              setIsInitialized={setIsInitialized}
              onMetricsUpdate={handleMetricsUpdate}
            />
          </div>

          <div className={styles.tipsSection}>
            <h3 className={styles.tipsSectionTitle}>TIPS</h3>
            <p className={styles.tipsText}>{currentTip}</p>
          </div>

          {/* <div className={styles.scoreSection}>
            <h3 className={styles.scoreTitle}>PUNCH SCORE</h3>
            <PunchScore score={punchScore}/>
          </div> */}
          <PunchScore score={50}/>
        </div>

        {/* Right column - Stats grid */}
        <div className={styles.rightColumn}>
          <div className={styles.statsGrid}>
            <StatContainer title="Head Angle" value={`${Math.round(punchStat.headAngle)}°`} color="#1c1c1c" indicatorColor="#812f30" icon="/icons/head.png" isImageIcon={true} />
            <StatContainer title="Velocity" value={`${Math.round(punchStat.velocity)} m/s`} color="#1c1c1c" indicatorColor="#812f30" icon="/icons/velocity.png" isImageIcon={true} />
            <StatContainer title="Acceleration" value={`${Math.round(punchStat.velocity)} m/s²`} color="#1c1c1c" indicatorColor="#812f30" icon="/icons/acceleration.png" isImageIcon={true} />
            <StatContainer title="Left Shoulder" value={`${Math.round(punchStat.leftShoulderAngle)}°`} color="#1c1c1c" indicatorColor="#812f30" icon="/icons/shoulder.png" isImageIcon={true} />
            <StatContainer title="Left Elbow" value={`${Math.round(punchStat.leftElbowAngle)}°`} color="#1c1c1c" indicatorColor="#812f30" icon="/icons/elbow.png" isImageIcon={true} />
            <StatContainer title="Hip Rotation" value={`${Math.round(punchStat.hipRotation)}°`} color="#1c1c1c" indicatorColor="#812f30" icon="/icons/rotation.png" isImageIcon={true} />
            <StatContainer title="Right Elbow" value={`${Math.round(punchStat.rightElbowAngle)}°`} color="#1c1c1c" indicatorColor="#812f30" icon="/icons/elbow.png" isImageIcon={true} />
            <StatContainer title="Right Shoulder" value={`${Math.round(punchStat.rightShoulderAngle)}°`} color="#1c1c1c" indicatorColor="#812f30" icon="/icons/shoulder.png" isImageIcon={true} />
          </div>
        </div>
      </main>
    </div>
  );
}
