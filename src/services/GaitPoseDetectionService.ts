/**
 * GaitPoseDetectionService - Unified service for gait-focused pose detection
 * Integrates detection, smoothing, and validation for optimal gait analysis
 */

import { PoseDetectionService } from './PoseDetectionService';
import { PoseSmoothingService } from './PoseSmoothingService';
import { PoseValidationService } from './PoseValidationService';
import {
  PoseDetectionConfig,
  PoseDetectionResult,
  PoseDetectionStats,
  IPoseDetectionService,
  DEFAULT_POSE_CONFIG
} from '../types/pose';

export class GaitPoseDetectionService implements IPoseDetectionService {
  private poseDetectionService: PoseDetectionService;
  private poseSmoothingService: PoseSmoothingService;
  private poseValidationService: PoseValidationService;
  private config: PoseDetectionConfig;

  constructor(config: PoseDetectionConfig = DEFAULT_POSE_CONFIG) {
    this.config = config;
    this.poseDetectionService = new PoseDetectionService();
    this.poseSmoothingService = new PoseSmoothingService(config.smoothing);
    this.poseValidationService = new PoseValidationService(config.validation);
  }

  /**
   * Initialize the gait pose detection service
   */
  async initialize(config: PoseDetectionConfig): Promise<void> {
    this.config = config;
    
    // Initialize core pose detection
    await this.poseDetectionService.initialize(config);
    
    // Update smoothing and validation configurations
    this.poseSmoothingService.updateConfig(config.smoothing);
    this.poseValidationService.updateConfig(config.validation);
    
    console.log('GaitPoseDetectionService initialized successfully');
  }

  /**
   * Detect poses optimized for gait analysis
   */
  async detectPoses(
    imageData: ImageData | HTMLVideoElement | HTMLCanvasElement
  ): Promise<PoseDetectionResult[]> {
    try {
      // Step 1: Raw pose detection
      const rawPoses = await this.poseDetectionService.detectPoses(imageData);
      
      // Step 2: Validate poses
      const validPoses = rawPoses.filter(pose => this.poseValidationService.validate(pose));
      
      // Step 3: Apply smoothing
      const smoothedPoses = this.poseSmoothingService.smooth(validPoses);
      
      // Step 4: Final validation after smoothing
      const finalPoses = smoothedPoses.filter(pose => this.poseValidationService.validate(pose));
      
      return finalPoses;
    } catch (error) {
      console.error('Gait pose detection failed:', error);
      throw error;
    }
  }

  /**
   * Get detection statistics
   */
  getStats(): PoseDetectionStats {
    return this.poseDetectionService.getStats();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PoseDetectionConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update individual services
    this.poseDetectionService.updateConfig(config);
    
    if (config.smoothing) {
      this.poseSmoothingService.updateConfig(config.smoothing);
    }
    
    if (config.validation) {
      this.poseValidationService.updateConfig(config.validation);
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.poseDetectionService.dispose();
    this.poseSmoothingService.reset();
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.poseDetectionService.isReady();
  }

  /**
   * Reset smoothing history
   */
  resetSmoothing(): void {
    this.poseSmoothingService.reset();
  }

  /**
   * Get validation errors for a pose
   */
  getValidationErrors(pose: PoseDetectionResult) {
    return this.poseValidationService.getValidationErrors(pose);
  }

  /**
   * Get smoothing history size
   */
  getSmoothingHistorySize(): number {
    return this.poseSmoothingService.getHistorySize();
  }
}