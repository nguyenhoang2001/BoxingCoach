/**
 * usePoseOverlay - Custom hook for managing pose detection overlay visualization
 * Integrates with PoseDetectionService and provides real-time pose rendering
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { PoseDetectionService } from '../services/PoseDetectionService';
import { 
  PoseDetectionResult, 
  PoseDetectionConfig,
  DEFAULT_POSE_CONFIG 
} from '../types/pose';
import { 
  VisualizationSettings, 
  PerformanceMetrics 
} from '../types/gait';

interface UsePoseOverlayProps {
  /** Canvas element to render on */
  canvasElement?: HTMLCanvasElement;
  /** Video element for pose detection input */
  videoElement?: HTMLVideoElement;
  /** Pose detection configuration */
  config?: Partial<PoseDetectionConfig>;
  /** Visualization settings */
  visualSettings?: Partial<VisualizationSettings>;
  /** Whether pose detection is active */
  isActive?: boolean;
  /** Performance optimization mode */
  performanceMode?: 'high' | 'balanced' | 'battery';
}

interface UsePoseOverlayReturn {
  /** Current pose detection results */
  poses: PoseDetectionResult[];
  /** Visualization settings */
  settings: VisualizationSettings;
  /** Update visualization settings */
  updateSettings: (newSettings: Partial<VisualizationSettings>) => void;
  /** Performance metrics */
  performance: PerformanceMetrics;
  /** Whether pose detection is running */
  isDetecting: boolean;
  /** Start pose detection */
  startDetection: () => Promise<void>;
  /** Stop pose detection */
  stopDetection: () => void;
  /** Error state */
  error: string | null;
  /** Detection statistics */
  stats: {
    totalPoses: number;
    averageConfidence: number;
    detectionRate: number;
  };
  /** Canvas ref for the overlay component */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Video ref for the overlay component */
  videoRef: React.RefObject<HTMLVideoElement>;
}

// Default visualization settings
const DEFAULT_VISUALIZATION_SETTINGS: VisualizationSettings = {
  skeletonOpacity: 0.8,
  trajectoryOpacity: 0.6,
  showConfidence: true,
  showParameters: false,
  skeletonStyle: 'anatomical',
  colorScheme: 'phase',
  showTrajectory: false,
  trajectoryLength: 10
};

export const usePoseOverlay = ({
  canvasElement,
  videoElement,
  config = {},
  visualSettings = {},
  isActive = false,
  performanceMode = 'balanced'
}: UsePoseOverlayProps = {}): UsePoseOverlayReturn => {
  const [poses, setPoses] = useState<PoseDetectionResult[]>([]);
  const [settings, setSettings] = useState<VisualizationSettings>({
    ...DEFAULT_VISUALIZATION_SETTINGS,
    ...visualSettings
  });
  const [performance, setPerformance] = useState<PerformanceMetrics>({
    frameRate: 0,
    averageRenderTime: 0,
    memoryUsage: 0,
    droppedFrames: 0,
    processingLatency: 0
  });
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalPoses: 0,
    averageConfidence: 0,
    detectionRate: 0
  });

  const canvasRef = useRef<HTMLCanvasElement>(canvasElement || null);
  const videoRef = useRef<HTMLVideoElement>(videoElement || null);
  const poseServiceRef = useRef<PoseDetectionService | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTime = useRef<number>(0);
  const detectionCount = useRef<number>(0);
  const confidenceSum = useRef<number>(0);

  // Initialize pose detection service
  useEffect(() => {
    const initializeService = async () => {
      if (poseServiceRef.current) return;

      try {
        poseServiceRef.current = new PoseDetectionService();
        const mergedConfig = {
          ...DEFAULT_POSE_CONFIG,
          ...config,
          performance: {
            ...DEFAULT_POSE_CONFIG.performance,
            targetFPS: performanceMode === 'high' ? 60 : performanceMode === 'balanced' ? 30 : 15,
            enableFrameSkipping: performanceMode !== 'high',
            frameSkipInterval: performanceMode === 'high' ? 1 : performanceMode === 'balanced' ? 2 : 3
          }
        };

        await poseServiceRef.current.initialize(mergedConfig);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize pose detection';
        setError(errorMessage);
        console.error('Pose detection initialization error:', err);
      }
    };

    initializeService();

    return () => {
      if (poseServiceRef.current) {
        poseServiceRef.current.dispose();
        poseServiceRef.current = null;
      }
    };
  }, [config, performanceMode]);

  // Update settings function
  const updateSettings = useCallback((newSettings: Partial<VisualizationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Pose detection loop
  const detectPoses = useCallback(async () => {
    if (!poseServiceRef.current || !videoRef.current || !isActive) {
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2) return; // Video not ready

    try {
      const startTime = performance.now();
      const detectedPoses = await poseServiceRef.current.detectPoses(video);
      const detectionTime = performance.now() - startTime;
      
      if (detectedPoses.length > 0) {
        setPoses(detectedPoses);
        
        // Update statistics
        detectionCount.current++;
        const totalConfidence = detectedPoses.reduce((sum, pose) => sum + pose.confidence, 0);
        confidenceSum.current += totalConfidence / detectedPoses.length;
        
        setStats({
          totalPoses: detectionCount.current,
          averageConfidence: confidenceSum.current / detectionCount.current,
          detectionRate: detectionCount.current / ((Date.now() - lastDetectionTime.current) / 1000)
        });
      }

      // Update performance metrics
      const currentPerformance = poseServiceRef.current.getStats();
      setPerformance(prev => ({
        ...prev,
        processingLatency: detectionTime,
        frameRate: currentPerformance.currentFPS,
        averageRenderTime: currentPerformance.avgProcessingTime,
        memoryUsage: currentPerformance.memoryUsage,
        droppedFrames: prev.droppedFrames + (currentPerformance.droppedFrames > 0 ? 1 : 0)
      }));

    } catch (err) {
      console.error('Pose detection error:', err);
      setError(err instanceof Error ? err.message : 'Pose detection failed');
    }
  }, [isActive]);

  // Animation loop for pose detection
  useEffect(() => {
    if (!isActive || !isDetecting) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = async () => {
      await detectPoses();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isActive, isDetecting, detectPoses]);

  // Start detection function
  const startDetection = useCallback(async () => {
    if (!poseServiceRef.current || isDetecting) return;

    try {
      setError(null);
      setIsDetecting(true);
      lastDetectionTime.current = Date.now();
      detectionCount.current = 0;
      confidenceSum.current = 0;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start detection');
      setIsDetecting(false);
    }
  }, [isDetecting]);

  // Stop detection function
  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    setPoses([]);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Update refs when elements change
  useEffect(() => {
    if (canvasElement) {
      canvasRef.current = canvasElement;
    }
  }, [canvasElement]);

  useEffect(() => {
    if (videoElement) {
      videoRef.current = videoElement;
    }
  }, [videoElement]);

  // Auto-start detection when active
  useEffect(() => {
    if (isActive && !isDetecting && poseServiceRef.current?.isReady()) {
      startDetection();
    } else if (!isActive && isDetecting) {
      stopDetection();
    }
  }, [isActive, isDetecting, startDetection, stopDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (poseServiceRef.current) {
        poseServiceRef.current.dispose();
      }
    };
  }, []);

  return {
    poses,
    settings,
    updateSettings,
    performance,
    isDetecting,
    startDetection,
    stopDetection,
    error,
    stats,
    canvasRef,
    videoRef
  };
};

export default usePoseOverlay;