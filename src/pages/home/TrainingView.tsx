import { useRef, useState, useEffect } from 'react';
import Header from './Header';
import StatContainer from './StatContainer';
import PunchScore from './PunchScore';
import VideoDisplay from './VideoDisplay';
import { useWorkoutControl } from './hooks/useWorkoutControl';
import { PunchStat } from '../../components/boxing-pose/PunchStat';
import { PunchAnalysisService } from '../../components/boxing-pose/PunchAnalysisService';
import { getOpenAIBoxingTips, getLocalBoxingTips } from '../../services/boxingCoachAI';
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
  const [punchScore, setPunchScore] = useState<number>(0);
  const [currentTip, setCurrentTip] = useState<string>('Position yourself in front of the camera to begin...');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [lastTipUpdate, setLastTipUpdate] = useState<number>(0);
  const [feedbackHistory, setFeedbackHistory] = useState<string[]>([]);

  const {
    isInitialized,
    handleStart: hookHandleStart, 
    handleStop: hookHandleStop,
    setIsInitialized 
  } = useWorkoutControl({
    onStart: async () => {
      if (videoDisplayRef.current) {
        await videoDisplayRef.current.handleStart();
        setIsAnalyzing(true);
        setCurrentTip('Getting ready for analysis...');
      }
    },
    onStop: () => {
      if (videoDisplayRef.current) {
        videoDisplayRef.current.handleStop();
        setIsAnalyzing(false);
        setCurrentTip('Analysis stopped');
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

    // Always analyze punch form based on selected punch type
    let analysis;
    
    // Analyze based on punch type
    if (selectedPunch === 'Jab') {
      analysis = punchAnalysisService.current.analyzeJab(stat);
    } else if (selectedPunch === 'Cross') {
      analysis = punchAnalysisService.current.analyzeCross(stat);
    } else if (selectedPunch === 'Hook') {
      analysis = punchAnalysisService.current.analyzeHook(stat);
    } else if (selectedPunch === 'Uppercut') {
      analysis = punchAnalysisService.current.analyzeUppercut(stat);
    } else {
      analysis = punchAnalysisService.current.analyzeJab(stat); // Use Jab analysis as fallback
    }

    // Update the punch score every frame
    setPunchScore(analysis.score);

    // Debounce OpenAI API calls - only call every 4 seconds, and only when analyzing
    if (isAnalyzing) {
      const now = Date.now();
      if (now - lastTipUpdate >= 4000) {
        setLastTipUpdate(now);
        updateTipsWithOpenAI(stat, analysis.score, analysis.feedback);
      }
    }
  };

  /**
   * Update tips using OpenAI ChatGPT (with fallback to local tips)
   */
  const updateTipsWithOpenAI = async (stat: PunchStat, score: number, feedback: string[]) => {
    try {
      // Try to get ChatGPT tips
      const result = await getOpenAIBoxingTips(selectedPunch, stat, score, feedbackHistory);

      // Update tips, showing first one and storing the rest
      if (result.tips.length > 0) {
        setCurrentTip(result.tips[0]);
        setFeedbackHistory(result.tips);
      }
    } catch (error) {
      console.error('Error getting ChatGPT tips:', error);
      // Fallback to local tips
      const localTips = getLocalBoxingTips(selectedPunch, stat, score);
      if (localTips.length > 0) {
        setCurrentTip(localTips[0]);
        setFeedbackHistory(localTips);
      }
    }
  };

  // Set the selected punch based on the technique prop
  useEffect(() => {
    setSelectedPunch(technique.title);
  }, [technique.title]);

  // Auto-start analysis when initialized
  useEffect(() => {
    if (isInitialized && !isAnalyzing) {
      hookHandleStart();
    }
  }, [isInitialized, isAnalyzing, hookHandleStart]);

  // Request initial tip when analysis starts
  useEffect(() => {
    if (isAnalyzing && selectedPunch) {
      // Trigger first tip update after a short delay to allow metrics to populate
      const timer = setTimeout(() => {
        if (lastTipUpdate === 0) {
          setLastTipUpdate(Date.now());
          updateTipsWithOpenAI(punchStat, punchScore, []);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAnalyzing]);

  // Cleanup when component unmounts (when user goes back)
  useEffect(() => {
    return () => {
      // Stop analysis
      if (isAnalyzing) {
        hookHandleStop();
      }
      // Reset all states
      setPunchStat({
        leadHand: true,
        velocity: 0,
        leftShoulderAngle: 0,
        headAngle: 90,
        rightShoulderAngle: 0,
        hipRotation: 0,
        rightElbowAngle: 0,
        leftElbowAngle: 0,
      });
      setPunchScore(0);
      setCurrentTip('Position yourself in front of the camera to begin...');
      setLastTipUpdate(0);
      setFeedbackHistory([]);
      setIsInitialized(false);
    };
  }, []);

  return (
    <>
      <Header onBack={onBack} backButtonLabel="Back to Tutorial" />
      <div className={styles.container}>
        <div className={styles.topRow}>
          <h1 className={styles.title}>LESSON ANALYSIS: {technique.title.toUpperCase()}</h1>
        </div>
      
      <main className={styles.content}>
        {/* Left column - Video, tips and controls */}
        <div className={styles.leftColumn}>
          <div className={styles.videoContainer}>
            {!isInitialized && (
              <div className={styles.loadingOverlay}>
                <div className={styles.spinner}></div>
                <p>Initializing Camera...</p>
              </div>
            )}
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

          <PunchScore score={punchScore}/>
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
    </>
  );
}
