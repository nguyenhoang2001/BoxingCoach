/**
 * PoseValidationService - Validates pose detection results for quality assurance
 */

import {
  IPoseValidationService,
  PoseDetectionResult,
  PoseValidationConfig,
  PoseDetectionError,
  KeypointName,
  EnhancedKeypoint
} from '../types/pose';

export class PoseValidationService implements IPoseValidationService {
  private config: PoseValidationConfig;

  constructor(config: PoseValidationConfig) {
    this.config = config;
  }

  /**
   * Validate pose detection results
   */
  validate(pose: PoseDetectionResult): boolean {
    const errors = this.getValidationErrors(pose);
    return errors.length === 0;
  }

  /**
   * Get validation errors for a pose
   */
  getValidationErrors(pose: PoseDetectionResult): PoseDetectionError[] {
    const errors: PoseDetectionError[] = [];

    // Check pose confidence
    if (pose.confidence < this.config.minPoseConfidence) {
      errors.push(PoseDetectionError.LOW_CONFIDENCE);
    }

    // Check keypoint count
    const visibleKeypoints = this.getVisibleKeypoints(pose.keypoints);
    if (visibleKeypoints.length < this.config.minVisibleKeypoints) {
      errors.push(PoseDetectionError.INSUFFICIENT_KEYPOINTS);
    }

    // Check required keypoints
    if (!this.hasRequiredKeypoints(pose.keypoints)) {
      errors.push(PoseDetectionError.INSUFFICIENT_KEYPOINTS);
    }

    // Check keypoint distances
    if (!this.validateKeypointDistances(pose.keypoints)) {
      errors.push(PoseDetectionError.INVALID_INPUT);
    }

    // Check anatomical plausibility
    if (this.config.enableAnatomicalValidation) {
      if (!this.validateAnatomicalPlausibility(pose.keypoints)) {
        errors.push(PoseDetectionError.INVALID_INPUT);
      }
    }

    // Check for undefined or invalid keypoint properties
    if (!this.validateKeypointProperties(pose.keypoints)) {
      errors.push(PoseDetectionError.INVALID_INPUT);
    }

    return errors;
  }

  /**
   * Update validation configuration
   */
  updateConfig(config: PoseValidationConfig): void {
    this.validateConfig(config);
    this.config = config;
  }

  /**
   * Get visible keypoints (above confidence threshold)
   */
  private getVisibleKeypoints(keypoints: EnhancedKeypoint[]): EnhancedKeypoint[] {
    return keypoints.filter(kp => kp.score >= this.config.minPoseConfidence);
  }

  /**
   * Check if pose has all required keypoints
   */
  private hasRequiredKeypoints(keypoints: EnhancedKeypoint[]): boolean {
    const visibleKeypoints = this.getVisibleKeypoints(keypoints);
    const visibleKeypointNames = new Set(visibleKeypoints.map(kp => kp.name));
    
    return this.config.requiredKeypoints.every(required => 
      visibleKeypointNames.has(required)
    );
  }

  /**
   * Validate distances between keypoints
   */
  private validateKeypointDistances(keypoints: EnhancedKeypoint[]): boolean {
    const visibleKeypoints = this.getVisibleKeypoints(keypoints);
    
    if (visibleKeypoints.length < 2) {
      return true; // Cannot validate distances with less than 2 keypoints
    }

    // Check specific anatomical distances
    const keypointMap = new Map<KeypointName, EnhancedKeypoint>();
    visibleKeypoints.forEach(kp => keypointMap.set(kp.name, kp));

    // Check hip distance (should be reasonable)
    const leftHip = keypointMap.get(KeypointName.LEFT_HIP);
    const rightHip = keypointMap.get(KeypointName.RIGHT_HIP);
    
    if (leftHip && rightHip) {
      const hipDistance = this.calculateDistance(leftHip, rightHip);
      if (hipDistance > this.config.maxKeypointDistance) {
        return false;
      }
    }

    // Check shoulder distance
    const leftShoulder = keypointMap.get(KeypointName.LEFT_SHOULDER);
    const rightShoulder = keypointMap.get(KeypointName.RIGHT_SHOULDER);
    
    if (leftShoulder && rightShoulder) {
      const shoulderDistance = this.calculateDistance(leftShoulder, rightShoulder);
      if (shoulderDistance > this.config.maxKeypointDistance) {
        return false;
      }
    }

    // Check limb segment lengths (should be reasonable)
    if (!this.validateLimbSegmentLengths(keypointMap)) {
      return false;
    }

    return true;
  }

  /**
   * Validate limb segment lengths
   */
  private validateLimbSegmentLengths(keypointMap: Map<KeypointName, EnhancedKeypoint>): boolean {
    const maxSegmentLength = this.config.maxKeypointDistance * 1.5;

    // Check left leg segments
    const leftHip = keypointMap.get(KeypointName.LEFT_HIP);
    const leftKnee = keypointMap.get(KeypointName.LEFT_KNEE);
    const leftAnkle = keypointMap.get(KeypointName.LEFT_ANKLE);

    if (leftHip && leftKnee) {
      const thighLength = this.calculateDistance(leftHip, leftKnee);
      if (thighLength > maxSegmentLength) return false;
    }

    if (leftKnee && leftAnkle) {
      const shinLength = this.calculateDistance(leftKnee, leftAnkle);
      if (shinLength > maxSegmentLength) return false;
    }

    // Check right leg segments
    const rightHip = keypointMap.get(KeypointName.RIGHT_HIP);
    const rightKnee = keypointMap.get(KeypointName.RIGHT_KNEE);
    const rightAnkle = keypointMap.get(KeypointName.RIGHT_ANKLE);

    if (rightHip && rightKnee) {
      const thighLength = this.calculateDistance(rightHip, rightKnee);
      if (thighLength > maxSegmentLength) return false;
    }

    if (rightKnee && rightAnkle) {
      const shinLength = this.calculateDistance(rightKnee, rightAnkle);
      if (shinLength > maxSegmentLength) return false;
    }

    // Check arm segments
    const leftShoulder = keypointMap.get(KeypointName.LEFT_SHOULDER);
    const leftElbow = keypointMap.get(KeypointName.LEFT_ELBOW);
    const leftWrist = keypointMap.get(KeypointName.LEFT_WRIST);

    if (leftShoulder && leftElbow) {
      const upperArmLength = this.calculateDistance(leftShoulder, leftElbow);
      if (upperArmLength > maxSegmentLength) return false;
    }

    if (leftElbow && leftWrist) {
      const forearmLength = this.calculateDistance(leftElbow, leftWrist);
      if (forearmLength > maxSegmentLength) return false;
    }

    return true;
  }

  /**
   * Validate anatomical plausibility
   */
  private validateAnatomicalPlausibility(keypoints: EnhancedKeypoint[]): boolean {
    const visibleKeypoints = this.getVisibleKeypoints(keypoints);
    const keypointMap = new Map<KeypointName, EnhancedKeypoint>();
    visibleKeypoints.forEach(kp => keypointMap.set(kp.name, kp));

    // Check vertical ordering of body parts
    if (!this.validateVerticalOrdering(keypointMap)) {
      return false;
    }

    // Check symmetry constraints
    if (!this.validateSymmetryConstraints(keypointMap)) {
      return false;
    }

    // Check joint angle constraints
    if (!this.validateJointAngles(keypointMap)) {
      return false;
    }

    return true;
  }

  /**
   * Validate vertical ordering of body parts
   */
  private validateVerticalOrdering(keypointMap: Map<KeypointName, EnhancedKeypoint>): boolean {
    // Head should be above shoulders
    const nose = keypointMap.get(KeypointName.NOSE);
    const leftShoulder = keypointMap.get(KeypointName.LEFT_SHOULDER);
    const rightShoulder = keypointMap.get(KeypointName.RIGHT_SHOULDER);

    if (nose && leftShoulder && rightShoulder) {
      const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      if (nose.y > avgShoulderY) return false; // Head below shoulders
    }

    // Shoulders should be above hips
    const leftHip = keypointMap.get(KeypointName.LEFT_HIP);
    const rightHip = keypointMap.get(KeypointName.RIGHT_HIP);

    if (leftShoulder && rightShoulder && leftHip && rightHip) {
      const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      const avgHipY = (leftHip.y + rightHip.y) / 2;
      if (avgShoulderY > avgHipY) return false; // Shoulders below hips
    }

    // Hips should be above knees
    const leftKnee = keypointMap.get(KeypointName.LEFT_KNEE);
    const rightKnee = keypointMap.get(KeypointName.RIGHT_KNEE);

    if (leftHip && leftKnee && leftHip.y > leftKnee.y) return false;
    if (rightHip && rightKnee && rightHip.y > rightKnee.y) return false;

    // Knees should be above ankles
    const leftAnkle = keypointMap.get(KeypointName.LEFT_ANKLE);
    const rightAnkle = keypointMap.get(KeypointName.RIGHT_ANKLE);

    if (leftKnee && leftAnkle && leftKnee.y > leftAnkle.y) return false;
    if (rightKnee && rightAnkle && rightKnee.y > rightAnkle.y) return false;

    return true;
  }

  /**
   * Validate symmetry constraints
   */
  private validateSymmetryConstraints(keypointMap: Map<KeypointName, EnhancedKeypoint>): boolean {
    // Check if left and right keypoints are reasonably aligned
    const leftHip = keypointMap.get(KeypointName.LEFT_HIP);
    const rightHip = keypointMap.get(KeypointName.RIGHT_HIP);

    if (leftHip && rightHip) {
      const hipYDiff = Math.abs(leftHip.y - rightHip.y);
      const hipDistance = this.calculateDistance(leftHip, rightHip);
      
      // Y difference should not be too large compared to X distance
      if (hipYDiff > hipDistance * 0.5) return false;
    }

    // Similar check for shoulders
    const leftShoulder = keypointMap.get(KeypointName.LEFT_SHOULDER);
    const rightShoulder = keypointMap.get(KeypointName.RIGHT_SHOULDER);

    if (leftShoulder && rightShoulder) {
      const shoulderYDiff = Math.abs(leftShoulder.y - rightShoulder.y);
      const shoulderDistance = this.calculateDistance(leftShoulder, rightShoulder);
      
      if (shoulderYDiff > shoulderDistance * 0.5) return false;
    }

    return true;
  }

  /**
   * Validate joint angles
   */
  private validateJointAngles(keypointMap: Map<KeypointName, EnhancedKeypoint>): boolean {
    // Check knee angles (should not be too extreme)
    if (!this.validateKneeAngles(keypointMap)) {
      return false;
    }

    // Check elbow angles
    if (!this.validateElbowAngles(keypointMap)) {
      return false;
    }

    return true;
  }

  /**
   * Validate knee angles
   */
  private validateKneeAngles(keypointMap: Map<KeypointName, EnhancedKeypoint>): boolean {
    // Left knee angle
    const leftHip = keypointMap.get(KeypointName.LEFT_HIP);
    const leftKnee = keypointMap.get(KeypointName.LEFT_KNEE);
    const leftAnkle = keypointMap.get(KeypointName.LEFT_ANKLE);

    if (leftHip && leftKnee && leftAnkle) {
      const angle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
      if (angle < 30 || angle > 180) return false; // Extreme knee bend
    }

    // Right knee angle
    const rightHip = keypointMap.get(KeypointName.RIGHT_HIP);
    const rightKnee = keypointMap.get(KeypointName.RIGHT_KNEE);
    const rightAnkle = keypointMap.get(KeypointName.RIGHT_ANKLE);

    if (rightHip && rightKnee && rightAnkle) {
      const angle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
      if (angle < 30 || angle > 180) return false;
    }

    return true;
  }

  /**
   * Validate elbow angles
   */
  private validateElbowAngles(keypointMap: Map<KeypointName, EnhancedKeypoint>): boolean {
    // Left elbow angle
    const leftShoulder = keypointMap.get(KeypointName.LEFT_SHOULDER);
    const leftElbow = keypointMap.get(KeypointName.LEFT_ELBOW);
    const leftWrist = keypointMap.get(KeypointName.LEFT_WRIST);

    if (leftShoulder && leftElbow && leftWrist) {
      const angle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
      if (angle < 30 || angle > 180) return false;
    }

    // Right elbow angle
    const rightShoulder = keypointMap.get(KeypointName.RIGHT_SHOULDER);
    const rightElbow = keypointMap.get(KeypointName.RIGHT_ELBOW);
    const rightWrist = keypointMap.get(KeypointName.RIGHT_WRIST);

    if (rightShoulder && rightElbow && rightWrist) {
      const angle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
      if (angle < 30 || angle > 180) return false;
    }

    return true;
  }

  /**
   * Validate keypoint properties
   */
  private validateKeypointProperties(keypoints: EnhancedKeypoint[]): boolean {
    for (const keypoint of keypoints) {
      // Check for undefined or invalid coordinates
      if (keypoint.x === undefined || keypoint.y === undefined || 
          keypoint.x === null || keypoint.y === null ||
          !isFinite(keypoint.x) || !isFinite(keypoint.y)) {
        return false;
      }

      // Check for invalid scores
      if (keypoint.score === undefined || keypoint.score === null ||
          !isFinite(keypoint.score) || keypoint.score < 0 || keypoint.score > 1) {
        return false;
      }

      // Check for valid keypoint names
      if (!Object.values(KeypointName).includes(keypoint.name)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate angle between three points
   */
  private calculateAngle(point1: { x: number; y: number }, vertex: { x: number; y: number }, point2: { x: number; y: number }): number {
    const vector1 = { x: point1.x - vertex.x, y: point1.y - vertex.y };
    const vector2 = { x: point2.x - vertex.x, y: point2.y - vertex.y };

    const dot = vector1.x * vector2.x + vector1.y * vector2.y;
    const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosAngle = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))); // Clamp to [-1, 1]

    return (angle * 180) / Math.PI; // Convert to degrees
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: PoseValidationConfig): void {
    if (config.minPoseConfidence !== undefined) {
      if (config.minPoseConfidence < 0 || config.minPoseConfidence > 1) {
        throw new Error('minPoseConfidence must be between 0 and 1');
      }
    }

    if (config.minVisibleKeypoints !== undefined) {
      if (config.minVisibleKeypoints < 0) {
        throw new Error('minVisibleKeypoints must be greater than or equal to 0');
      }
    }

    if (config.maxKeypointDistance !== undefined) {
      if (config.maxKeypointDistance < 0) {
        throw new Error('maxKeypointDistance must be greater than or equal to 0');
      }
    }

    if (config.requiredKeypoints !== undefined) {
      if (!Array.isArray(config.requiredKeypoints)) {
        throw new Error('requiredKeypoints must be an array');
      }
    }
  }
}