/**
 * Example usage of the GaitPoseDetectionService
 * Demonstrates real-time pose detection from webcam for gait analysis
 */

import { GaitPoseDetectionService } from '../services/GaitPoseDetectionService';
import { 
  PoseDetectionConfig, 
  PoseDetectionResult, 
  KeypointName,
  DEFAULT_POSE_CONFIG 
} from '../types/pose';

export class PoseDetectionExample {
  private poseService: GaitPoseDetectionService;
  private videoElement: HTMLVideoElement;
  private canvasElement: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDetecting: boolean = false;
  private animationId: number | null = null;

  constructor() {
    this.poseService = new GaitPoseDetectionService();
    this.videoElement = document.createElement('video');
    this.canvasElement = document.createElement('canvas');
    this.ctx = this.canvasElement.getContext('2d')!;
  }

  /**
   * Initialize the pose detection system
   */
  async initialize(config: PoseDetectionConfig = DEFAULT_POSE_CONFIG): Promise<void> {
    try {
      console.log('Initializing pose detection system...');
      
      // Initialize the pose detection service
      await this.poseService.initialize(config);
      
      // Set up video element
      this.videoElement.width = config.inputResolution.width;
      this.videoElement.height = config.inputResolution.height;
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      
      // Set up canvas
      this.canvasElement.width = config.inputResolution.width;
      this.canvasElement.height = config.inputResolution.height;
      
      console.log('Pose detection system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize pose detection:', error);
      throw error;
    }
  }

  /**
   * Start webcam and begin pose detection
   */
  async startDetection(): Promise<void> {
    try {
      console.log('Starting webcam...');
      
      // Get webcam stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: this.videoElement.width,
          height: this.videoElement.height,
          frameRate: 30
        }
      });
      
      this.videoElement.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          resolve();
        };
      });
      
      console.log('Webcam started successfully');
      
      // Start pose detection loop
      this.isDetecting = true;
      this.detectionLoop();
      
    } catch (error) {
      console.error('Failed to start webcam:', error);
      throw error;
    }
  }

  /**
   * Stop pose detection and cleanup
   */
  stopDetection(): void {
    console.log('Stopping pose detection...');
    
    this.isDetecting = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Stop webcam stream
    if (this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }
    
    // Dispose of pose detection service
    this.poseService.dispose();
    
    console.log('Pose detection stopped');
  }

  /**
   * Main detection loop
   */
  private async detectionLoop(): Promise<void> {
    if (!this.isDetecting) return;
    
    try {
      // Detect poses from current video frame
      const poses = await this.poseService.detectPoses(this.videoElement);
      
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      
      // Draw video frame
      this.ctx.drawImage(
        this.videoElement,
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );
      
      // Draw pose overlays
      this.drawPoseOverlays(poses);
      
      // Display statistics
      this.displayStats();
      
      // Log gait-specific metrics
      this.analyzeGaitMetrics(poses);
      
    } catch (error) {
      console.error('Detection loop error:', error);
    }
    
    // Schedule next frame
    this.animationId = requestAnimationFrame(() => this.detectionLoop());
  }

  /**
   * Draw pose overlays on canvas
   */
  private drawPoseOverlays(poses: PoseDetectionResult[]): void {
    for (const pose of poses) {
      // Draw keypoints
      this.drawKeypoints(pose.keypoints);
      
      // Draw skeleton connections
      this.drawSkeleton(pose.keypoints);
      
      // Draw bounding box
      this.drawBoundingBox(pose.boundingBox);
      
      // Draw confidence score
      this.drawConfidenceScore(pose.confidence, pose.boundingBox);
    }
  }

  /**
   * Draw individual keypoints
   */
  private drawKeypoints(keypoints: any[]): void {
    this.ctx.fillStyle = '#00ff00';
    
    for (const keypoint of keypoints) {
      if (keypoint.score > 0.5) {
        this.ctx.beginPath();
        this.ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw keypoint name
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px Arial';
        this.ctx.fillText(
          keypoint.name,
          keypoint.x + 5,
          keypoint.y - 5
        );
        this.ctx.fillStyle = '#00ff00';
      }
    }
  }

  /**
   * Draw skeleton connections
   */
  private drawSkeleton(keypoints: any[]): void {
    const keypointMap = new Map();
    keypoints.forEach(kp => keypointMap.set(kp.name, kp));
    
    const connections = [
      // Torso
      [KeypointName.LEFT_SHOULDER, KeypointName.RIGHT_SHOULDER],
      [KeypointName.LEFT_SHOULDER, KeypointName.LEFT_HIP],
      [KeypointName.RIGHT_SHOULDER, KeypointName.RIGHT_HIP],
      [KeypointName.LEFT_HIP, KeypointName.RIGHT_HIP],
      
      // Left leg
      [KeypointName.LEFT_HIP, KeypointName.LEFT_KNEE],
      [KeypointName.LEFT_KNEE, KeypointName.LEFT_ANKLE],
      
      // Right leg
      [KeypointName.RIGHT_HIP, KeypointName.RIGHT_KNEE],
      [KeypointName.RIGHT_KNEE, KeypointName.RIGHT_ANKLE],
      
      // Left arm
      [KeypointName.LEFT_SHOULDER, KeypointName.LEFT_ELBOW],
      [KeypointName.LEFT_ELBOW, KeypointName.LEFT_WRIST],
      
      // Right arm
      [KeypointName.RIGHT_SHOULDER, KeypointName.RIGHT_ELBOW],
      [KeypointName.RIGHT_ELBOW, KeypointName.RIGHT_WRIST]
    ];
    
    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 2;
    
    for (const [start, end] of connections) {
      const startPoint = keypointMap.get(start);
      const endPoint = keypointMap.get(end);
      
      if (startPoint && endPoint && startPoint.score > 0.5 && endPoint.score > 0.5) {
        this.ctx.beginPath();
        this.ctx.moveTo(startPoint.x, startPoint.y);
        this.ctx.lineTo(endPoint.x, endPoint.y);
        this.ctx.stroke();
      }
    }
  }

  /**
   * Draw bounding box
   */
  private drawBoundingBox(boundingBox: { x: number; y: number; width: number; height: number }): void {
    this.ctx.strokeStyle = '#0000ff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
  }

  /**
   * Draw confidence score
   */
  private drawConfidenceScore(confidence: number, boundingBox: { x: number; y: number; width: number; height: number }): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(
      `Confidence: ${(confidence * 100).toFixed(1)}%`,
      boundingBox.x,
      boundingBox.y - 10
    );
  }

  /**
   * Display performance statistics
   */
  private displayStats(): void {
    const stats = this.poseService.getStats();
    
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(10, 10, 200, 120);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    
    const statsText = [
      `FPS: ${stats.currentFPS.toFixed(1)}`,
      `Processing: ${stats.avgProcessingTime.toFixed(1)}ms`,
      `Total Poses: ${stats.totalPoses}`,
      `Avg Confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`,
      `Memory: ${stats.memoryUsage.toFixed(1)}MB`,
      `Dropped Frames: ${stats.droppedFrames}`
    ];
    
    statsText.forEach((text, index) => {
      this.ctx.fillText(text, 15, 30 + index * 16);
    });
  }

  /**
   * Analyze gait-specific metrics
   */
  private analyzeGaitMetrics(poses: PoseDetectionResult[]): void {
    for (const pose of poses) {
      const gaitMetrics = this.calculateGaitMetrics(pose);
      
      // Log gait analysis (in a real application, this would be processed further)
      if (gaitMetrics) {
        console.log('Gait Metrics:', {
          stepLength: gaitMetrics.stepLength,
          strideWidth: gaitMetrics.strideWidth,
          kneeAngle: gaitMetrics.kneeAngle,
          hipAngle: gaitMetrics.hipAngle,
          symmetry: gaitMetrics.symmetry
        });
      }
    }
  }

  /**
   * Calculate basic gait metrics from pose
   */
  private calculateGaitMetrics(pose: PoseDetectionResult): any {
    const keypointMap = new Map();
    pose.keypoints.forEach(kp => keypointMap.set(kp.name, kp));
    
    const leftHip = keypointMap.get(KeypointName.LEFT_HIP);
    const rightHip = keypointMap.get(KeypointName.RIGHT_HIP);
    const leftKnee = keypointMap.get(KeypointName.LEFT_KNEE);
    const rightKnee = keypointMap.get(KeypointName.RIGHT_KNEE);
    const leftAnkle = keypointMap.get(KeypointName.LEFT_ANKLE);
    const rightAnkle = keypointMap.get(KeypointName.RIGHT_ANKLE);
    
    if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
      return null;
    }
    
    // Calculate stride width (distance between feet)
    const strideWidth = Math.abs(leftAnkle.x - rightAnkle.x);
    
    // Calculate step length (forward/backward foot position)
    const stepLength = Math.abs(leftAnkle.y - rightAnkle.y);
    
    // Calculate knee angles
    const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
    
    // Calculate hip angles (simplified)
    const leftHipAngle = this.calculateAngle(
      { x: leftHip.x, y: leftHip.y - 50 }, // Approximate torso point
      leftHip,
      leftKnee
    );
    const rightHipAngle = this.calculateAngle(
      { x: rightHip.x, y: rightHip.y - 50 }, // Approximate torso point
      rightHip,
      rightKnee
    );
    
    // Calculate symmetry (difference between left and right)
    const symmetry = {
      kneeAngle: Math.abs(leftKneeAngle - rightKneeAngle),
      hipAngle: Math.abs(leftHipAngle - rightHipAngle)
    };
    
    return {
      stepLength,
      strideWidth,
      kneeAngle: { left: leftKneeAngle, right: rightKneeAngle },
      hipAngle: { left: leftHipAngle, right: rightHipAngle },
      symmetry
    };
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
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    return (angle * 180) / Math.PI;
  }

  /**
   * Get canvas element for display
   */
  getCanvasElement(): HTMLCanvasElement {
    return this.canvasElement;
  }

  /**
   * Get current pose detection service
   */
  getPoseService(): GaitPoseDetectionService {
    return this.poseService;
  }
}

// Example usage
export async function runPoseDetectionExample(): Promise<void> {
  const example = new PoseDetectionExample();
  
  try {
    // Initialize with optimized config for gait analysis
    const gaitConfig: PoseDetectionConfig = {
      ...DEFAULT_POSE_CONFIG,
      modelType: 'lightning', // Faster for real-time
      inputResolution: { width: 640, height: 480 },
      validation: {
        ...DEFAULT_POSE_CONFIG.validation,
        minPoseConfidence: 0.6,
        minVisibleKeypoints: 8, // Require more keypoints for gait analysis
        requiredKeypoints: [
          KeypointName.LEFT_HIP,
          KeypointName.RIGHT_HIP,
          KeypointName.LEFT_KNEE,
          KeypointName.RIGHT_KNEE,
          KeypointName.LEFT_ANKLE,
          KeypointName.RIGHT_ANKLE
        ]
      },
      smoothing: {
        ...DEFAULT_POSE_CONFIG.smoothing,
        smoothingFactor: 0.8, // More smoothing for stable gait analysis
        enableVelocitySmoothing: true
      }
    };
    
    await example.initialize(gaitConfig);
    
    // Add canvas to DOM
    document.body.appendChild(example.getCanvasElement());
    
    // Start detection
    await example.startDetection();
    
    console.log('Pose detection example started. Press Ctrl+C to stop.');
    
  } catch (error) {
    console.error('Example failed:', error);
  }
}