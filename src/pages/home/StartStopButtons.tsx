import styles from './StartStopButtons.module.css';

export interface StartStopButtonsProps {
  onStart?: () => void;
  onStop?: () => void;
  isRunning?: boolean;
  isReady?: boolean;
}

export default function StartStopButtons({ 
  onStart, 
  onStop, 
  isRunning = false,
  isReady = false
}: StartStopButtonsProps) {
  return (
    <div className={styles.container}>
      <button 
        className={`${styles.button} ${styles.start}`}
        onClick={onStart}
        disabled={isRunning || !isReady}
        type="button"
      >
        {!isReady ? 'Loading...' : 'Start'}
      </button>
      <button 
        className={`${styles.button} ${styles.stop}`}
        onClick={onStop}
        disabled={!isRunning}
        type="button"
      >
        Stop
      </button>
    </div>
  );
}
