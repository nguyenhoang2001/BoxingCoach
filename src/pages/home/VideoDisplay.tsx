import { CameraSelector } from '../../components/CameraSelector';
import styles from './VideoDisplay.module.css';
import { forwardRef } from 'react';
import { displayVideo } from './hooks/displayVideo';
import { DisplayVideoHandle, DisplayVideoProps } from './interfaces';


const VideoDisplay = forwardRef<DisplayVideoHandle, DisplayVideoProps>(({
  onStart,
  onStop,
  isRunning: externalIsRunning,
  setIsInitialized: externalSetIsInitialized,
  onMetricsUpdate,
}, ref) => {

  const {videoRef, canvasRef, handleCameraSelect, selectedCameraId } = displayVideo({
    onStart,
    onStop,
    isRunning: externalIsRunning,
    setIsInitialized: externalSetIsInitialized,
    onMetricsUpdate,
  }, ref);

  return (
    <div className={styles.container}>
      <CameraSelector 
        onCameraSelect={handleCameraSelect}
        currentDeviceId={selectedCameraId}
        className="camera-selector-container"
      />
      
      <video 
        ref={videoRef}
        width="640" 
        height="480" 
        autoPlay 
        muted 
        playsInline
        className={styles.video}
      />
      
      <canvas 
        ref={canvasRef}
        width="640"
        height="480"
        className={styles.canvas}
      />
    </div>
  );
});

VideoDisplay.displayName = 'VideoDisplay';

export default VideoDisplay;
