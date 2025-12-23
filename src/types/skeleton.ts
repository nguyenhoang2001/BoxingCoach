/**
 * Enhanced types for skeletal connections and tracking data
 */

import { EnhancedKeypoint, KeypointName } from './pose';
import { Point2D, Point3D } from './gait';

/**
 * Skeletal connection between two keypoints
 */
export interface SkeletalConnection {
  /** Source keypoint name */
  from: KeypointName;
  /** Target keypoint name */
  to: KeypointName;
  /** Connection confidence score (0-1) */
  confidence: number;
  /** Length of the connection in pixels */
  length: number;
  /** Angle of the connection in radians */
  angle: number;
  /** Connection visibility (0-1) */
  visibility: number;
  /** Color for rendering this connection */
  color?: string;
  /** Line width for rendering */
  lineWidth?: number;
}

/**
 * Complete skeleton structure with connections
 */
export interface Skeleton {
  /** Array of keypoints */
  keypoints: EnhancedKeypoint[];
  /** Array of connections between keypoints */
  connections: SkeletalConnection[];
  /** Overall skeleton confidence */
  confidence: number;
  /** Skeleton timestamp */
  timestamp: number;
  /** Skeleton ID for tracking */
  id: string;
  /** Person ID this skeleton belongs to */
  personId?: string;
  /** Bounding box of the skeleton */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Temporal skeleton data for tracking
 */
export interface TemporalSkeleton {
  /** Current skeleton */
  current: Skeleton;
  /** Previous skeleton for temporal analysis */
  previous?: Skeleton;
  /** Velocity of each keypoint */
  velocity: Map<KeypointName, Point2D>;
  /** Acceleration of each keypoint */
  acceleration: Map<KeypointName, Point2D>;
  /** Tracking quality metrics */
  trackingQuality: {
    stability: number; // 0-1
    consistency: number; // 0-1
    smoothness: number; // 0-1
  };
}

/**
 * Multi-person tracking data
 */
export interface TrackedPerson {
  /** Unique person identifier */
  id: string;
  /** Temporal skeleton data */
  skeleton: TemporalSkeleton;
  /** Tracking state */
  state: 'active' | 'lost' | 'occluded' | 'exited';
  /** Time since last detection */
  timeSinceLastSeen: number;
  /** Confidence in person identity */
  identityConfidence: number;
  /** Center of mass trajectory */
  centerOfMass: Point3D[];
  /** Predicted next position */
  predictedPosition?: Point2D;
  /** Person characteristics for re-identification */
  characteristics: {
    height: number; // estimated height in pixels
    aspectRatio: number;
    colorHistogram?: number[];
    movementPattern?: string;
  };
}

/**
 * Skeletal joint definitions following anatomical structure
 */
export enum SkeletalJoint {
  // Head and neck
  HEAD = 'head',
  NECK = 'neck',
  
  // Torso
  LEFT_SHOULDER = 'left_shoulder',
  RIGHT_SHOULDER = 'right_shoulder',
  LEFT_HIP = 'left_hip',
  RIGHT_HIP = 'right_hip',
  SPINE_MID = 'spine_mid',
  
  // Left arm
  LEFT_ELBOW = 'left_elbow',
  LEFT_WRIST = 'left_wrist',
  LEFT_HAND = 'left_hand',
  
  // Right arm
  RIGHT_ELBOW = 'right_elbow',
  RIGHT_WRIST = 'right_wrist',
  RIGHT_HAND = 'right_hand',
  
  // Left leg
  LEFT_KNEE = 'left_knee',
  LEFT_ANKLE = 'left_ankle',
  LEFT_FOOT = 'left_foot',
  
  // Right leg
  RIGHT_KNEE = 'right_knee',
  RIGHT_ANKLE = 'right_ankle',
  RIGHT_FOOT = 'right_foot'
}

/**
 * Anatomical connections for human skeleton
 */
export const ANATOMICAL_CONNECTIONS: Array<[KeypointName, KeypointName]> = [
  // Head connections
  [KeypointName.NOSE, KeypointName.LEFT_EYE],
  [KeypointName.NOSE, KeypointName.RIGHT_EYE],
  [KeypointName.LEFT_EYE, KeypointName.LEFT_EAR],
  [KeypointName.RIGHT_EYE, KeypointName.RIGHT_EAR],
  
  // Torso connections
  [KeypointName.LEFT_SHOULDER, KeypointName.RIGHT_SHOULDER],
  [KeypointName.LEFT_SHOULDER, KeypointName.LEFT_HIP],
  [KeypointName.RIGHT_SHOULDER, KeypointName.RIGHT_HIP],
  [KeypointName.LEFT_HIP, KeypointName.RIGHT_HIP],
  
  // Left arm connections
  [KeypointName.LEFT_SHOULDER, KeypointName.LEFT_ELBOW],
  [KeypointName.LEFT_ELBOW, KeypointName.LEFT_WRIST],
  
  // Right arm connections
  [KeypointName.RIGHT_SHOULDER, KeypointName.RIGHT_ELBOW],
  [KeypointName.RIGHT_ELBOW, KeypointName.RIGHT_WRIST],
  
  // Left leg connections
  [KeypointName.LEFT_HIP, KeypointName.LEFT_KNEE],
  [KeypointName.LEFT_KNEE, KeypointName.LEFT_ANKLE],
  
  // Right leg connections
  [KeypointName.RIGHT_HIP, KeypointName.RIGHT_KNEE],
  [KeypointName.RIGHT_KNEE, KeypointName.RIGHT_ANKLE]
];

/**
 * Gait-specific connections for analyzing walking patterns
 */
export const GAIT_CONNECTIONS: Array<[KeypointName, KeypointName]> = [
  // Focus on lower body for gait analysis
  [KeypointName.LEFT_HIP, KeypointName.RIGHT_HIP],
  [KeypointName.LEFT_HIP, KeypointName.LEFT_KNEE],
  [KeypointName.LEFT_KNEE, KeypointName.LEFT_ANKLE],
  [KeypointName.RIGHT_HIP, KeypointName.RIGHT_KNEE],
  [KeypointName.RIGHT_KNEE, KeypointName.RIGHT_ANKLE],
  
  // Additional gait analysis connections
  [KeypointName.LEFT_ANKLE, KeypointName.RIGHT_ANKLE], // Step width
  [KeypointName.LEFT_SHOULDER, KeypointName.LEFT_HIP], // Body alignment
  [KeypointName.RIGHT_SHOULDER, KeypointName.RIGHT_HIP] // Body alignment
];

/**
 * Connection rendering styles
 */
export interface ConnectionStyle {
  /** Line color */
  color: string;
  /** Line width in pixels */
  width: number;
  /** Line style */
  style: 'solid' | 'dashed' | 'dotted';
  /** Opacity (0-1) */
  opacity: number;
  /** Gradient colors for connection */
  gradient?: {
    start: string;
    end: string;
  };
}

/**
 * Predefined connection styles for different use cases
 */
export const CONNECTION_STYLES = {
  default: {
    color: '#00ff00',
    width: 2,
    style: 'solid' as const,
    opacity: 0.8
  },
  gait: {
    color: '#ff6600',
    width: 3,
    style: 'solid' as const,
    opacity: 0.9
  },
  lowConfidence: {
    color: '#ffff00',
    width: 1,
    style: 'dashed' as const,
    opacity: 0.5
  },
  highConfidence: {
    color: '#00ff00',
    width: 3,
    style: 'solid' as const,
    opacity: 1.0
  },
  trajectory: {
    color: '#0066ff',
    width: 2,
    style: 'solid' as const,
    opacity: 0.7,
    gradient: {
      start: '#0066ff',
      end: '#66ccff'
    }
  }
} as const;

/**
 * Keypoint rendering styles
 */
export interface KeypointStyle {
  /** Point color */
  color: string;
  /** Point radius in pixels */
  radius: number;
  /** Border color */
  borderColor?: string;
  /** Border width */
  borderWidth?: number;
  /** Fill opacity */
  fillOpacity: number;
  /** Border opacity */
  borderOpacity?: number;
  /** Point shape */
  shape: 'circle' | 'square' | 'diamond' | 'cross';
}

/**
 * Predefined keypoint styles
 */
export const KEYPOINT_STYLES = {
  default: {
    color: '#ff0000',
    radius: 4,
    borderColor: '#ffffff',
    borderWidth: 1,
    fillOpacity: 0.8,
    borderOpacity: 1.0,
    shape: 'circle' as const
  },
  gait: {
    color: '#ff6600',
    radius: 5,
    borderColor: '#ffffff',
    borderWidth: 2,
    fillOpacity: 0.9,
    borderOpacity: 1.0,
    shape: 'circle' as const
  },
  lowConfidence: {
    color: '#ffff00',
    radius: 3,
    borderColor: '#666666',
    borderWidth: 1,
    fillOpacity: 0.5,
    borderOpacity: 0.7,
    shape: 'circle' as const
  },
  highConfidence: {
    color: '#00ff00',
    radius: 6,
    borderColor: '#ffffff',
    borderWidth: 2,
    fillOpacity: 1.0,
    borderOpacity: 1.0,
    shape: 'circle' as const
  }
} as const;

/**
 * Trajectory point for tracking movement over time
 */
export interface TrajectoryPoint {
  /** Position in 2D space */
  position: Point2D;
  /** Position in 3D space (if available) */
  position3D?: Point3D;
  /** Timestamp of this point */
  timestamp: number;
  /** Confidence in this position */
  confidence: number;
  /** Velocity at this point */
  velocity?: Point2D;
  /** Acceleration at this point */
  acceleration?: Point2D;
}

/**
 * Trajectory for a specific keypoint
 */
export interface KeypointTrajectory {
  /** Keypoint name */
  keypoint: KeypointName;
  /** Array of trajectory points */
  points: TrajectoryPoint[];
  /** Maximum number of points to keep */
  maxLength: number;
  /** Trajectory color for rendering */
  color?: string;
  /** Whether to show velocity vectors */
  showVelocity?: boolean;
  /** Whether to show acceleration vectors */
  showAcceleration?: boolean;
}

/**
 * Complete trajectory data for a person
 */
export interface PersonTrajectory {
  /** Person ID */
  personId: string;
  /** Individual keypoint trajectories */
  keypoints: Map<KeypointName, KeypointTrajectory>;
  /** Center of mass trajectory */
  centerOfMass: TrajectoryPoint[];
  /** Overall trajectory statistics */
  statistics: {
    averageVelocity: Point2D;
    maxVelocity: Point2D;
    averageAcceleration: Point2D;
    totalDistance: number;
    duration: number;
  };
}

/**
 * Motion analysis data
 */
export interface MotionAnalysis {
  /** Person being analyzed */
  personId: string;
  /** Motion type detected */
  motionType: 'walking' | 'running' | 'standing' | 'sitting' | 'unknown';
  /** Motion characteristics */
  characteristics: {
    averageSpeed: number; // pixels per second
    direction: number; // radians
    stability: number; // 0-1
    rhythmicity: number; // 0-1
    symmetry: number; // 0-1
  };
  /** Confidence in motion analysis */
  confidence: number;
  /** Analysis timestamp */
  timestamp: number;
}

/**
 * Skeleton quality assessment
 */
export interface SkeletonQuality {
  /** Overall quality score (0-1) */
  overall: number;
  /** Individual quality metrics */
  metrics: {
    keypointVisibility: number; // percentage of visible keypoints
    connectionIntegrity: number; // percentage of valid connections
    temporalConsistency: number; // consistency across frames
    anatomicalPlausibility: number; // how anatomically correct the pose is
    trackingStability: number; // stability of tracking
  };
  /** Quality warnings */
  warnings: string[];
  /** Quality assessment timestamp */
  timestamp: number;
}