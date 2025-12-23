import { Pose, Keypoint } from '@tensorflow-models/pose-detection';

export interface GaitParameters {
  cadence: number;              // steps per minute
  strideLength: number;         // meters
  strideTime: number;          // seconds
  stepWidth: number;           // meters
  velocity: number;            // meters per second
  symmetryIndex: number;       // percentage (0-100)
  confidence: number;          // 0-1
  leftStepLength: number;      // meters
  rightStepLength: number;     // meters
  gaitPhase: GaitPhase;        // current phase
  stanceTime: number;          // seconds
  swingTime: number;           // seconds
  doubleSupport: number;       // percentage of gait cycle
}

export interface GaitPhase {
  left: 'heel-strike' | 'foot-flat' | 'mid-stance' | 'heel-off' | 'toe-off' | 'mid-swing' | 'terminal-swing';
  right: 'heel-strike' | 'foot-flat' | 'mid-stance' | 'heel-off' | 'toe-off' | 'mid-swing' | 'terminal-swing';
  leftProgress: number;  // 0-1, progress through current phase
  rightProgress: number; // 0-1, progress through current phase
  confidence: number;    // 0-1
}

export interface GaitEvent {
  type: 'heel-strike' | 'toe-off' | 'foot-flat' | 'heel-off';
  foot: 'left' | 'right';
  timestamp: number;
  position: { x: number; y: number };
  confidence: number;
}

export interface CalibrationData {
  pixelsPerMeter: number;
  referenceHeight: number; // meters
  cameraHeight: number;    // meters
  cameraAngle: number;     // degrees
}

interface PoseData {
  pose: Pose;
  timestamp: number;
  leftAnkle: Keypoint;
  rightAnkle: Keypoint;
  leftKnee: Keypoint;
  rightKnee: Keypoint;
  leftHip: Keypoint;
  rightHip: Keypoint;
}

export class GaitAnalysisService {
  private poseHistory: PoseData[] = [];
  private gaitEvents: GaitEvent[] = [];
  private calibration: CalibrationData | null = null;
  private readonly maxHistoryLength = 300; // 10 seconds at 30 FPS
  private readonly minConfidence = 0.4;
  
  // Gait analysis parameters
  private readonly velocityThreshold = 5; // pixels per frame for movement detection
  private readonly minStepDuration = 200; // milliseconds
  private readonly maxStepDuration = 2000; // milliseconds
  
  // Statistical tracking
  private stepLengths: { left: number[]; right: number[] } = { left: [], right: [] };
  private stepTimes: { left: number[]; right: number[] } = { left: [], right: [] };
  private cadenceHistory: number[] = [];

  /**
   * Add a new pose to the analysis pipeline
   */
  addPose(pose: Pose, timestamp: number): void {
    const keypoints = pose.keypoints;
    
    // Extract relevant keypoints for gait analysis
    const leftAnkle = keypoints[15];
    const rightAnkle = keypoints[16];
    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];

    // Only add if ankle keypoints are confident enough
    if (leftAnkle.score > this.minConfidence && rightAnkle.score > this.minConfidence) {
      const poseData: PoseData = {
        pose,
        timestamp,
        leftAnkle,
        rightAnkle,
        leftKnee,
        rightKnee,
        leftHip,
        rightHip
      };

      this.poseHistory.push(poseData);
      
      // Detect gait events
      this.detectGaitEvents(poseData);
      
      // Maintain history size
      if (this.poseHistory.length > this.maxHistoryLength) {
        this.poseHistory.shift();
      }
      
      // Clean old events
      const cutoffTime = timestamp - 30000; // 30 seconds
      this.gaitEvents = this.gaitEvents.filter(event => event.timestamp > cutoffTime);
    }
  }

  /**
   * Detect gait events (heel strike, toe off, etc.)
   */
  private detectGaitEvents(currentPose: PoseData): void {
    if (this.poseHistory.length < 5) return;

    const recentPoses = this.poseHistory.slice(-5);
    
    // Detect heel strikes and toe offs for each foot
    this.detectFootEvents('left', recentPoses, currentPose);
    this.detectFootEvents('right', recentPoses, currentPose);
  }

  private detectFootEvents(foot: 'left' | 'right', recentPoses: PoseData[], currentPose: PoseData): void {
    const ankleKey = foot === 'left' ? 'leftAnkle' : 'rightAnkle';
    const kneeKey = foot === 'left' ? 'leftKnee' : 'rightKnee';

    // Calculate vertical velocity of ankle
    const velocities = [];
    for (let i = 1; i < recentPoses.length; i++) {
      const prev = recentPoses[i - 1][ankleKey];
      const curr = recentPoses[i][ankleKey];
      const dt = (recentPoses[i].timestamp - recentPoses[i - 1].timestamp) / 1000;
      
      if (dt > 0) {
        const velocity = (curr.y - prev.y) / dt; // positive = downward
        velocities.push(velocity);
      }
    }

    if (velocities.length < 3) return;

    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const currentAnkle = currentPose[ankleKey];
    const currentKnee = currentPose[kneeKey];

    // Heel strike detection: ankle moving down and below knee
    if (avgVelocity > this.velocityThreshold && currentAnkle.y > currentKnee.y - 20) {
      const lastHeelStrike = this.getLastEvent(foot, 'heel-strike');
      if (!lastHeelStrike || (currentPose.timestamp - lastHeelStrike.timestamp) > this.minStepDuration) {
        this.gaitEvents.push({
          type: 'heel-strike',
          foot,
          timestamp: currentPose.timestamp,
          position: { x: currentAnkle.x, y: currentAnkle.y },
          confidence: Math.min(currentAnkle.score, currentKnee.score)
        });
      }
    }

    // Toe off detection: ankle moving up rapidly
    if (avgVelocity < -this.velocityThreshold) {
      const lastToeOff = this.getLastEvent(foot, 'toe-off');
      if (!lastToeOff || (currentPose.timestamp - lastToeOff.timestamp) > this.minStepDuration) {
        this.gaitEvents.push({
          type: 'toe-off',
          foot,
          timestamp: currentPose.timestamp,
          position: { x: currentAnkle.x, y: currentAnkle.y },
          confidence: Math.min(currentAnkle.score, currentKnee.score)
        });
      }
    }
  }

  private getLastEvent(foot: 'left' | 'right', type: GaitEvent['type']): GaitEvent | undefined {
    return this.gaitEvents
      .filter(event => event.foot === foot && event.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  /**
   * Calculate comprehensive gait parameters
   */
  calculateGaitParameters(): GaitParameters {
    if (this.poseHistory.length < 30) {
      return this.getEmptyParameters();
    }

    const cadence = this.calculateCadence();
    const { leftStepLength, rightStepLength } = this.calculateStepLengths();
    const strideLength = (leftStepLength + rightStepLength) / 2;
    const strideTime = this.calculateStrideTime();
    const stepWidth = this.calculateStepWidth();
    const velocity = this.calculateVelocity();
    const symmetryIndex = this.calculateSymmetryIndex();
    const gaitPhase = this.calculateGaitPhase();
    const stanceTime = this.calculateStanceTime();
    const swingTime = this.calculateSwingTime();
    const doubleSupport = this.calculateDoubleSupport();
    const confidence = this.calculateOverallConfidence();

    return {
      cadence,
      strideLength,
      strideTime,
      stepWidth,
      velocity,
      symmetryIndex,
      confidence,
      leftStepLength,
      rightStepLength,
      gaitPhase,
      stanceTime,
      swingTime,
      doubleSupport
    };
  }

  private calculateCadence(): number {
    const heelStrikes = this.gaitEvents.filter(e => e.type === 'heel-strike');
    if (heelStrikes.length < 4) return 0;

    const recentStrikes = heelStrikes.slice(-10);
    const timeSpan = (recentStrikes[recentStrikes.length - 1].timestamp - recentStrikes[0].timestamp) / 1000;
    const steps = recentStrikes.length - 1;
    
    if (timeSpan <= 0) return 0;
    
    const cadence = (steps / timeSpan) * 60; // steps per minute
    this.cadenceHistory.push(cadence);
    
    // Keep only recent cadence values
    if (this.cadenceHistory.length > 20) {
      this.cadenceHistory.shift();
    }
    
    return this.cadenceHistory.reduce((a, b) => a + b, 0) / this.cadenceHistory.length;
  }

  private calculateStepLengths(): { leftStepLength: number; rightStepLength: number } {
    if (!this.calibration) {
      return { leftStepLength: 0, rightStepLength: 0 };
    }

    const leftHeelStrikes = this.gaitEvents.filter(e => e.type === 'heel-strike' && e.foot === 'left');
    const rightHeelStrikes = this.gaitEvents.filter(e => e.type === 'heel-strike' && e.foot === 'right');

    const leftStepLength = this.calculateStepLength(leftHeelStrikes);
    const rightStepLength = this.calculateStepLength(rightHeelStrikes);

    return { leftStepLength, rightStepLength };
  }

  private calculateStepLength(heelStrikes: GaitEvent[]): number {
    if (heelStrikes.length < 2 || !this.calibration) return 0;

    const distances: number[] = [];
    
    for (let i = 1; i < heelStrikes.length; i++) {
      const prev = heelStrikes[i - 1];
      const curr = heelStrikes[i];
      
      const pixelDistance = Math.sqrt(
        Math.pow(curr.position.x - prev.position.x, 2) +
        Math.pow(curr.position.y - prev.position.y, 2)
      );
      
      // Convert to meters using calibration
      const meterDistance = pixelDistance / this.calibration.pixelsPerMeter;
      
      // Filter reasonable step lengths (0.3m to 2.0m)
      if (meterDistance >= 0.3 && meterDistance <= 2.0) {
        distances.push(meterDistance);
      }
    }

    return distances.length > 0 
      ? distances.reduce((a, b) => a + b, 0) / distances.length
      : 0;
  }

  private calculateStrideTime(): number {
    const leftHeelStrikes = this.gaitEvents.filter(e => 
      e.type === 'heel-strike' && e.foot === 'left'
    );
    
    if (leftHeelStrikes.length < 2) return 0;
    
    const intervals: number[] = [];
    for (let i = 1; i < leftHeelStrikes.length; i++) {
      const interval = (leftHeelStrikes[i].timestamp - leftHeelStrikes[i - 1].timestamp) / 1000;
      if (interval >= 0.5 && interval <= 3.0) { // Reasonable stride times
        intervals.push(interval);
      }
    }
    
    return intervals.length > 0 
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;
  }

  private calculateStepWidth(): number {
    if (!this.calibration || this.poseHistory.length < 10) return 0;
    
    const recentPoses = this.poseHistory.slice(-10);
    const widths: number[] = [];
    
    recentPoses.forEach(poseData => {
      const leftAnkle = poseData.leftAnkle;
      const rightAnkle = poseData.rightAnkle;
      
      if (leftAnkle.score > this.minConfidence && rightAnkle.score > this.minConfidence) {
        const pixelWidth = Math.abs(rightAnkle.x - leftAnkle.x);
        const meterWidth = pixelWidth / this.calibration!.pixelsPerMeter;
        
        if (meterWidth >= 0.05 && meterWidth <= 0.5) { // Reasonable step widths
          widths.push(meterWidth);
        }
      }
    });
    
    return widths.length > 0 
      ? widths.reduce((a, b) => a + b, 0) / widths.length
      : 0;
  }

  private calculateVelocity(): number {
    const strideLength = this.calculateStepLengths();
    const avgStride = (strideLength.leftStepLength + strideLength.rightStepLength) / 2;
    const cadence = this.calculateCadence();
    
    if (avgStride === 0 || cadence === 0) return 0;
    
    // Velocity = stride length * cadence / 60 (convert from steps/min to steps/sec)
    return (avgStride * cadence) / 60;
  }

  private calculateSymmetryIndex(): number {
    const { leftStepLength, rightStepLength } = this.calculateStepLengths();
    
    if (leftStepLength === 0 || rightStepLength === 0) return 0;
    
    const ratio = Math.min(leftStepLength, rightStepLength) / Math.max(leftStepLength, rightStepLength);
    return ratio * 100; // Convert to percentage
  }

  private calculateGaitPhase(): GaitPhase {
    const currentTime = Date.now();
    
    // Get recent gait events for each foot
    const leftEvents = this.gaitEvents.filter(e => e.foot === 'left' && currentTime - e.timestamp < 5000);
    const rightEvents = this.gaitEvents.filter(e => e.foot === 'right' && currentTime - e.timestamp < 5000);
    
    const leftPhase = this.determineFootPhase(leftEvents, currentTime);
    const rightPhase = this.determineFootPhase(rightEvents, currentTime);
    
    return {
      left: leftPhase.phase,
      right: rightPhase.phase,
      leftProgress: leftPhase.progress,
      rightProgress: rightPhase.progress,
      confidence: Math.min(leftPhase.confidence, rightPhase.confidence)
    };
  }

  private determineFootPhase(events: GaitEvent[], currentTime: number): {
    phase: GaitPhase['left'];
    progress: number;
    confidence: number;
  } {
    if (events.length === 0) {
      return {
        phase: 'mid-stance',
        progress: 0.5,
        confidence: 0
      };
    }

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);
    const lastEvent = events[events.length - 1];
    const timeSinceLastEvent = currentTime - lastEvent.timestamp;

    // Determine phase based on last event and time elapsed
    let phase: GaitPhase['left'] = 'mid-stance';
    let progress = 0.5;

    if (lastEvent.type === 'heel-strike') {
      if (timeSinceLastEvent < 200) {
        phase = 'heel-strike';
        progress = 0;
      } else if (timeSinceLastEvent < 400) {
        phase = 'foot-flat';
        progress = timeSinceLastEvent / 400;
      } else {
        phase = 'mid-stance';
        progress = Math.min((timeSinceLastEvent - 400) / 400, 1);
      }
    } else if (lastEvent.type === 'toe-off') {
      if (timeSinceLastEvent < 300) {
        phase = 'toe-off';
        progress = 0;
      } else if (timeSinceLastEvent < 600) {
        phase = 'mid-swing';
        progress = (timeSinceLastEvent - 300) / 300;
      } else {
        phase = 'terminal-swing';
        progress = Math.min((timeSinceLastEvent - 600) / 200, 1);
      }
    }

    return {
      phase,
      progress,
      confidence: lastEvent.confidence
    };
  }

  private calculateStanceTime(): number {
    const leftEvents = this.gaitEvents.filter(e => e.foot === 'left');
    const stanceTimes: number[] = [];

    for (let i = 0; i < leftEvents.length - 1; i++) {
      const heelStrike = leftEvents.find(e => e.type === 'heel-strike' && e.timestamp >= leftEvents[i].timestamp);
      const toeOff = leftEvents.find(e => e.type === 'toe-off' && e.timestamp > (heelStrike?.timestamp || 0));
      
      if (heelStrike && toeOff) {
        const stanceTime = (toeOff.timestamp - heelStrike.timestamp) / 1000;
        if (stanceTime >= 0.2 && stanceTime <= 1.5) {
          stanceTimes.push(stanceTime);
        }
      }
    }

    return stanceTimes.length > 0 
      ? stanceTimes.reduce((a, b) => a + b, 0) / stanceTimes.length
      : 0;
  }

  private calculateSwingTime(): number {
    const strideTime = this.calculateStrideTime();
    const stanceTime = this.calculateStanceTime();
    
    return strideTime > stanceTime ? strideTime - stanceTime : 0;
  }

  private calculateDoubleSupport(): number {
    const strideTime = this.calculateStrideTime();
    if (strideTime === 0) return 0;

    // Estimate double support as 20% of stride time (typical value)
    // In a more sophisticated implementation, this would be calculated
    // from actual foot contact timing
    return 20; // percentage
  }

  private calculateOverallConfidence(): number {
    if (this.poseHistory.length === 0) return 0;
    
    const recentPoses = this.poseHistory.slice(-10);
    const ankleConfidences: number[] = [];
    
    recentPoses.forEach(poseData => {
      if (poseData.leftAnkle.score > this.minConfidence) {
        ankleConfidences.push(poseData.leftAnkle.score);
      }
      if (poseData.rightAnkle.score > this.minConfidence) {
        ankleConfidences.push(poseData.rightAnkle.score);
      }
    });
    
    const avgConfidence = ankleConfidences.length > 0
      ? ankleConfidences.reduce((a, b) => a + b, 0) / ankleConfidences.length
      : 0;

    // Factor in number of recent gait events
    const recentEvents = this.gaitEvents.filter(e => Date.now() - e.timestamp < 5000);
    const eventFactor = Math.min(recentEvents.length / 10, 1); // More events = higher confidence

    return avgConfidence * eventFactor;
  }

  private getEmptyParameters(): GaitParameters {
    return {
      cadence: 0,
      strideLength: 0,
      strideTime: 0,
      stepWidth: 0,
      velocity: 0,
      symmetryIndex: 0,
      confidence: 0,
      leftStepLength: 0,
      rightStepLength: 0,
      gaitPhase: {
        left: 'mid-stance',
        right: 'mid-stance',
        leftProgress: 0,
        rightProgress: 0,
        confidence: 0
      },
      stanceTime: 0,
      swingTime: 0,
      doubleSupport: 0
    };
  }

  /**
   * Calibrate the system using a reference measurement
   */
  calibrate(calibrationData: CalibrationData): void {
    this.calibration = calibrationData;
  }

  /**
   * Auto-calibrate using average human proportions
   */
  autoCalibrate(pose: Pose): CalibrationData | null {
    const keypoints = pose.keypoints;
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];

    if (leftShoulder.score < 0.6 || rightShoulder.score < 0.6 ||
        leftHip.score < 0.6 || rightHip.score < 0.6) {
      return null;
    }

    // Calculate shoulder and hip widths in pixels
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    const hipWidth = Math.abs(rightHip.x - leftHip.x);
    const torsoHeight = Math.abs((leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2);

    // Average human proportions (in meters)
    const avgShoulderWidth = 0.45; // 45cm
    const avgHipWidth = 0.35; // 35cm
    const avgTorsoHeight = 0.6; // 60cm

    // Calculate pixels per meter using multiple references
    const pixelsPerMeterShoulder = shoulderWidth / avgShoulderWidth;
    const pixelsPerMeterHip = hipWidth / avgHipWidth;
    const pixelsPerMeterTorso = torsoHeight / avgTorsoHeight;

    // Use average of the three measurements
    const pixelsPerMeter = (pixelsPerMeterShoulder + pixelsPerMeterHip + pixelsPerMeterTorso) / 3;

    const calibrationData: CalibrationData = {
      pixelsPerMeter,
      referenceHeight: 1.7, // Assume average height
      cameraHeight: 1.0, // Assume standard webcam height
      cameraAngle: 0 // Assume no tilt
    };

    this.calibration = calibrationData;
    return calibrationData;
  }

  /**
   * Get recent gait events
   */
  getRecentEvents(timeWindow = 5000): GaitEvent[] {
    const cutoffTime = Date.now() - timeWindow;
    return this.gaitEvents.filter(event => event.timestamp > cutoffTime);
  }

  /**
   * Get pose history for trajectory visualization
   */
  getPoseHistory(timeWindow = 3000): PoseData[] {
    const cutoffTime = Date.now() - timeWindow;
    return this.poseHistory.filter(pose => pose.timestamp > cutoffTime);
  }

  /**
   * Reset the analysis state
   */
  reset(): void {
    this.poseHistory = [];
    this.gaitEvents = [];
    this.stepLengths = { left: [], right: [] };
    this.stepTimes = { left: [], right: [] };
    this.cadenceHistory = [];
  }

  /**
   * Get current calibration data
   */
  getCalibration(): CalibrationData | null {
    return this.calibration;
  }

  /**
   * Check if system is calibrated
   */
  isCalibrated(): boolean {
    return this.calibration !== null;
  }
}