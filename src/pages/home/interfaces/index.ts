import { PunchStat } from "../../../components/boxing-pose/PunchStat";
import { PoseDetectionResult } from "../../../types/pose";

export type DisplayVideoMetrics = {
  detectionConfidence: number;
  trackingQuality: number;
};

export type DisplayVideoHandle = {
  handleStart: () => Promise<void>;
  handleStop: () => void;
  processFrame: () => void;
  getMetrics: () => DisplayVideoMetrics;
  setLeadHand: (isLeft: boolean) => void;
};

export type DisplayVideoProps = {
  onStart?: () => Promise<void> | void;
  onStop?: () => void;
  isRunning?: boolean;
  setIsInitialized?: (initialized: boolean) => void;
  onMetricsUpdate?: (metrics: PunchStat) => void;
};

export interface PoseMetrics {
  detectionConfidence: number;
  keypointCount: number;
  visibleKeypoints: number;
  poseStability: number;
  trackingQuality: number;
  movementIntensity: number;
  poseDuration: number;
  averageKeypointConfidence: number;
}

export interface PerformanceMetrics {
  frameRate: number;
  averageProcessingTime: number;
  memoryUsage: number;
  droppedFrames: number;
  totalFrames: number;
}

export interface VideoDisplayerCallbacks {
  onInitialized?: (initialized: boolean) => void;
  onMetricsUpdate?: (punchStat: PunchStat) => void;
  onError?: (error: string) => void;
  onPoseUpdate?: (pose: PoseDetectionResult | null) => void;
}