/**
 * Core type definitions for gait detection system
 * Based on research findings and biomechanical principles
 */

// Basic geometric types
export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

// Pose estimation types
export interface Keypoint {
  x: number;
  y: number;
  z?: number;
  score: number;
  name: string;
}

export interface Pose {
  keypoints: Keypoint[];
  score: number;
  timestamp: number;
}

// Gait cycle phases (8 phases as per research)
export enum GaitPhase {
  INITIAL_CONTACT = 'initial_contact',
  LOADING_RESPONSE = 'loading_response',
  MIDSTANCE = 'midstance',
  TERMINAL_STANCE = 'terminal_stance',
  PRESWING = 'preswing',
  INITIAL_SWING = 'initial_swing',
  MIDSWING = 'midswing',
  TERMINAL_SWING = 'terminal_swing'
}

// Gait parameters (temporal and spatial)
export interface TemporalParameters {
  strideTime: number;        // seconds
  stepTime: number;          // seconds
  stanceTime: number;        // seconds
  swingTime: number;         // seconds
  doubleSupport: number;     // seconds
  cadence: number;           // steps/min
}

export interface SpatialParameters {
  strideLength: number;      // meters
  stepLength: number;        // meters
  stepWidth: number;         // meters
  footAngle: number;         // degrees
}

export interface GaitParameters extends TemporalParameters, SpatialParameters {
  velocity: number;          // m/s
  symmetryIndex: number;     // percentage
  variabilityIndex: number;  // coefficient of variation
  confidence: number;        // 0-1 scale
}

// Visualization settings
export interface VisualizationSettings {
  skeletonOpacity: number;
  trajectoryOpacity: number;
  showConfidence: boolean;
  showParameters: boolean;
  skeletonStyle: 'basic' | 'anatomical' | 'minimal';
  colorScheme: 'default' | 'confidence' | 'phase';
  showTrajectory: boolean;
  trajectoryLength: number;
}

// Joint angles and biomechanical data
export interface JointAngles {
  hip: number;
  knee: number;
  ankle: number;
  shoulder: number;
  elbow: number;
  confidence: number;
}

export interface BiomechanicalData {
  leftLeg: JointAngles;
  rightLeg: JointAngles;
  leftArm: JointAngles;
  rightArm: JointAngles;
  centerOfMass: Point3D;
  timestamp: number;
}

// Gait analysis results
export interface GaitAnalysisResult {
  phase: GaitPhase;
  parameters: GaitParameters;
  biomechanics: BiomechanicalData;
  quality: QualityMetrics;
  timestamp: number;
}

// Quality and confidence metrics
export interface QualityMetrics {
  overallQuality: number;     // 0-1 scale
  trackingStability: number;  // 0-1 scale
  keypointVisibility: number; // 0-1 scale
  temporalConsistency: number; // 0-1 scale
  calibrationAccuracy: number; // 0-1 scale
}

// Performance monitoring
export interface PerformanceMetrics {
  frameRate: number;
  averageRenderTime: number;
  memoryUsage: number;
  droppedFrames: number;
  processingLatency: number;
}

// Trajectory tracking
export interface TrajectoryPoint {
  position: Point3D;
  timestamp: number;
  confidence: number;
}

export interface GaitTrajectory {
  leftFoot: TrajectoryPoint[];
  rightFoot: TrajectoryPoint[];
  centerOfMass: TrajectoryPoint[];
  maxLength: number;
}

// Clinical assessment types
export interface ClinicalAssessment {
  fallRiskScore: number;
  mobilityIndex: number;
  asymmetryMeasure: number;
  stabilityMeasure: number;
  recommendedInterventions: string[];
  confidence: number;
}

// Real-time processing events
export interface GaitEvent {
  type: 'heel_strike' | 'toe_off' | 'mid_stance' | 'mid_swing';
  foot: 'left' | 'right';
  timestamp: number;
  confidence: number;
  position: Point3D;
}

// Camera and calibration
export interface CameraCalibration {
  focalLength: { x: number; y: number };
  principalPoint: { x: number; y: number };
  distortion: number[];
  resolution: { width: number; height: number };
  scale: number; // pixels per meter
}

// Renderer configuration
export interface RendererConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  enableWebGL: boolean;
  antialiasing: boolean;
  backgroundColor: string;
}

// Statistics for parameter tracking
export interface ParameterStatistics {
  mean: number;
  std: number;
  min: number;
  max: number;
  coefficient_of_variation: number;
  samples: number;
  history: number[];
}

// Gait comparison data
export interface GaitComparison {
  reference: GaitParameters;
  current: GaitParameters;
  similarity: number;
  deviation: number;
  recommendations: string[];
}

// Error and validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidence: number;
}

export interface ProcessingError {
  type: 'pose_estimation' | 'calibration' | 'analysis' | 'rendering';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  context?: any;
}

// Model configuration
export interface ModelConfig {
  type: 'movenet_lightning' | 'movenet_thunder' | 'blazepose' | 'posenet';
  inputResolution: { width: number; height: number };
  scoreThreshold: number;
  enableSmoothing: boolean;
  maxDetections: number;
}

// Export union types for convenience
export type GaitData = GaitAnalysisResult | GaitParameters | BiomechanicalData;
export type RenderableData = Pose | GaitTrajectory | GaitParameters;
export type QualityData = QualityMetrics | PerformanceMetrics;