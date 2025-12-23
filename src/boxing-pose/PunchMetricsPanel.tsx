import React from 'react';
import type { PunchEvent } from './PunchAnalysisService';

type Props = { lastPunch?: PunchEvent | null };

export const PunchMetricsPanel: React.FC<Props> = ({ lastPunch }) => {
  return (
    <div style={{padding: 8}}>
      <h4>Punch Metrics</h4>
      {lastPunch ? (
        <div>
          <div>Type: {lastPunch.type}</div>
          <div>Hand: {lastPunch.hand}</div>
          <div>Score: {(lastPunch.score ?? 0).toFixed(2)}</div>
          <div>Time: {new Date(lastPunch.timestamp).toLocaleTimeString()}</div>
        </div>
      ) : (
        <div>No punches yet</div>
      )}
    </div>
  );
};

export default PunchMetricsPanel;
