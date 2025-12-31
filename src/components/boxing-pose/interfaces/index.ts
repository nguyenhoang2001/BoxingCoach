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