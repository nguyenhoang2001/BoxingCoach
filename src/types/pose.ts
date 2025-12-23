/**
 * Pose detection types and interfaces for real-time human pose detection and motion tracking
 */

import { Keypoint } from '@tensorflow-models/pose-detection';

/**
 * Keypoint names following the COCO pose estimation model
 */
export enum KeypointName {
  NOSE = 'nose',
  LEFT_EYE = 'left_eye',
  RIGHT_EYE = 'right_eye',
  LEFT_EAR = 'left_ear',
  RIGHT_EAR = 'right_ear',
  LEFT_SHOULDER = 'left_shoulder',
  RIGHT_SHOULDER = 'right_shoulder',
  LEFT_ELBOW = 'left_elbow',
  RIGHT_ELBOW = 'right_elbow',
  LEFT_WRIST = 'left_wrist',
  RIGHT_WRIST = 'right_wrist',
  LEFT_HIP = 'left_hip',
  RIGHT_HIP = 'right_hip',
  LEFT_KNEE = 'left_knee',
  RIGHT_KNEE = 'right_knee',
  LEFT_ANKLE = 'left_ankle',
  RIGHT_ANKLE = 'right_ankle'
}

/**
 * Enhanced keypoint with additional metadata
 */
export interface EnhancedKeypoint extends Keypoint {
  /** Keypoint name */
  name: KeypointName;
  /** Visibility score (0-1) */
  visibility?: number;
  /** Tracking ID for temporal consistency */
  trackingId?: string;
  /** Timestamp when detected */
  timestamp: number;
}

/**
 * Pose detection result with confidence scoring
 */
export interface PoseDetectionResult {
  /** Array of detected keypoints */
  keypoints: EnhancedKeypoint[];
  /** Overall pose confidence score (0-1) */
  confidence: number;
  /** Detection timestamp */
  timestamp: number;
  /** Unique identifier for this pose detection */
  id: string;
  /** Bounding box of the detected pose */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Person ID for multi-person tracking */
  personId?: string;
}

/**
 * Pose smoothing configuration
 */
export interface PoseSmoothingConfig {
  /** Smoothing factor (0-1, higher = more smoothing) */
  smoothingFactor: number;
  /** Minimum confidence threshold for keypoints */
  minConfidence: number;
  /** Maximum allowed distance for keypoint matching */
  maxDistance: number;
  /** Enable velocity-based smoothing */
  enableVelocitySmoothing: boolean;
  /** Historical frame count for smoothing */
  historySize: number;
}

/**
 * Pose validation configuration
 */
export interface PoseValidationConfig {
  /** Minimum confidence threshold for pose acceptance */
  minPoseConfidence: number;
  /** Minimum number of visible keypoints required */
  minVisibleKeypoints: number;
  /** Required keypoints for valid pose */
  requiredKeypoints: KeypointName[];
  /** Maximum allowed keypoint distance from expected position */
  maxKeypointDistance: number;
  /** Enable anatomical validation */
  enableAnatomicalValidation: boolean;
}

/**
 * Pose detection model configuration
 */
export interface PoseDetectionConfig {
  /** Model type (MoveNet Lightning or Thunder) */
  modelType: 'lightning' | 'thunder';
  /** Input resolution for pose detection */
  inputResolution: {
    width: number;
    height: number;
  };
  /** Enable GPU acceleration */
  enableGPU: boolean;
  /** Maximum number of poses to detect */
  maxPoses: number;
  /** Pose smoothing configuration */
  smoothing: PoseSmoothingConfig;
  /** Pose validation configuration */
  validation: PoseValidationConfig;
  /** Performance optimization settings */
  performance: {
    /** Target FPS for pose detection */
    targetFPS: number;
    /** Enable frame skipping for performance */
    enableFrameSkipping: boolean;
    /** Frame skip interval */
    frameSkipInterval: number;
  };
}

/**
 * Pose detection statistics
 */
export interface PoseDetectionStats {
  /** Total number of poses detected */
  totalPoses: number;
  /** Average confidence score */
  averageConfidence: number;
  /** Current FPS */
  currentFPS: number;
  /** Average processing time per frame (ms) */
  avgProcessingTime: number;
  /** Number of dropped frames */
  droppedFrames: number;
  /** Memory usage (MB) */
  memoryUsage: number;
  /** Model load time (ms) */
  modelLoadTime: number;
}

/**
 * Pose detection error types
 */
export enum PoseDetectionError {
  MODEL_LOAD_FAILED = 'MODEL_LOAD_FAILED',
  INFERENCE_FAILED = 'INFERENCE_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
  INSUFFICIENT_KEYPOINTS = 'INSUFFICIENT_KEYPOINTS',
  PROCESSING_TIMEOUT = 'PROCESSING_TIMEOUT',
  MEMORY_EXCEEDED = 'MEMORY_EXCEEDED',
  GPU_UNAVAILABLE = 'GPU_UNAVAILABLE'
}

/**
 * Pose detection service interface
 */
export interface IPoseDetectionService {
  /** Initialize the pose detection service */
  initialize(config: PoseDetectionConfig): Promise<void>;
  
  /** Detect poses in a video frame */
  detectPoses(imageData: ImageData | HTMLVideoElement | HTMLCanvasElement): Promise<PoseDetectionResult[]>;
  
  /** Get current detection statistics */
  getStats(): PoseDetectionStats;
  
  /** Update configuration */
  updateConfig(config: Partial<PoseDetectionConfig>): void;
  
  /** Dispose of resources */
  dispose(): void;
  
  /** Check if service is ready */
  isReady(): boolean;
}

/**
 * Pose smoothing service interface
 */
export interface IPoseSmoothingService {
  /** Apply smoothing to pose detection results */
  smooth(poses: PoseDetectionResult[]): PoseDetectionResult[];
  
  /** Reset smoothing history */
  reset(): void;
  
  /** Update smoothing configuration */
  updateConfig(config: PoseSmoothingConfig): void;
}

/**
 * Pose validation service interface
 */
export interface IPoseValidationService {
  /** Validate pose detection results */
  validate(pose: PoseDetectionResult): boolean;
  
  /** Get validation errors */
  getValidationErrors(pose: PoseDetectionResult): PoseDetectionError[];
  
  /** Update validation configuration */
  updateConfig(config: PoseValidationConfig): void;
}

/**
 * Default pose detection configuration optimized for general human pose detection
 */
export const DEFAULT_POSE_CONFIG: PoseDetectionConfig = {
  modelType: 'lightning',
  inputResolution: {
    width: 256,
    height: 256
  },
  enableGPU: true,
  maxPoses: 3, // Support multiple people for better general use
  smoothing: {
    smoothingFactor: 0.6, // Moderate smoothing for real-time responsiveness
    minConfidence: 0.3,
    maxDistance: 50,
    enableVelocitySmoothing: true,
    historySize: 8 // Increased for better motion tracking
  },
  validation: {
    minPoseConfidence: 0.4, // Lower threshold for better detection coverage
    minVisibleKeypoints: 3, // More lenient for partial poses
    requiredKeypoints: [
      // Key points for general pose detection (not gait-specific)
      KeypointName.NOSE,
      KeypointName.LEFT_SHOULDER,
      KeypointName.RIGHT_SHOULDER,
      KeypointName.LEFT_HIP,
      KeypointName.RIGHT_HIP
    ],
    maxKeypointDistance: 150, // Increased tolerance for varied poses
    enableAnatomicalValidation: false // Disabled for more flexibility
  },
  performance: {
    targetFPS: 30,
    enableFrameSkipping: true,
    frameSkipInterval: 1 // Less aggressive skipping for smoother motion tracking
  }
};