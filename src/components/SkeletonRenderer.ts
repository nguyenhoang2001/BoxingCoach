/**
 * SkeletonRenderer - Real-time pose overlay rendering for gait detection
 * Implements high-performance Canvas 2D API rendering with smooth animations
 * Based on research optimization techniques for 30+ FPS visualization
 */

import { Pose, Keypoint, VisualizationSettings, Point2D, PerformanceMetrics } from '../types/gait';

export interface SkeletonConnection {
  from: number;
  to: number;
  color: string;
  lineWidth: number;
  group: 'torso' | 'arms' | 'legs' | 'head';
}

export class SkeletonRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private settings: VisualizationSettings;
  private performanceMetrics: PerformanceMetrics;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private animationId: number | null = null;

  // Anatomical connections based on COCO 17-point model
  private readonly connections: SkeletonConnection[] = [
    // Torso
    { from: 5, to: 6, color: '#00ff00', lineWidth: 3, group: 'torso' },   // Shoulders
    { from: 5, to: 11, color: '#00ff00', lineWidth: 3, group: 'torso' },  // Left shoulder to hip
    { from: 6, to: 12, color: '#00ff00', lineWidth: 3, group: 'torso' },  // Right shoulder to hip
    { from: 11, to: 12, color: '#00ff00', lineWidth: 3, group: 'torso' }, // Hips
    
    // Head
    { from: 0, to: 1, color: '#ff0000', lineWidth: 2, group: 'head' },    // Nose to left eye
    { from: 0, to: 2, color: '#ff0000', lineWidth: 2, group: 'head' },    // Nose to right eye
    { from: 1, to: 3, color: '#ff0000', lineWidth: 2, group: 'head' },    // Left eye to ear
    { from: 2, to: 4, color: '#ff0000', lineWidth: 2, group: 'head' },    // Right eye to ear
    
    // Arms
    { from: 5, to: 7, color: '#0000ff', lineWidth: 2, group: 'arms' },    // Left shoulder to elbow
    { from: 7, to: 9, color: '#0000ff', lineWidth: 2, group: 'arms' },    // Left elbow to wrist
    { from: 6, to: 8, color: '#0000ff', lineWidth: 2, group: 'arms' },    // Right shoulder to elbow
    { from: 8, to: 10, color: '#0000ff', lineWidth: 2, group: 'arms' },   // Right elbow to wrist
    
    // Legs
    { from: 11, to: 13, color: '#ffff00', lineWidth: 3, group: 'legs' },  // Left hip to knee
    { from: 13, to: 15, color: '#ffff00', lineWidth: 3, group: 'legs' },  // Left knee to ankle
    { from: 12, to: 14, color: '#ffff00', lineWidth: 3, group: 'legs' },  // Right hip to knee
    { from: 14, to: 16, color: '#ffff00', lineWidth: 3, group: 'legs' },  // Right knee to ankle
  ];

  // Keypoint names for COCO 17-point model
  private readonly keypointNames: string[] = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
  ];

  constructor(canvas: HTMLCanvasElement, settings: VisualizationSettings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.settings = settings;
    this.performanceMetrics = {
      frameRate: 0,
      averageRenderTime: 0,
      memoryUsage: 0,
      droppedFrames: 0,
      processingLatency: 0
    };
    
    this.setupCanvas();
  }

  private setupCanvas(): void {
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  /**
   * Main rendering method - draws complete skeleton overlay
   * Optimized for 30+ FPS performance
   */
  public drawSkeleton(poses: Pose[], videoElement?: HTMLVideoElement): void {
    const startTime = performance.now();
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw video frame if provided
    if (videoElement) {
      this.drawVideoFrame(videoElement);
    }
    
    // Draw poses
    poses.forEach((pose, index) => {
      this.drawPose(pose, index);
    });
    
    // Update performance metrics
    this.updatePerformanceMetrics(startTime);
  }

  private drawVideoFrame(videoElement: HTMLVideoElement): void {
    if (videoElement.readyState >= 2) {
      this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private drawPose(pose: Pose, poseIndex: number): void {
    const keypoints = pose.keypoints;
    
    // Filter keypoints by confidence threshold
    const validKeypoints = keypoints.filter(kp => kp.score > 0.3);
    
    if (validKeypoints.length === 0) return;
    
    // Draw connections first (behind keypoints)
    this.drawConnections(validKeypoints, poseIndex);
    
    // Draw keypoints
    this.drawKeypoints(validKeypoints, poseIndex);
    
    // Draw confidence indicators if enabled
    if (this.settings.showConfidence) {
      this.drawConfidenceIndicators(validKeypoints, poseIndex);
    }
  }

  private drawConnections(keypoints: Keypoint[], poseIndex: number): void {
    this.connections.forEach(connection => {
      const fromPoint = keypoints.find(kp => kp.name === this.keypointNames[connection.from]);
      const toPoint = keypoints.find(kp => kp.name === this.keypointNames[connection.to]);
      
      if (fromPoint && toPoint && fromPoint.score > 0.3 && toPoint.score > 0.3) {
        this.drawConnection(fromPoint, toPoint, connection, poseIndex);
      }
    });
  }

  private drawConnection(from: Keypoint, to: Keypoint, connection: SkeletonConnection, poseIndex: number): void {
    const avgConfidence = (from.score + to.score) / 2;
    const alpha = avgConfidence * this.settings.skeletonOpacity;
    
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = this.getConnectionColor(connection, avgConfidence);
    this.ctx.lineWidth = connection.lineWidth;
    
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
    
    this.ctx.globalAlpha = 1.0;
  }

  private drawKeypoints(keypoints: Keypoint[], poseIndex: number): void {
    keypoints.forEach((keypoint, index) => {
      this.drawKeypoint(keypoint, poseIndex, index);
    });
  }

  private drawKeypoint(keypoint: Keypoint, poseIndex: number, keypointIndex: number): void {
    const { x, y, score } = keypoint;
    const alpha = score * this.settings.skeletonOpacity;
    const radius = this.getKeypointRadius(keypoint.name);
    
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = this.getKeypointColor(keypoint, score);
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Add border for better visibility
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.globalAlpha = 1.0;
  }

  private drawConfidenceIndicators(keypoints: Keypoint[], poseIndex: number): void {
    keypoints.forEach((keypoint, index) => {
      const { x, y, score } = keypoint;
      const barWidth = 30;
      const barHeight = 4;
      const barX = x - barWidth / 2;
      const barY = y - 15;
      
      // Background bar
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Confidence bar
      this.ctx.fillStyle = this.getConfidenceColor(score);
      this.ctx.fillRect(barX, barY, barWidth * score, barHeight);
    });
  }

  private getConnectionColor(connection: SkeletonConnection, confidence: number): string {
    switch (this.settings.colorScheme) {
      case 'confidence':
        return this.getConfidenceColor(confidence);
      case 'phase':
        return this.getPhaseColor(connection.group);
      default:
        return connection.color;
    }
  }

  private getKeypointColor(keypoint: Keypoint, confidence: number): string {
    switch (this.settings.colorScheme) {
      case 'confidence':
        return this.getConfidenceColor(confidence);
      case 'phase':
        return this.getKeypointPhaseColor(keypoint.name);
      default:
        return this.getDefaultKeypointColor(keypoint.name);
    }
  }

  private getConfidenceColor(confidence: number): string {
    if (confidence > 0.8) return '#00ff00';  // Green - high confidence
    if (confidence > 0.6) return '#ffff00';  // Yellow - medium confidence
    if (confidence > 0.4) return '#ff8800';  // Orange - low confidence
    return '#ff0000';                        // Red - very low confidence
  }

  private getPhaseColor(group: string): string {
    switch (group) {
      case 'torso': return '#00ff00';
      case 'arms': return '#0000ff';
      case 'legs': return '#ffff00';
      case 'head': return '#ff0000';
      default: return '#ffffff';
    }
  }

  private getKeypointPhaseColor(keypointName: string): string {
    if (keypointName.includes('eye') || keypointName.includes('ear') || keypointName.includes('nose')) {
      return '#ff0000';  // Head
    }
    if (keypointName.includes('shoulder') || keypointName.includes('hip')) {
      return '#00ff00';  // Torso
    }
    if (keypointName.includes('elbow') || keypointName.includes('wrist')) {
      return '#0000ff';  // Arms
    }
    if (keypointName.includes('knee') || keypointName.includes('ankle')) {
      return '#ffff00';  // Legs
    }
    return '#ffffff';
  }

  private getDefaultKeypointColor(keypointName: string): string {
    if (keypointName.includes('left')) return '#ff0000';
    if (keypointName.includes('right')) return '#0000ff';
    return '#00ff00';
  }

  private getKeypointRadius(keypointName: string): number {
    if (keypointName.includes('hip') || keypointName.includes('shoulder')) {
      return 6;  // Larger for major joints
    }
    if (keypointName.includes('knee') || keypointName.includes('ankle')) {
      return 5;  // Medium for leg joints
    }
    return 4;  // Default size
  }

  private updatePerformanceMetrics(startTime: number): void {
    const renderTime = performance.now() - startTime;
    this.performanceMetrics.averageRenderTime = (this.performanceMetrics.averageRenderTime + renderTime) / 2;
    
    // Calculate frame rate
    const now = performance.now();
    if (this.lastFrameTime) {
      const deltaTime = now - this.lastFrameTime;
      this.performanceMetrics.frameRate = 1000 / deltaTime;
    }
    this.lastFrameTime = now;
    this.frameCount++;
    
    // Update memory usage if available
    if (performance.memory) {
      this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
    }
  }

  /**
   * Update visualization settings
   */
  public updateSettings(newSettings: Partial<VisualizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Resize canvas and update rendering context
   */
  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.setupCanvas();
  }

  /**
   * Clear the canvas
   */
  public clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Get canvas context for external drawing operations
   */
  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Export current frame as image data
   */
  public exportFrame(): ImageData {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Set rendering style based on settings
   */
  private setRenderingStyle(): void {
    switch (this.settings.skeletonStyle) {
      case 'minimal':
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.6;
        break;
      case 'anatomical':
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.8;
        break;
      default:
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 1.0;
    }
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}