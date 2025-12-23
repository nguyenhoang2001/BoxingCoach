import styles from './TipsPanel.module.css';

export interface TipsPanelProps {
  tip?: string;
}

export default function TipsPanel({ tip = 'Guard your right hand up' }: TipsPanelProps) {
  return (
    <div className={styles.container}>
      <div className={styles.label}>Tips</div>
      <div className={styles.tip}>{tip}</div>
    </div>
  );
}
