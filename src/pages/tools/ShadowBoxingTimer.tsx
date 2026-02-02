import { useState, useEffect } from 'react';
import styles from './ShadowBoxingTimer.module.css';

interface TimerProps {
    drillName?: string;
    roundDuration?: number; // in seconds
    numRounds?: number;
    onBack: () => void;
}

export default function ShadowBoxingTimer({
    drillName = 'Shadow Boxing',
    roundDuration = 180, // 3 minutes default
    numRounds = 3,
    onBack,
}: TimerProps): JSX.Element {
    const [currentRound, setCurrentRound] = useState(1);
    const [isResting, setIsResting] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(roundDuration);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const [roundTime, setRoundTime] = useState(roundDuration);
    const [restTime, setRestTime] = useState(60);

    const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

    useEffect(() => {
        if (!isRunning || isPaused) return;

        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    if (isResting) {
                        // Rest is over, go to next round
                        if (currentRound < numRounds) {
                            setCurrentRound((c) => c + 1);
                            setIsResting(false);
                            playBeep(659, 0.2);
                            return roundTime;
                        } else {
                            // All rounds complete
                            setIsRunning(false);
                            playCompletionSound();
                            return 0;
                        }
                    } else {
                        // Round is over, go to rest
                        setIsResting(true);
                        playBeep(523, 0.2);
                        return restTime;
                    }
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isRunning, isPaused, isResting, currentRound, numRounds, roundTime, restTime]);

    const playBeep = (frequency: number, duration: number) => {
        if (!soundEnabled || !audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    };

    const playCompletionSound = () => {
        if (!soundEnabled) return;
        playBeep(523, 0.2);
        setTimeout(() => playBeep(659, 0.2), 200);
        setTimeout(() => playBeep(784, 0.4), 400);
    };

    const handleStart = () => {
        setIsRunning(true);
        setIsPaused(false);
    };

    const handlePause = () => {
        setIsPaused(!isPaused);
    };

    const handleReset = () => {
        setIsRunning(false);
        setIsPaused(false);
        setCurrentRound(1);
        setIsResting(false);
        setTimeRemaining(roundTime);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const totalTime = currentRound === 1 && !isResting ? roundTime : roundTime;
    const elapsedTime = totalTime - timeRemaining;
    const progressPercentage = (elapsedTime / totalTime) * 100;

    const isComplete = currentRound > numRounds && !isRunning;

    return (
        <div className={styles.container}>
            {/* Back Button */}
            <button className={styles.backButton} onClick={onBack}>
                ← Back to Lesson
            </button>

            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>FIGHTER</h1>
                    <p className={styles.subtitle}>{drillName}</p>
                </div>

                <div className={styles.mainContent}>
                    <div className={styles.boxerSection}>
                        <img
                            src="/boxing-ippo-gif.gif"
                            alt="Boxer training"
                            className={styles.boxerGif}
                        />
                    </div>

                    <div className={styles.timerDisplay}>
                        <div className={`${styles.time} ${timeRemaining <= 10 && !isResting ? styles.warning : ''} ${isResting ? styles.rest : ''}`}>
                            {formatTime(timeRemaining)}
                        </div>
                        <div className={styles.roundInfo}>
                            Round {currentRound} of {numRounds}
                        </div>
                        <div className={`${styles.status} ${isResting ? styles.resting : isRunning ? styles.active : ''}`}>
                            {isComplete ? 'Complete!' : isResting ? 'Rest' : isRunning ? 'FIGHT' : 'READY'}
                        </div>
                    </div>
                </div>

                <div className={styles.controls}>
                    {!isRunning ? (
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleStart}>
                            <span>START</span>
                        </button>
                    ) : (
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handlePause}>
                            <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
                        </button>
                    )}
                    <button className={styles.btn} onClick={handleReset}>
                        <span>RESET</span>
                    </button>
                </div>

                <div className={styles.progressBar}>
                    <div className={`${styles.progressFill} ${isResting ? styles.rest : ''}`} style={{ width: `${progressPercentage}%` }} />
                </div>

                <div className={styles.settings}>
                    <div className={styles.settingsGrid}>
                        <div className={styles.settingGroup}>
                            <label className={styles.settingLabel}>Round Duration</label>
                            <div className={styles.settingInput}>
                                <input
                                    type="number"
                                    value={roundTime}
                                    onChange={(e) => {
                                        setRoundTime(parseInt(e.target.value) || 0);
                                        if (!isRunning) setTimeRemaining(parseInt(e.target.value) || 0);
                                    }}
                                    disabled={isRunning}
                                />
                                <span className={styles.unit}>seconds</span>
                            </div>
                        </div>

                        <div className={styles.settingGroup}>
                            <label className={styles.settingLabel}>Rest Duration</label>
                            <div className={styles.settingInput}>
                                <input
                                    type="number"
                                    value={restTime}
                                    onChange={(e) => setRestTime(parseInt(e.target.value) || 0)}
                                    disabled={isRunning}
                                />
                                <span className={styles.unit}>seconds</span>
                            </div>
                        </div>

                        <div className={styles.settingGroup}>
                            <label className={styles.settingLabel}>Number of Rounds</label>
                            <div className={styles.settingInput}>
                                <input
                                    type="number"
                                    value={numRounds}
                                    disabled={true}
                                />
                                <span className={styles.unit}>rounds</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.soundToggle}>
                        <label>
                            <input
                                type="checkbox"
                                checked={soundEnabled}
                                onChange={(e) => setSoundEnabled(e.target.checked)}
                            />
                            <span>SOUND ALERTS</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
