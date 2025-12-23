/**
 * Distance calculation utilities for pose keypoints and motion tracking
 */

import { Point2D, Point3D } from '../types/gait';
import { EnhancedKeypoint, KeypointName } from '../types/pose';
import { Skeleton } from '../types/skeleton';

/**
 * Calculate Euclidean distance between two 2D points
 */
export function distance2D(point1: Point2D, point2: Point2D): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate Euclidean distance between two 3D points
 */
export function distance3D(point1: Point3D, point2: Point3D): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const dz = point2.z - point1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate Manhattan distance between two 2D points
 */
export function manhattanDistance2D(point1: Point2D, point2: Point2D): number {
  return Math.abs(point2.x - point1.x) + Math.abs(point2.y - point1.y);
}

/**
 * Calculate distance between two keypoints
 */
export function keypointDistance(keypoint1: EnhancedKeypoint, keypoint2: EnhancedKeypoint): number {
  return distance2D(
    { x: keypoint1.x, y: keypoint1.y },
    { x: keypoint2.x, y: keypoint2.y }
  );
}

/**
 * Find keypoint by name in a skeleton
 */
export function findKeypoint(skeleton: Skeleton, name: KeypointName): EnhancedKeypoint | undefined {
  return skeleton.keypoints.find(kp => kp.name === name);
}

/**
 * Calculate distance between two keypoints by name in a skeleton
 */
export function getKeypointDistance(
  skeleton: Skeleton, 
  keypoint1: KeypointName, 
  keypoint2: KeypointName
): number | null {
  const kp1 = findKeypoint(skeleton, keypoint1);
  const kp2 = findKeypoint(skeleton, keypoint2);
  
  if (!kp1 || !kp2) {
    return null;
  }
  
  return keypointDistance(kp1, kp2);
}

/**
 * Calculate body proportions and measurements
 */
export interface BodyMeasurements {
  /** Height from head to foot */
  height: number;
  /** Shoulder width */
  shoulderWidth: number;
  /** Hip width */
  hipWidth: number;
  /** Arm span */
  armSpan: number;
  /** Leg length (hip to ankle) */
  leftLegLength: number;
  rightLegLength: number;
  /** Torso length (shoulder to hip) */
  torsoLength: number;
  /** Upper arm length */
  leftUpperArmLength: number;
  rightUpperArmLength: number;
  /** Forearm length */
  leftForearmLength: number;
  rightForearmLength: number;
  /** Thigh length */
  leftThighLength: number;
  rightThighLength: number;
  /** Shin length */
  leftShinLength: number;
  rightShinLength: number;
  /** Confidence in measurements */
  confidence: number;
}

/**
 * Calculate comprehensive body measurements from skeleton
 */
export function calculateBodyMeasurements(skeleton: Skeleton): BodyMeasurements | null {
  const measurements: Partial<BodyMeasurements> = {};
  let totalConfidence = 0;
  let measurementCount = 0;

  // Helper function to add measurement
  const addMeasurement = (name: keyof BodyMeasurements, distance: number | null, confidence: number = 1) => {
    if (distance !== null) {
      (measurements as any)[name] = distance;
      totalConfidence += confidence;
      measurementCount++;
    }
  };

  // Shoulder width
  addMeasurement(
    'shoulderWidth',
    getKeypointDistance(skeleton, KeypointName.LEFT_SHOULDER, KeypointName.RIGHT_SHOULDER)
  );

  // Hip width
  addMeasurement(
    'hipWidth',
    getKeypointDistance(skeleton, KeypointName.LEFT_HIP, KeypointName.RIGHT_HIP)
  );

  // Leg lengths
  addMeasurement(
    'leftLegLength',
    getKeypointDistance(skeleton, KeypointName.LEFT_HIP, KeypointName.LEFT_ANKLE)
  );
  addMeasurement(
    'rightLegLength',
    getKeypointDistance(skeleton, KeypointName.RIGHT_HIP, KeypointName.RIGHT_ANKLE)
  );

  // Torso length (approximate using shoulder to hip)
  const leftTorso = getKeypointDistance(skeleton, KeypointName.LEFT_SHOULDER, KeypointName.LEFT_HIP);
  const rightTorso = getKeypointDistance(skeleton, KeypointName.RIGHT_SHOULDER, KeypointName.RIGHT_HIP);
  if (leftTorso !== null && rightTorso !== null) {
    addMeasurement('torsoLength', (leftTorso + rightTorso) / 2);
  } else {
    addMeasurement('torsoLength', leftTorso || rightTorso);
  }

  // Upper arm lengths
  addMeasurement(
    'leftUpperArmLength',
    getKeypointDistance(skeleton, KeypointName.LEFT_SHOULDER, KeypointName.LEFT_ELBOW)
  );
  addMeasurement(
    'rightUpperArmLength',
    getKeypointDistance(skeleton, KeypointName.RIGHT_SHOULDER, KeypointName.RIGHT_ELBOW)
  );

  // Forearm lengths
  addMeasurement(
    'leftForearmLength',
    getKeypointDistance(skeleton, KeypointName.LEFT_ELBOW, KeypointName.LEFT_WRIST)
  );
  addMeasurement(
    'rightForearmLength',
    getKeypointDistance(skeleton, KeypointName.RIGHT_ELBOW, KeypointName.RIGHT_WRIST)
  );

  // Thigh lengths
  addMeasurement(
    'leftThighLength',
    getKeypointDistance(skeleton, KeypointName.LEFT_HIP, KeypointName.LEFT_KNEE)
  );
  addMeasurement(
    'rightThighLength',
    getKeypointDistance(skeleton, KeypointName.RIGHT_HIP, KeypointName.RIGHT_KNEE)
  );

  // Shin lengths
  addMeasurement(
    'leftShinLength',
    getKeypointDistance(skeleton, KeypointName.LEFT_KNEE, KeypointName.LEFT_ANKLE)
  );
  addMeasurement(
    'rightShinLength',
    getKeypointDistance(skeleton, KeypointName.RIGHT_KNEE, KeypointName.RIGHT_ANKLE)
  );

  // Calculate height (head to foot approximation)
  const nose = findKeypoint(skeleton, KeypointName.NOSE);
  const leftAnkle = findKeypoint(skeleton, KeypointName.LEFT_ANKLE);
  const rightAnkle = findKeypoint(skeleton, KeypointName.RIGHT_ANKLE);
  
  if (nose && (leftAnkle || rightAnkle)) {
    const ankle = leftAnkle || rightAnkle!;
    addMeasurement('height', keypointDistance(nose, ankle));
  }

  // Calculate arm span
  addMeasurement(
    'armSpan',
    getKeypointDistance(skeleton, KeypointName.LEFT_WRIST, KeypointName.RIGHT_WRIST)
  );

  if (measurementCount === 0) {
    return null;
  }

  // Fill in defaults for missing measurements
  const finalMeasurements: BodyMeasurements = {
    height: measurements.height || 0,
    shoulderWidth: measurements.shoulderWidth || 0,
    hipWidth: measurements.hipWidth || 0,
    armSpan: measurements.armSpan || 0,
    leftLegLength: measurements.leftLegLength || 0,
    rightLegLength: measurements.rightLegLength || 0,
    torsoLength: measurements.torsoLength || 0,
    leftUpperArmLength: measurements.leftUpperArmLength || 0,
    rightUpperArmLength: measurements.rightUpperArmLength || 0,
    leftForearmLength: measurements.leftForearmLength || 0,
    rightForearmLength: measurements.rightForearmLength || 0,
    leftThighLength: measurements.leftThighLength || 0,
    rightThighLength: measurements.rightThighLength || 0,
    leftShinLength: measurements.leftShinLength || 0,
    rightShinLength: measurements.rightShinLength || 0,
    confidence: totalConfidence / measurementCount
  };

  return finalMeasurements;
}

/**
 * Calculate step length between two ankle positions
 */
export function calculateStepLength(
  leftAnkle: Point2D,
  rightAnkle: Point2D,
  pixelsPerMeter: number = 100
): number {
  const distancePixels = distance2D(leftAnkle, rightAnkle);
  return distancePixels / pixelsPerMeter; // Convert to meters
}

/**
 * Calculate stride length (distance between consecutive heel strikes of same foot)
 */
export function calculateStrideLength(
  positions: Point2D[],
  pixelsPerMeter: number = 100
): number {
  if (positions.length < 2) {
    return 0;
  }
  
  const totalDistance = positions.reduce((sum, pos, index) => {
    if (index === 0) return 0;
    return sum + distance2D(positions[index - 1], pos);
  }, 0);
  
  return totalDistance / pixelsPerMeter; // Convert to meters
}

/**
 * Calculate angle between three points (middle point is the vertex)
 */
export function calculateAngle(point1: Point2D, vertex: Point2D, point3: Point2D): number {
  const vector1 = { x: point1.x - vertex.x, y: point1.y - vertex.y };
  const vector2 = { x: point3.x - vertex.x, y: point3.y - vertex.y };
  
  const dot = vector1.x * vector2.x + vector1.y * vector2.y;
  const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
  const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
  
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }
  
  const cosTheta = dot / (mag1 * mag2);
  return Math.acos(Math.max(-1, Math.min(1, cosTheta))); // Clamp to valid range
}

/**
 * Calculate joint angles from skeleton
 */
export interface JointAngles {
  leftKnee: number;
  rightKnee: number;
  leftElbow: number;
  rightElbow: number;
  leftHip: number;
  rightHip: number;
  leftAnkle: number;
  rightAnkle: number;
  confidence: number;
}

/**
 * Calculate joint angles from skeleton keypoints
 */
export function calculateJointAngles(skeleton: Skeleton): JointAngles | null {
  const angles: Partial<JointAngles> = {};
  let totalConfidence = 0;
  let angleCount = 0;

  // Helper function to calculate and add joint angle
  const addJointAngle = (
    name: keyof JointAngles,
    point1Name: KeypointName,
    vertexName: KeypointName,
    point3Name: KeypointName
  ) => {
    const point1 = findKeypoint(skeleton, point1Name);
    const vertex = findKeypoint(skeleton, vertexName);
    const point3 = findKeypoint(skeleton, point3Name);
    
    if (point1 && vertex && point3) {
      const angle = calculateAngle(
        { x: point1.x, y: point1.y },
        { x: vertex.x, y: vertex.y },
        { x: point3.x, y: point3.y }
      );
      (angles as any)[name] = angle;
      totalConfidence += Math.min(point1.score, vertex.score, point3.score);
      angleCount++;
    }
  };

  // Calculate joint angles
  addJointAngle('leftKnee', KeypointName.LEFT_HIP, KeypointName.LEFT_KNEE, KeypointName.LEFT_ANKLE);
  addJointAngle('rightKnee', KeypointName.RIGHT_HIP, KeypointName.RIGHT_KNEE, KeypointName.RIGHT_ANKLE);
  addJointAngle('leftElbow', KeypointName.LEFT_SHOULDER, KeypointName.LEFT_ELBOW, KeypointName.LEFT_WRIST);
  addJointAngle('rightElbow', KeypointName.RIGHT_SHOULDER, KeypointName.RIGHT_ELBOW, KeypointName.RIGHT_WRIST);
  
  // Hip angles (using shoulder, hip, knee)
  addJointAngle('leftHip', KeypointName.LEFT_SHOULDER, KeypointName.LEFT_HIP, KeypointName.LEFT_KNEE);
  addJointAngle('rightHip', KeypointName.RIGHT_SHOULDER, KeypointName.RIGHT_HIP, KeypointName.RIGHT_KNEE);

  if (angleCount === 0) {
    return null;
  }

  return {
    leftKnee: angles.leftKnee || 0,
    rightKnee: angles.rightKnee || 0,
    leftElbow: angles.leftElbow || 0,
    rightElbow: angles.rightElbow || 0,
    leftHip: angles.leftHip || 0,
    rightHip: angles.rightHip || 0,
    leftAnkle: angles.leftAnkle || 0,
    rightAnkle: angles.rightAnkle || 0,
    confidence: totalConfidence / angleCount
  };
}

/**
 * Calculate center of mass from skeleton keypoints
 */
export function calculateCenterOfMass(skeleton: Skeleton): Point2D | null {
  const validKeypoints = skeleton.keypoints.filter(kp => kp.score > 0.3);
  
  if (validKeypoints.length === 0) {
    return null;
  }
  
  let totalX = 0;
  let totalY = 0;
  let totalWeight = 0;
  
  validKeypoints.forEach(kp => {
    const weight = kp.score; // Use confidence as weight
    totalX += kp.x * weight;
    totalY += kp.y * weight;
    totalWeight += weight;
  });
  
  return {
    x: totalX / totalWeight,
    y: totalY / totalWeight
  };
}

/**
 * Calculate velocity between two positions over time
 */
export function calculateVelocity(
  position1: Point2D,
  position2: Point2D,
  timeDelta: number, // in seconds
  pixelsPerMeter: number = 100
): Point2D {
  if (timeDelta <= 0) {
    return { x: 0, y: 0 };
  }
  
  const dx = (position2.x - position1.x) / pixelsPerMeter;
  const dy = (position2.y - position1.y) / pixelsPerMeter;
  
  return {
    x: dx / timeDelta, // meters per second
    y: dy / timeDelta
  };
}

/**
 * Calculate acceleration between two velocities over time
 */
export function calculateAcceleration(
  velocity1: Point2D,
  velocity2: Point2D,
  timeDelta: number // in seconds
): Point2D {
  if (timeDelta <= 0) {
    return { x: 0, y: 0 };
  }
  
  return {
    x: (velocity2.x - velocity1.x) / timeDelta, // meters per second squared
    y: (velocity2.y - velocity1.y) / timeDelta
  };
}

/**
 * Calculate bounding box for a set of keypoints
 */
export function calculateBoundingBox(keypoints: EnhancedKeypoint[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (keypoints.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  keypoints.forEach(kp => {
    if (kp.score > 0.3) { // Only consider visible keypoints
      minX = Math.min(minX, kp.x);
      minY = Math.min(minY, kp.y);
      maxX = Math.max(maxX, kp.x);
      maxY = Math.max(maxY, kp.y);
    }
  });
  
  // Add padding
  const padding = 20;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Check if two bounding boxes overlap
 */
export function boundingBoxesOverlap(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    box1.x < box2.x + box2.width &&
    box1.x + box1.width > box2.x &&
    box1.y < box2.y + box2.height &&
    box1.y + box1.height > box2.y
  );
}

/**
 * Calculate intersection over union (IoU) for two bounding boxes
 */
export function calculateIoU(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): number {
  const intersectionX = Math.max(box1.x, box2.x);
  const intersectionY = Math.max(box1.y, box2.y);
  const intersectionWidth = Math.min(box1.x + box1.width, box2.x + box2.width) - intersectionX;
  const intersectionHeight = Math.min(box1.y + box1.height, box2.y + box2.height) - intersectionY;
  
  if (intersectionWidth <= 0 || intersectionHeight <= 0) {
    return 0;
  }
  
  const intersectionArea = intersectionWidth * intersectionHeight;
  const box1Area = box1.width * box1.height;
  const box2Area = box2.width * box2.height;
  const unionArea = box1Area + box2Area - intersectionArea;
  
  return unionArea > 0 ? intersectionArea / unionArea : 0;
}