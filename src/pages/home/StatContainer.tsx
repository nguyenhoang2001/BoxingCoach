import styles from './statcontainer.module.css';

type Props = {
  title?: string;
  value?: string | number;
  subtitle?: string;
  /** background color of the tile */
  color?: string;
  /** small indicator circle color (top-left) */
  indicatorColor?: string;
  /** icon emoji or image path */
  icon?: string;
  /** whether icon is an image path */
  isImageIcon?: boolean;
};

export default function StatContainer({
  title = 'Punch Score',
  value = '70%',
  color = '#2b2b2b',
  indicatorColor = '#ffea00',
  icon = '●',
  isImageIcon = false,
}: Props) {
  // allow color to be passed and applied via inline style so it's easy to change
  const tileStyle: React.CSSProperties = {
    backgroundColor: color,
  };

  const indicatorStyle: React.CSSProperties = {
    backgroundColor: indicatorColor,
  };

  return (
    <aside className={styles.stat} aria-label={String(title)}>
      <div className={styles.tile} style={tileStyle}>
        <div className={styles.indicator} style={indicatorStyle}>
          {isImageIcon ? (
            <img src={icon} alt={title} className={styles.iconImage} />
          ) : (
            <span className={styles.iconContent}>{icon}</span>
          )}
        </div>
        <div className={styles.tileContent}>
          <div className={styles.title}>{title}</div>
          <div className={styles.value}>{value}</div>
        </div>
      </div>
    </aside>
  );
}
