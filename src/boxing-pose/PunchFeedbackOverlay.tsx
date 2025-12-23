import React from 'react';
import type { PunchEvent, Keypoint, PoseFrame } from './PunchAnalysisService';

type Props = {
  pose?: PoseFrame | null;
  lastPunch?: PunchEvent | null;
  className?: string;
};

export const PunchFeedbackOverlay: React.FC<Props> = ({ pose, lastPunch, className }) => {
  // Lightweight, non-invasive overlay: show last punch type and highlight wrist if available
  const wrist = pose?.keypoints.find(k => k.name === (lastPunch?.hand === 'left' ? 'left_wrist' : 'right_wrist'));

  return (
    <div className={className} style={{pointerEvents: 'none'}}>
      {lastPunch && (
        <div style={{position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '6px 10px', borderRadius: 6}}>
          <div style={{fontWeight: 700}}>{lastPunch.type.toUpperCase()}</div>
          <div>Hand: {lastPunch.hand}</div>
          <div>Score: {(lastPunch.score ?? 0).toFixed(2)}</div>
        </div>
      )}

      {wrist && (
        <div style={{position: 'absolute', transform: `translate(${wrist.x}px, ${wrist.y}px)`}}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#ff0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default PunchFeedbackOverlay;
