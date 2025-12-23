/**
 * Main entry point for the gait detection pose estimation library
 */

// Core services
export { PoseDetectionService } from './services/PoseDetectionService';
export { PoseSmoothingService } from './services/PoseSmoothingService';
export { PoseValidationService } from './services/PoseValidationService';
export { GaitPoseDetectionService } from './services/GaitPoseDetectionService';

// Types and interfaces
export * from './types/pose';

// Utilities
export { PerformanceMonitor, performanceMonitor } from './utils/PerformanceMonitor';
export type { PerformanceMetrics } from './utils/PerformanceMonitor';

// Examples
export { PoseDetectionExample, runPoseDetectionExample } from './examples/PoseDetectionExample';

// Re-export default configuration for convenience
export { DEFAULT_POSE_CONFIG } from './types/pose';