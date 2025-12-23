/**
 * GaitTrajectoryRenderer - Real-time gait trajectory visualization
 * Tracks and renders foot trajectories and center of mass movement
 * Optimized for smooth 30+ FPS performance with temporal smoothing
 */

import { 
  GaitTrajectory, 
  TrajectoryPoint, 
  Point3D, 
  Pose, 
  Keypoint, 
  VisualizationSettings 
} from '../types/gait';

export interface TrajectoryStyle {
  color: string;
  lineWidth: number;
  opacity: number;
  showPoints: boolean;
  pointRadius: number;
  fadingEffect: boolean;
}

export class GaitTrajectoryRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trajectories: Map<string, GaitTrajectory> = new Map();
  private settings: VisualizationSettings;
  private maxTrajectoryLength: number = 100;
  private smoothingFactor: number = 0.7;

  // Trajectory styles for different body parts
  private readonly trajectoryStyles: Map<string, TrajectoryStyle> = new Map([
    ['leftFoot', {
      color: '#ff0000',
      lineWidth: 3,
      opacity: 0.8,
      showPoints: true,
      pointRadius: 2,
      fadingEffect: true
    }],
    ['rightFoot', {
      color: '#0000ff',
      lineWidth: 3,
      opacity: 0.8,
      showPoints: true,
      pointRadius: 2,
      fadingEffect: true
    }],
    ['centerOfMass', {
      color: '#00ff00',
      lineWidth: 2,
      opacity: 0.6,
      showPoints: false,
      pointRadius: 1,
      fadingEffect: true
    }]
  ]);

  constructor(canvas: HTMLCanvasElement, settings: VisualizationSettings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.settings = settings;
    this.maxTrajectoryLength = settings.trajectoryLength || 100;
    this.setupCanvas();
  }

  private setupCanvas(): void {
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.imageSmoothingEnabled = true;
  }

  /**
   * Update trajectory data from pose estimation
   */
  public updateTrajectory(personId: string, poses: Pose[]): void {
    if (poses.length === 0) return;

    const pose = poses[0]; // Use first pose for single person tracking
    const timestamp = Date.now();

    // Get or create trajectory for this person
    let trajectory = this.trajectories.get(personId);
    if (!trajectory) {
      trajectory = {
        leftFoot: [],
        rightFoot: [],
        centerOfMass: [],
        maxLength: this.maxTrajectoryLength
      };
      this.trajectories.set(personId, trajectory);
    }

    // Update foot trajectories
    this.updateFootTrajectory(trajectory, pose, timestamp);
    
    // Update center of mass trajectory
    this.updateCenterOfMassTrajectory(trajectory, pose, timestamp);
    
    // Maintain trajectory length limits
    this.limitTrajectoryLength(trajectory);
  }

  private updateFootTrajectory(trajectory: GaitTrajectory, pose: Pose, timestamp: number): void {
    const leftAnkle = pose.keypoints.find(kp => kp.name === 'left_ankle');
    const rightAnkle = pose.keypoints.find(kp => kp.name === 'right_ankle');

    if (leftAnkle && leftAnkle.score > 0.5) {
      const smoothedPoint = this.smoothTrajectoryPoint(
        trajectory.leftFoot,
        { x: leftAnkle.x, y: leftAnkle.y, z: leftAnkle.z || 0 },
        timestamp,
        leftAnkle.score
      );
      trajectory.leftFoot.push(smoothedPoint);
    }

    if (rightAnkle && rightAnkle.score > 0.5) {
      const smoothedPoint = this.smoothTrajectoryPoint(
        trajectory.rightFoot,
        { x: rightAnkle.x, y: rightAnkle.y, z: rightAnkle.z || 0 },
        timestamp,
        rightAnkle.score
      );
      trajectory.rightFoot.push(smoothedPoint);
    }
  }

  private updateCenterOfMassTrajectory(trajectory: GaitTrajectory, pose: Pose, timestamp: number): void {
    const centerOfMass = this.calculateCenterOfMass(pose.keypoints);
    
    if (centerOfMass.confidence > 0.5) {
      const smoothedPoint = this.smoothTrajectoryPoint(
        trajectory.centerOfMass,
        centerOfMass.position,
        timestamp,
        centerOfMass.confidence
      );
      trajectory.centerOfMass.push(smoothedPoint);
    }
  }

  private calculateCenterOfMass(keypoints: Keypoint[]): { position: Point3D, confidence: number } {
    const relevantJoints = [
      'left_shoulder', 'right_shoulder',
      'left_hip', 'right_hip',
      'left_knee', 'right_knee'
    ];

    let totalX = 0, totalY = 0, totalZ = 0;
    let totalWeight = 0;
    let totalConfidence = 0;
    let validJoints = 0;

    // Joint weights for center of mass calculation
    const jointWeights: { [key: string]: number } = {
      'left_hip': 0.3,
      'right_hip': 0.3,
      'left_shoulder': 0.2,
      'right_shoulder': 0.2,
      'left_knee': 0.1,
      'right_knee': 0.1
    };

    relevantJoints.forEach(jointName => {
      const joint = keypoints.find(kp => kp.name === jointName);
      if (joint && joint.score > 0.3) {
        const weight = jointWeights[jointName] || 0.1;
        totalX += joint.x * weight;
        totalY += joint.y * weight;
        totalZ += (joint.z || 0) * weight;
        totalWeight += weight;
        totalConfidence += joint.score;
        validJoints++;
      }
    });

    if (validJoints === 0) {
      return { position: { x: 0, y: 0, z: 0 }, confidence: 0 };
    }

    return {
      position: {
        x: totalX / totalWeight,
        y: totalY / totalWeight,
        z: totalZ / totalWeight
      },
      confidence: totalConfidence / validJoints
    };
  }

  private smoothTrajectoryPoint(
    trajectory: TrajectoryPoint[],
    newPosition: Point3D,
    timestamp: number,
    confidence: number
  ): TrajectoryPoint {
    if (trajectory.length === 0) {
      return {
        position: newPosition,
        timestamp,
        confidence
      };
    }

    // Apply exponential smoothing
    const lastPoint = trajectory[trajectory.length - 1];
    const smoothedPosition = {
      x: this.smoothingFactor * lastPoint.position.x + (1 - this.smoothingFactor) * newPosition.x,
      y: this.smoothingFactor * lastPoint.position.y + (1 - this.smoothingFactor) * newPosition.y,
      z: this.smoothingFactor * lastPoint.position.z + (1 - this.smoothingFactor) * newPosition.z
    };

    return {
      position: smoothedPosition,
      timestamp,
      confidence
    };
  }

  private limitTrajectoryLength(trajectory: GaitTrajectory): void {
    if (trajectory.leftFoot.length > this.maxTrajectoryLength) {
      trajectory.leftFoot.shift();
    }
    if (trajectory.rightFoot.length > this.maxTrajectoryLength) {
      trajectory.rightFoot.shift();
    }
    if (trajectory.centerOfMass.length > this.maxTrajectoryLength) {
      trajectory.centerOfMass.shift();
    }
  }

  /**
   * Render all trajectories
   */
  public drawTrajectories(): void {
    this.trajectories.forEach((trajectory, personId) => {
      this.drawTrajectory(trajectory.leftFoot, 'leftFoot');
      this.drawTrajectory(trajectory.rightFoot, 'rightFoot');
      
      if (this.settings.showParameters) {
        this.drawTrajectory(trajectory.centerOfMass, 'centerOfMass');
      }
    });
  }

  private drawTrajectory(points: TrajectoryPoint[], type: string): void {
    if (points.length < 2) return;

    const style = this.trajectoryStyles.get(type);
    if (!style) return;

    this.ctx.globalAlpha = style.opacity * this.settings.trajectoryOpacity;
    this.ctx.strokeStyle = style.color;
    this.ctx.lineWidth = style.lineWidth;

    // Draw trajectory line
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].position.x, points[0].position.y);

    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      
      // Apply fading effect
      if (style.fadingEffect) {
        const alpha = (i / points.length) * style.opacity * this.settings.trajectoryOpacity;
        this.ctx.globalAlpha = alpha;
      }

      this.ctx.lineTo(point.position.x, point.position.y);
    }

    this.ctx.stroke();

    // Draw trajectory points if enabled
    if (style.showPoints) {
      this.drawTrajectoryPoints(points, style);
    }

    this.ctx.globalAlpha = 1.0;
  }

  private drawTrajectoryPoints(points: TrajectoryPoint[], style: TrajectoryStyle): void {
    this.ctx.fillStyle = style.color;
    
    points.forEach((point, index) => {
      const alpha = style.fadingEffect 
        ? (index / points.length) * style.opacity * this.settings.trajectoryOpacity
        : style.opacity * this.settings.trajectoryOpacity;
      
      this.ctx.globalAlpha = alpha;
      this.ctx.beginPath();
      this.ctx.arc(point.position.x, point.position.y, style.pointRadius, 0, 2 * Math.PI);
      this.ctx.fill();
    });
  }

  /**
   * Draw trajectory with velocity vectors
   */
  public drawVelocityVectors(): void {
    this.trajectories.forEach((trajectory, personId) => {
      this.drawVelocityVector(trajectory.leftFoot, '#ff0000');
      this.drawVelocityVector(trajectory.rightFoot, '#0000ff');
    });
  }

  private drawVelocityVector(points: TrajectoryPoint[], color: string): void {
    if (points.length < 2) return;

    const lastPoint = points[points.length - 1];
    const prevPoint = points[points.length - 2];
    
    if (!lastPoint || !prevPoint) return;

    const deltaTime = (lastPoint.timestamp - prevPoint.timestamp) / 1000; // seconds
    if (deltaTime === 0) return;

    const velocityX = (lastPoint.position.x - prevPoint.position.x) / deltaTime;
    const velocityY = (lastPoint.position.y - prevPoint.position.y) / deltaTime;
    
    // Scale velocity vector for visibility
    const scale = 0.01; // Adjust as needed
    const endX = lastPoint.position.x + velocityX * scale;
    const endY = lastPoint.position.y + velocityY * scale;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.7;

    // Draw velocity vector
    this.ctx.beginPath();
    this.ctx.moveTo(lastPoint.position.x, lastPoint.position.y);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    // Draw arrowhead
    this.drawArrowhead(lastPoint.position.x, lastPoint.position.y, endX, endY);
    
    this.ctx.globalAlpha = 1.0;
  }

  private drawArrowhead(fromX: number, fromY: number, toX: number, toY: number): void {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;

    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - arrowLength * Math.cos(angle - arrowAngle),
      toY - arrowLength * Math.sin(angle - arrowAngle)
    );
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - arrowLength * Math.cos(angle + arrowAngle),
      toY - arrowLength * Math.sin(angle + arrowAngle)
    );
    this.ctx.stroke();
  }

  /**
   * Calculate stride length from trajectory data
   */
  public calculateStrideLength(personId: string, foot: 'left' | 'right'): number {
    const trajectory = this.trajectories.get(personId);
    if (!trajectory) return 0;

    const footTrajectory = foot === 'left' ? trajectory.leftFoot : trajectory.rightFoot;
    if (footTrajectory.length < 2) return 0;

    // Find heel strikes (local minima in Y coordinate)
    const heelStrikes = this.findHeelStrikes(footTrajectory);
    
    if (heelStrikes.length < 2) return 0;

    // Calculate distance between consecutive heel strikes
    const distances = [];
    for (let i = 1; i < heelStrikes.length; i++) {
      const dist = this.calculateDistance(heelStrikes[i-1].position, heelStrikes[i].position);
      distances.push(dist);
    }

    // Return average stride length
    return distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
  }

  private findHeelStrikes(trajectory: TrajectoryPoint[]): TrajectoryPoint[] {
    const heelStrikes: TrajectoryPoint[] = [];
    const minPeakDistance = 20; // Minimum distance between peaks
    const threshold = 0.1; // Minimum prominence

    for (let i = 1; i < trajectory.length - 1; i++) {
      const prev = trajectory[i - 1];
      const curr = trajectory[i];
      const next = trajectory[i + 1];

      // Check if current point is a local minimum
      if (curr.position.y < prev.position.y && curr.position.y < next.position.y) {
        // Check if it's prominent enough
        const prominence = Math.min(prev.position.y - curr.position.y, next.position.y - curr.position.y);
        if (prominence > threshold) {
          // Check minimum distance from last heel strike
          if (heelStrikes.length === 0 || 
              i - heelStrikes[heelStrikes.length - 1].timestamp > minPeakDistance) {
            heelStrikes.push(curr);
          }
        }
      }
    }

    return heelStrikes;
  }

  private calculateDistance(p1: Point3D, p2: Point3D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Clear all trajectories
   */
  public clearTrajectories(): void {
    this.trajectories.clear();
  }

  /**
   * Clear trajectory for specific person
   */
  public clearPersonTrajectory(personId: string): void {
    this.trajectories.delete(personId);
  }

  /**
   * Update settings
   */
  public updateSettings(newSettings: Partial<VisualizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.maxTrajectoryLength = newSettings.trajectoryLength || this.maxTrajectoryLength;
  }

  /**
   * Get trajectory data for analysis
   */
  public getTrajectoryData(personId: string): GaitTrajectory | null {
    return this.trajectories.get(personId) || null;
  }

  /**
   * Export trajectory data
   */
  public exportTrajectoryData(): Map<string, GaitTrajectory> {
    return new Map(this.trajectories);
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.clearTrajectories();
  }
}