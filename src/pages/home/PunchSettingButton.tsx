import React, { useId, useState } from 'react';
import styles from './PunchSettingButton.module.css';

export interface PunchSettingButtonProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  options: string[];
  onSelect?: (option: string) => void;
  className?: string;
}

export default function PunchSettingButton({
  title,
  subtitle,
  defaultOpen = false,
  options,
  onSelect,
  className,
}: PunchSettingButtonProps) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [selectedOption, setSelectedOption] = useState<string>(title);
  const id = useId();

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
    setOpen(false);
    if (onSelect) {
      onSelect(option);
    }
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <button
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={`punch-setting-${id}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <div className={styles.titleWrap}>
          {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
          <div className={styles.title}>{selectedOption}</div>
        </div>
        <div className={`${styles.chev} ${open ? styles.open : ''}`} aria-hidden>
          ▾
        </div>
      </button>

      <div
        id={`punch-setting-${id}`}
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        role="region"
        aria-labelledby={undefined}
      >
        <div className={styles.panelInner}>
          {options.map((option) => (
            <button
              key={option}
              className={`${styles.option} ${selectedOption === option ? styles.optionSelected : ''}`}
              onClick={() => handleOptionClick(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
