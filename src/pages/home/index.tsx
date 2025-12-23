import { useRef, useState } from 'react';
import Header from './Header';
import StatContainer from './StatContainer';
import PunchScore from './PunchScore';
import PunchSettingButton from './PunchSettingButton';
import VideoDisplay, { VideoDisplayRef } from './VideoDisplay';
import StartStopButtons from './StartStopButtons';
import TipsPanel from './TipsPanel';
import { useWorkoutControl } from './hooks/useWorkoutControl';
import styles from './home.module.css';

export default function Home(): JSX.Element {
  const videoDisplayRef = useRef<VideoDisplayRef>(null);
  const [headAngle, setHeadAngle] = useState(0);

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
      }
    },
    onStop: () => {
      if (videoDisplayRef.current) {
        videoDisplayRef.current.handleStop();
      }
    },
    onProcessFrame: () => {
      if (videoDisplayRef.current) {
        videoDisplayRef.current.processFrame();
      }
    }
  });

  const handleMetricsUpdate = (metrics: { headAngle: number; detectionConfidence: number; trackingQuality: number }) => {
    setHeadAngle(metrics.headAngle);
  };

  return (
    <div className={styles.container}>
      <Header />
      
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
            <TipsPanel tip="Guard your right hand up" />
          </div>

          <div className={styles.settingsRow}>
            <PunchSettingButton 
              title="Jab" 
              subtitle="Select to Learn"
              options={['Jab', 'Cross']}
              onSelect={(option) => console.log('Selected punch:', option)}
            />

            <PunchSettingButton 
              title="Left" 
              subtitle="Lead Hand"
              options={['Left', 'Right']}
              onSelect={(option) => console.log('Selected hand:', option)}
            />
          </div>
        </div>

        {/* Right column */}
        <div className={styles.rightColumn}>
          <div className={styles.statsGrid}>
            <StatContainer title="Head Angle" value={`${headAngle}°`} color="#39120d" indicatorColor="#fb3835" />
            <StatContainer title="Velocity" value="100m/s" color="#475201" indicatorColor="#dafd05" />
            <StatContainer title="Acceleration" value="300m/s^2" color="#475201" indicatorColor="#dafd05" />
            <StatContainer title="Left Shoulder" value="30 degree" color="#483700" indicatorColor="#faa505" />
            <StatContainer title="Left Elbow" value="30 degree" color="#483700" indicatorColor="#faa505" />
            <StatContainer title="Hip Rotation" value="30 degree" color="#475201" indicatorColor="#dafd05" />
            <StatContainer title="Right Elbow" value="30 degree" color="#483700" indicatorColor="#faa505" />
            <StatContainer title="Right Shoulder" value="30 degree" color="#483700" indicatorColor="#faa505" />
          </div>

          <PunchScore score={70} />
        </div>
      </main>
    </div>
  );
}
