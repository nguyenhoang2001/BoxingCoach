export type Keypoint = { name: string; x: number; y: number; confidence: number };
export type PoseFrame = { timestamp: number; keypoints: Keypoint[] };
export type PunchType = 'jab' | 'cross' | 'hook' | 'uppercut' | 'unknown';

export type PunchEvent = {
  id: string;
  hand: 'left' | 'right';
  type: PunchType;
  timestamp: number;
  score: number;
  tips?: string[];
};

export type JabAnalysisResult = {
  isValidJab: boolean;
  score: number; // 0-100
  feedback: string[];
  metrics: {
    velocityScore: number;
    formScore: number;
    powerScore: number;
    guardScore: number;
  };
  tips: string[];
};

export type Landmark = {
    x: number;
    y: number;
    z?: number;
    score?: number; // confidence for the keypoint
    name?: string; // optional name like 'left_wrist'
};

export type PunchSide = 'left' | 'right' | 'unknown';

export type PunchMeasurement = {
    side: PunchSide;
    extension: number; // raw distance wrist -> shoulder (pixels / normalized units of input)
    extensionNormalized: number; // normalized by shoulder width
    speed: number; // estimated linear speed of the wrist (units per second)
    angle: number; // elbow angle in degrees (180 = fully straight)
    confidence: number; // 0..1 average confidence of used landmarks
    timestamp: number; // ms
};

export type LandmarkMap = Record<string, Landmark | undefined>;

/**
 * Default configuration values for an accurate jab punch
 * These values represent ideal technique based on boxing fundamentals
 */

export interface JabConfig {
  // Lead hand configuration
  leadHand: boolean; // true = left, false = right
  
  // Elbow angles - in degrees (180 = fully extended)
  leadElbow: {
    min: number;
    optimal: number;
    max: number;
  };
  guardElbow: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Shoulder angles - in degrees
  leadShoulder: {
    min: number;
    optimal: number;
    max: number;
  };
  rearShoulder: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Head angle - in degrees (90 = neutral/straight)
  headAngle: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Hip rotation - in degrees (jabs use minimal hip rotation)
  hipRotation: {
    min: number;
    optimal: number;
    max: number;
  };
}

/**
 * Default configuration values for an accurate cross punch
 * More forgiving than jab to allow users to achieve higher scores
 */
export interface CrossConfig {
  // Rear hand configuration
  rearHand: boolean; // false = right, true = left (unusual)
  
  // Elbow angles - in degrees (180 = fully extended)
  rearElbow: {
    min: number;
    optimal: number;
    max: number;
  };
  leadElbow: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Shoulder angles - in degrees
  rearShoulder: {
    min: number;
    optimal: number;
    max: number;
  };
  leadShoulder: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Head angle - in degrees (90 = neutral/straight)
  headAngle: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Hip rotation - in degrees (crosses use significant hip rotation)
  hipRotation: {
    min: number;
    optimal: number;
    max: number;
  };
}

/**
 * Default configuration values for a hook punch
 * Hooks are curved punches with bent arms and significant shoulder/hip rotation
 */
export interface HookConfig {
  // Hand configuration
  hand: 'left' | 'right';
  
  // Punching elbow angle - in degrees (should be bent, not fully extended)
  punchingElbow: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Guard elbow - in degrees
  guardElbow: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Lead shoulder angle - in degrees (rotates significantly for hooks)
  leadShoulder: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Rear shoulder angle - in degrees
  rearShoulder: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Hip rotation - in degrees (hooks use significant hip rotation)
  hipRotation: {
    min: number;
    optimal: number;
    max: number;
  };
}

/**
 * Default configuration values for an uppercut punch
 * Uppercuts emphasize vertical drive and hip rotation
 */
export interface UppercutConfig {
  // Hand configuration
  hand: 'left' | 'right';
  
  // Punching elbow angle - in degrees (should be bent for upward drive)
  punchingElbow: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Guard elbow - in degrees
  guardElbow: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Lead shoulder angle - in degrees (minimal rotation for uppercut)
  leadShoulder: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Rear shoulder angle - in degrees (forward movement for power)
  rearShoulder: {
    min: number;
    optimal: number;
    max: number;
  };
  
  // Hip rotation - in degrees (critical for uppercut drive)
  hipRotation: {
    min: number;
    optimal: number;
    max: number;
  };
}