import { Pose, Keypoint } from '@tensorflow-models/pose-detection';

// Core Types
export interface GaitParameters {
  cadence: number; // steps per minute
  strideLength: number; // meters
  strideTime: number; // seconds
  stepWidth: number; // meters
  velocity: number; // m/s
  symmetryIndex: number; // percentage (0-100)
  confidence: number; // 0-1
  doubleSupport: number; // percentage of gait cycle
  swingPhase: number; // percentage of gait cycle
  stancePhase: number; // percentage of gait cycle
}

export interface GaitPhase {
  phase: 'heel-strike' | 'foot-flat' | 'mid-stance' | 'heel-off' | 'toe-off' | 'mid-swing' | 'terminal-swing';
  foot: 'left' | 'right';
  timestamp: number;
  confidence: number;
  position: { x: number; y: number };
}

export interface GaitEvent {
  id: string;
  type: 'heel-strike' | 'toe-off' | 'step';
  foot: 'left' | 'right';
  timestamp: number;
  position: { x: number; y: number };
  confidence: number;
  velocity: number;
}

export interface GaitAnalysisResult {
  parameters: GaitParameters;
  events: GaitEvent[];
  phases: GaitPhase[];
  timestamp: number;
  duration: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  warnings: string[];
}

// Camera and Video Types
export interface CameraConstraints {
  width: { min?: number; ideal?: number; max?: number };
  height: { min?: number; ideal?: number; max?: number };
  frameRate: { min?: number; ideal?: number; max?: number };
  facingMode?: 'user' | 'environment';
  deviceId?: string;
}

export interface CameraCapabilities {
  width: { min: number; max: number };
  height: { min: number; max: number };
  frameRate: { min: number; max: number };
  facingMode: string[];
}

export interface VideoSettings {
  width: number;
  height: number;
  frameRate: number;
  facingMode: string;
  deviceId: string;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput';
  groupId: string;
  capabilities?: CameraCapabilities;
}

export interface CameraState {
  isInitialized: boolean;
  isStreaming: boolean;
  hasPermission: boolean;
  error: string | null;
  stream: MediaStream | null;
  devices: CameraDevice[];
  currentDevice: CameraDevice | null;
  settings: VideoSettings | null;
}

// Processing Types
export interface ProcessingState {
  isProcessing: boolean;
  isAnalyzing: boolean;
  frameCount: number;
  fps: number;
  processingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  error: string | null;
}

export interface FrameData {
  imageData: ImageData;
  timestamp: number;
  frameNumber: number;
  width: number;
  height: number;
}

export interface ProcessedFrame {
  poses: Pose[];
  timestamp: number;
  processingTime: number;
  confidence: number;
  metadata: {
    frameNumber: number;
    modelUsed: string;
    detectedPeople: number;
  };
}

// Pose Detection Types
export interface PoseDetectionConfig {
  modelType: 'lightning' | 'thunder' | 'movenet' | 'blazepose';
  maxPoses: number;
  scoreThreshold: number;
  nmsRadius: number;
  enableSmoothing: boolean;
  flipHorizontal: boolean;
}

export interface TrackedPerson {
  id: string;
  poses: Array<{ pose: Pose; timestamp: number }>;
  lastSeen: number;
  boundingBox: BoundingBox;
  confidence: number;
  isActive: boolean;
  gaitParameters?: GaitParameters;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Performance Types
export interface PerformanceMetrics {
  frameRate: number;
  averageProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  droppedFrames: number;
  modelInferenceTime: number;
  renderingTime: number;
  totalFrames: number;
  errors: number;
}

export interface QualitySettings {
  videoResolution: { width: number; height: number };
  frameRate: number;
  modelType: 'lightning' | 'thunder';
  processEveryNthFrame: number;
  renderQuality: 'high' | 'medium' | 'low';
  enableGPUAcceleration: boolean;
  enableWebWorkers: boolean;
}

// UI Types
export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  settingsOpen: boolean;
  analysisOpen: boolean;
  notificationsEnabled: boolean;
  debugMode: boolean;
  fullscreen: boolean;
  language: string;
}

export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
}

// Analysis Types
export interface AnalysisSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration: number;
  totalFrames: number;
  processedFrames: number;
  gaitParameters: GaitParameters[];
  events: GaitEvent[];
  trackedPersons: TrackedPerson[];
  metadata: {
    cameraSettings: VideoSettings;
    processingSettings: QualitySettings;
    deviceInfo: DeviceInfo;
    environment: 'indoor' | 'outdoor' | 'clinical' | 'home';
  };
  status: 'recording' | 'processing' | 'completed' | 'error';
  notes?: string;
  tags?: string[];
}

export interface DeviceInfo {
  platform: string;
  userAgent: string;
  screenResolution: { width: number; height: number };
  pixelRatio: number;
  hardwareConcurrency: number;
  memory?: number;
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

// Export Types
export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'video';
  includeRawData: boolean;
  includeSummaryStats: boolean;
  includeVisualizations: boolean;
  dateRange?: { start: Date; end: Date };
  compression?: 'none' | 'gzip' | 'brotli';
}

export interface ExportResult {
  success: boolean;
  data?: Blob;
  filename: string;
  size: number;
  error?: string;
  metadata: {
    format: string;
    compression: string;
    timestamp: number;
    version: string;
  };
}

// Calibration Types
export interface CalibrationData {
  pixelsPerMeter: number;
  cameraHeight: number; // meters
  cameraAngle: number; // degrees
  floorPlane: {
    normal: { x: number; y: number; z: number };
    distance: number;
  };
  referencePoints: Array<{
    screenCoords: { x: number; y: number };
    worldCoords: { x: number; y: number; z: number };
  }>;
  isValid: boolean;
  timestamp: number;
}

// Visualization Types
export interface VisualizationSettings {
  showSkeleton: boolean;
  showKeypoints: boolean;
  showConnections: boolean;
  showTrajectory: boolean;
  showGaitParameters: boolean;
  showConfidence: boolean;
  skeletonColor: string;
  keypointColor: string;
  trajectoryColor: string;
  opacity: number;
  lineWidth: number;
  pointSize: number;
  trajectoryLength: number;
}

export interface RenderingOptions {
  canvas: HTMLCanvasElement;
  poses: Pose[];
  settings: VisualizationSettings;
  timestamp: number;
  frameNumber: number;
}

// Error Types
export interface ErrorInfo {
  code: string;
  message: string;
  stack?: string;
  timestamp: number;
  context: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  userMessage?: string;
  suggestions?: string[];
}

// Storage Types
export interface StorageConfig {
  maxSessions: number;
  maxSessionSize: number; // bytes
  autoCleanup: boolean;
  cleanupInterval: number; // milliseconds
  encryption: boolean;
  compression: boolean;
}

export interface StoredSession {
  id: string;
  session: AnalysisSession;
  size: number;
  timestamp: number;
  encrypted: boolean;
  compressed: boolean;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Constants
export const GAIT_PHASE_NAMES = [
  'heel-strike',
  'foot-flat',
  'mid-stance',
  'heel-off',
  'toe-off',
  'mid-swing',
  'terminal-swing'
] as const;

export const SUPPORTED_MODELS = [
  'lightning',
  'thunder',
  'movenet',
  'blazepose'
] as const;

export const QUALITY_PRESETS = {
  low: {
    videoResolution: { width: 480, height: 360 },
    frameRate: 15,
    modelType: 'lightning' as const,
    processEveryNthFrame: 3,
    renderQuality: 'low' as const,
    enableGPUAcceleration: false,
    enableWebWorkers: false
  },
  medium: {
    videoResolution: { width: 720, height: 480 },
    frameRate: 24,
    modelType: 'lightning' as const,
    processEveryNthFrame: 2,
    renderQuality: 'medium' as const,
    enableGPUAcceleration: true,
    enableWebWorkers: true
  },
  high: {
    videoResolution: { width: 1280, height: 720 },
    frameRate: 30,
    modelType: 'thunder' as const,
    processEveryNthFrame: 1,
    renderQuality: 'high' as const,
    enableGPUAcceleration: true,
    enableWebWorkers: true
  }
} as const;

export const DEFAULT_GAIT_PARAMETERS: GaitParameters = {
  cadence: 0,
  strideLength: 0,
  strideTime: 0,
  stepWidth: 0,
  velocity: 0,
  symmetryIndex: 0,
  confidence: 0,
  doubleSupport: 0,
  swingPhase: 0,
  stancePhase: 0
};

export const KEYPOINT_NAMES = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle'
] as const;

// Re-export common types from dependencies
export type { Pose, Keypoint } from '@tensorflow-models/pose-detection';