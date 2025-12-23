import { CameraSelector } from '../../components/CameraSelector';
import styles from './VideoDisplay.module.css';
import { useCallback, useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { VideoDisplayer } from './VideoDisplayer';

export interface VideoDisplayProps {
  src?: string;
  alt?: string;
  onStart?: () => void;
  onStop?: () => void;
  isRunning?: boolean;
  setIsInitialized?: (value: boolean) => void;
  onMetricsUpdate?: (metrics: {
    headAngle: number;
    detectionConfidence: number;
    trackingQuality: number;
  }) => void;
}

export interface VideoDisplayRef {
  handleStart: () => Promise<void>;
  handleStop: () => void;
  processFrame: () => void;
  getMetrics: () => {
    headAngle: number;
    detectionConfidence: number;
    trackingQuality: number;
  };
}

const VideoDisplay = forwardRef<VideoDisplayRef, VideoDisplayProps>(({
  onStart,
  onStop,
  isRunning: externalIsRunning,
  setIsInitialized: externalSetIsInitialized,
  onMetricsUpdate,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayerRef = useRef<VideoDisplayer | null>(null);
  
  // Use external state if provided, otherwise use internal state
  const [internalIsRunning, setInternalIsRunning] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);

  const updateCanvasLayout = useCallback(() => {
    if (canvasRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      const containerWidth = videoRef.current.clientWidth;
      const containerHeight = videoRef.current.clientHeight;
      
      const videoAspect = videoWidth / videoHeight;
      const containerAspect = containerWidth / containerHeight;
      
      let scale, offsetX, offsetY;
      
      if (videoAspect > containerAspect) {
        scale = containerWidth / videoWidth;
        offsetX = 0;
        offsetY = (containerHeight - videoHeight * scale) / 2;
      } else {
        scale = containerHeight / videoHeight;
        offsetX = (containerWidth - videoWidth * scale) / 2;
        offsetY = 0;
      }
      
      canvasRef.current.style.width = `${videoWidth * scale}px`;
      canvasRef.current.style.height = `${videoHeight * scale}px`;
      canvasRef.current.style.position = 'absolute';
      canvasRef.current.style.left = `${offsetX}px`;
      canvasRef.current.style.top = `${offsetY}px`;
    }
  }, []);

  // Initialize VideoDisplayer
  useEffect(() => {
    if (!displayerRef.current) {
      displayerRef.current = new VideoDisplayer({
        onInitialized: (initialized) => {
          if (externalSetIsInitialized) {
            externalSetIsInitialized(initialized);
          }
        },
        onMetricsUpdate: (metrics) => {
          if (onMetricsUpdate) {
            onMetricsUpdate(metrics);
          }
        },
        onError: (error) => {
          console.error('VideoDisplayer error:', error);
        }
      });
    }
  }, [externalSetIsInitialized, onMetricsUpdate]);

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', updateCanvasLayout);
    return () => window.removeEventListener('resize', updateCanvasLayout);
  }, [updateCanvasLayout]);

  // Initialize camera and services when component mounts or camera changes
  useEffect(() => {
    const initialize = async () => {
      if (!displayerRef.current || !videoRef.current || !canvasRef.current) return;

      try {
        // Initialize services
        await displayerRef.current.initializeServices(selectedCameraId);
        
        // Check if service is ready after initialization
        if (displayerRef.current.isReady() && videoRef.current.readyState >= 2) {
          if (externalSetIsInitialized) {
            externalSetIsInitialized(true);
          }
        }
        
        // Initialize camera
        await displayerRef.current.initializeCamera(
          videoRef.current,
          canvasRef.current,
          selectedCameraId,
          updateCanvasLayout
        );
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    initialize();

    return () => {
      if (displayerRef.current) {
        displayerRef.current.cleanup();
      }
    };
  }, [selectedCameraId, externalSetIsInitialized, updateCanvasLayout]);

  // Cleanup pose detection service only on component unmount
  useEffect(() => {
    return () => {
      if (displayerRef.current) {
        displayerRef.current.dispose();
      }
    };
  }, []);

  const handleStart = useCallback(async () => {
    if (!displayerRef.current || !videoRef.current || !canvasRef.current) {
      console.error('Cannot start: missing refs');
      return;
    }

    try {
      if (!externalIsRunning) {
        setInternalIsRunning(true);
      }

      // Call external onStart callback if provided
      if (onStart) {
        await onStart();
      }

      // Start the displayer
      await displayerRef.current.start(videoRef.current, canvasRef.current);
    } catch (err) {
      console.error('Start error:', err);
    }
  }, [externalIsRunning, onStart]);

  const handleStop = useCallback(() => {
    if (!displayerRef.current) return;

    if (!externalIsRunning) {
      setInternalIsRunning(false);
    }

    displayerRef.current.stop();

    // Call external onStop callback if provided
    if (onStop) {
      onStop();
    }
  }, [externalIsRunning, onStop]);

  const processFrame = useCallback(() => {
    if (!displayerRef.current || !videoRef.current || !canvasRef.current) return;
    displayerRef.current.processFrame(videoRef.current, canvasRef.current);
  }, []);

  const getMetrics = useCallback(() => {
    if (!displayerRef.current) {
      return { headAngle: 0, detectionConfidence: 0, trackingQuality: 0 };
    }
    return displayerRef.current.getMetrics();
  }, []);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    handleStart,
    handleStop,
    processFrame,
    getMetrics
  }), [handleStart, handleStop, processFrame, getMetrics]);

  const handleCameraSelect = (deviceId: string) => {
    setSelectedCameraId(deviceId);
  };

  return (
    <div className={styles.container}>
      {/* Camera Selector */}
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
