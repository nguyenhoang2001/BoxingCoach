import styles from './PunchScore.module.css';

export interface PunchScoreProps {
  /** score value between 0 and 100 */
  score?: number;
}

export default function PunchScore({ score = 70 }: PunchScoreProps) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div className={styles.container}>
      <div className={styles.header}>Punch Score</div>

      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Punch score ${pct} percent`}
      >
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>

      <div className={styles.percent}>{pct}%</div>
    </div>
  );
}
