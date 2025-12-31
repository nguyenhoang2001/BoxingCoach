import { useRef, useState } from 'react';
import Header from './Header';
import StatContainer from './StatContainer';
import PunchScore from './PunchScore';
import PunchSettingButton from './PunchSettingButton';
import VideoDisplay from './VideoDisplay';
import StartStopButtons from './StartStopButtons';
import TipsPanel from './TipsPanel';
import { useWorkoutControl } from './hooks/useWorkoutControl';
import { PunchStat } from '../../components/boxing-pose/PunchStat';
import { PunchAnalysisService } from '../../components/boxing-pose/PunchAnalysisService';
import styles from './home.module.css';
import { DisplayVideoHandle } from './interfaces';

export default function Home(): JSX.Element {
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

  const [selectedPunch, setSelectedPunch] = useState<string>('Jab');
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
        setIsAnalyzing(true); // Enable analysis when started
      }
    },
    onStop: () => {
      if (videoDisplayRef.current) {
        videoDisplayRef.current.handleStop();
        setIsAnalyzing(false); // Disable analysis when stopped
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

    // Analyze jab if user selected Jab and Left hand
    if (selectedPunch === 'Jab' && selectedHand === 'Left') {
      const analysis = punchAnalysisService.current.analyzeJab(stat);
      setPunchScore(analysis.score);
      
      // Update tip with random tip from analysis
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
      <Header/>
      
      <main className={styles.content}>
        {/* Left column */}
        <div className={styles.leftColumn}>
          <VideoDisplay 
            ref={videoDisplayRef} 
            setIsInitialized={setIsInitialized}
            onMetricsUpdate={handleMetricsUpdate}
          />
          
          <div className={styles.controlsGroup}>
            <StartStopButtons 
              onStart={hookHandleStart}
              onStop={hookHandleStop}
              isRunning={isRunning}
              isReady={isInitialized}
            />
            <TipsPanel tip={currentTip} />
          </div>

          <div className={styles.settingsRow}>
            <PunchSettingButton 
              title="Jab" 
              subtitle="Select to Learn"
              options={['Jab', 'Cross']}
              onSelect={handlePunchSelect}
            />

            <PunchSettingButton 
              title="Left" 
              subtitle="Lead Hand"
              options={['Left', 'Right']}
              onSelect={handleHandSelect}
            />
          </div>
        </div>

        {/* Right column */}
        <div className={styles.rightColumn}>
          <div className={styles.statsGrid}>
            <StatContainer title="Head Angle" value={`${punchStat.headAngle}°`} color="#483700" indicatorColor="#faa505" />
            {/* <StatContainer title="Velocity" value={`${punchStat.velocity.toFixed(0)} px/s`} color="#475201" indicatorColor="#dafd05" /> */}
            <StatContainer title="Hip Rotation" value={`${punchStat.hipRotation.toFixed(0)}°`} color="#483700" indicatorColor="#faa505" />
            <StatContainer title="Left Shoulder" value={`${punchStat.leftShoulderAngle.toFixed(0)}°`} color="#483700" indicatorColor="#faa505" />
            <StatContainer title="Left Elbow" value={`${punchStat.leftElbowAngle.toFixed(0)}°`} color="#483700" indicatorColor="#faa505" />
            <StatContainer title="Right Shoulder" value={`${punchStat.rightShoulderAngle.toFixed(0)}°`} color="#483700" indicatorColor="#faa505" />
            <StatContainer title="Right Elbow" value={`${punchStat.rightElbowAngle.toFixed(0)}°`} color="#483700" indicatorColor="#faa505" />
            {/* <StatContainer title="Lead Hand" value={punchStat.leadHand ? 'Left' : 'Right'} color="#39120d" indicatorColor="#fb3835" /> */}
          </div>

          <PunchScore score={punchScore}/>
        </div>
      </main>
    </div>
  );
}
