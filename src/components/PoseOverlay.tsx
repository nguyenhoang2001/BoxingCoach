/**
 * PoseOverlay - Advanced visual overlay component for real-time pose detection
 * Renders keypoints, skeletal connections, and confidence indicators on canvas
 * Designed for smooth 30+ FPS performance with adaptive quality
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Settings2, Gauge, Timer } from 'lucide-react';

import { 
  PoseDetectionResult, 
  EnhancedKeypoint, 
  KeypointName 
} from '../types/pose';
import { 
  VisualizationSettings, 
  PerformanceMetrics,
  Point2D 
} from '../types/gait';

// Enhanced skeletal connection definition
interface SkeletalConnection {
  from: KeypointName;
  to: KeypointName;
  color: string;
  width: number;
  group: 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';
  priority: number; // Higher priority connections are drawn last
}

// Visual style configuration
interface OverlayStyle {
  keypoint: {
    radius: number;
    strokeWidth: number;
    glowRadius: number;
  };
  connection: {
    width: number;
    dashPattern?: number[];
    shadowBlur: number;
  };
  confidence: {
    barWidth: number;
    barHeight: number;
    offset: number;
  };
  animation: {
    duration: number;
    easing: string;
  };
}

interface PoseOverlayProps {
  /** Canvas element to render on */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Video element for size reference */
  videoRef?: React.RefObject<HTMLVideoElement>;
  /** Pose detection results to visualize */
  poses: PoseDetectionResult[];
  /** Visualization settings */
  settings: VisualizationSettings;
  /** Whether overlay is active */
  isActive: boolean;
  /** Performance optimization settings */
  performanceMode?: 'high' | 'balanced' | 'battery';
  /** Callback for performance metrics */
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
  /** Custom style overrides */
  styleOverrides?: Partial<OverlayStyle>;
  /** Show debug information */
  showDebugInfo?: boolean;
  className?: string;
}

// Default skeletal connections based on COCO 17-point model
const SKELETAL_CONNECTIONS: SkeletalConnection[] = [
  // Head connections (highest priority for visibility)
  { from: KeypointName.NOSE, to: KeypointName.LEFT_EYE, color: '#ff6b6b', width: 2, group: 'head', priority: 10 },
  { from: KeypointName.NOSE, to: KeypointName.RIGHT_EYE, color: '#ff6b6b', width: 2, group: 'head', priority: 10 },
  { from: KeypointName.LEFT_EYE, to: KeypointName.LEFT_EAR, color: '#ff6b6b', width: 2, group: 'head', priority: 9 },
  { from: KeypointName.RIGHT_EYE, to: KeypointName.RIGHT_EAR, color: '#ff6b6b', width: 2, group: 'head', priority: 9 },
  
  // Torso connections (core structure)
  { from: KeypointName.LEFT_SHOULDER, to: KeypointName.RIGHT_SHOULDER, color: '#4ecdc4', width: 4, group: 'torso', priority: 8 },
  { from: KeypointName.LEFT_SHOULDER, to: KeypointName.LEFT_HIP, color: '#4ecdc4', width: 3, group: 'torso', priority: 7 },
  { from: KeypointName.RIGHT_SHOULDER, to: KeypointName.RIGHT_HIP, color: '#4ecdc4', width: 3, group: 'torso', priority: 7 },
  { from: KeypointName.LEFT_HIP, to: KeypointName.RIGHT_HIP, color: '#4ecdc4', width: 4, group: 'torso', priority: 8 },
  
  // Left arm connections
  { from: KeypointName.LEFT_SHOULDER, to: KeypointName.LEFT_ELBOW, color: '#45b7d1', width: 3, group: 'leftArm', priority: 6 },
  { from: KeypointName.LEFT_ELBOW, to: KeypointName.LEFT_WRIST, color: '#45b7d1', width: 3, group: 'leftArm', priority: 6 },
  
  // Right arm connections
  { from: KeypointName.RIGHT_SHOULDER, to: KeypointName.RIGHT_ELBOW, color: '#96ceb4', width: 3, group: 'rightArm', priority: 6 },
  { from: KeypointName.RIGHT_ELBOW, to: KeypointName.RIGHT_WRIST, color: '#96ceb4', width: 3, group: 'rightArm', priority: 6 },
  
  // Left leg connections (critical for gait analysis)
  { from: KeypointName.LEFT_HIP, to: KeypointName.LEFT_KNEE, color: '#ffeaa7', width: 4, group: 'leftLeg', priority: 5 },
  { from: KeypointName.LEFT_KNEE, to: KeypointName.LEFT_ANKLE, color: '#ffeaa7', width: 4, group: 'leftLeg', priority: 5 },
  
  // Right leg connections (critical for gait analysis)
  { from: KeypointName.RIGHT_HIP, to: KeypointName.RIGHT_KNEE, color: '#fdcb6e', width: 4, group: 'rightLeg', priority: 5 },
  { from: KeypointName.RIGHT_KNEE, to: KeypointName.RIGHT_ANKLE, color: '#fdcb6e', width: 4, group: 'rightLeg', priority: 5 },
];

// Default visual style
const DEFAULT_STYLE: OverlayStyle = {
  keypoint: {
    radius: 5,
    strokeWidth: 2,
    glowRadius: 8,
  },
  connection: {
    width: 3,
    shadowBlur: 4,
  },
  confidence: {
    barWidth: 30,
    barHeight: 4,
    offset: 20,
  },
  animation: {
    duration: 100,
    easing: 'ease-out',
  },
};

export const PoseOverlay: React.FC<PoseOverlayProps> = ({
  canvasRef,
  videoRef,
  poses,
  settings,
  isActive,
  performanceMode = 'balanced',
  onPerformanceUpdate,
  styleOverrides,
  showDebugInfo = false,
  className
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    frameRate: 0,
    averageRenderTime: 0,
    memoryUsage: 0,
    droppedFrames: 0,
    processingLatency: 0
  });

  const animationFrameRef = useRef<number>();
  const lastFrameTime = useRef<number>(0);
  const frameCount = useRef<number>(0);
  const renderTimes = useRef<number[]>([]);
  const smoothingBuffer = useRef<Map<string, Point2D[]>>(new Map());

  // Merge default style with overrides
  const style: OverlayStyle = {
    ...DEFAULT_STYLE,
    ...styleOverrides,
    keypoint: { ...DEFAULT_STYLE.keypoint, ...styleOverrides?.keypoint },
    connection: { ...DEFAULT_STYLE.connection, ...styleOverrides?.connection },
    confidence: { ...DEFAULT_STYLE.confidence, ...styleOverrides?.confidence },
    animation: { ...DEFAULT_STYLE.animation, ...styleOverrides?.animation }
  };

  /**
   * Apply temporal smoothing to keypoint positions
   */
  const applySmoothingToKeypoint = useCallback((keypoint: EnhancedKeypoint): Point2D => {
    const key = `${keypoint.name}_${keypoint.trackingId || 'default'}`;
    const bufferSize = performanceMode === 'high' ? 5 : performanceMode === 'balanced' ? 3 : 1;
    
    if (!smoothingBuffer.current.has(key)) {
      smoothingBuffer.current.set(key, []);
    }
    
    const buffer = smoothingBuffer.current.get(key)!;
    buffer.push({ x: keypoint.x, y: keypoint.y });
    
    // Keep buffer at specified size
    if (buffer.length > bufferSize) {
      buffer.shift();
    }
    
    // Calculate weighted average (more weight to recent positions)
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;
    
    buffer.forEach((point, index) => {
      const weight = Math.pow(1.5, index); // Exponential weighting
      totalWeight += weight;
      weightedX += point.x * weight;
      weightedY += point.y * weight;
    });
    
    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight
    };
  }, [performanceMode]);

  /**
   * Get adaptive keypoint radius based on confidence and importance
   */
  const getKeypointRadius = useCallback((keypoint: EnhancedKeypoint): number => {
    const baseRadius = style.keypoint.radius;
    const confidenceMultiplier = 0.5 + (keypoint.score * 0.5); // 0.5 to 1.0
    
    // Important joints get larger radius
    const importantJoints = [
      KeypointName.LEFT_HIP, KeypointName.RIGHT_HIP,
      KeypointName.LEFT_KNEE, KeypointName.RIGHT_KNEE,
      KeypointName.LEFT_ANKLE, KeypointName.RIGHT_ANKLE,
      KeypointName.LEFT_SHOULDER, KeypointName.RIGHT_SHOULDER
    ];
    
    const importanceMultiplier = importantJoints.includes(keypoint.name as KeypointName) ? 1.2 : 1.0;
    
    return baseRadius * confidenceMultiplier * importanceMultiplier;
  }, [style.keypoint.radius]);

  /**
   * Get keypoint color based on confidence and visualization settings
   */
  const getKeypointColor = useCallback((keypoint: EnhancedKeypoint): string => {
    switch (settings.colorScheme) {
      case 'confidence':
        if (keypoint.score > 0.8) return '#00ff88'; // High confidence - green
        if (keypoint.score > 0.6) return '#ffff00'; // Medium confidence - yellow
        if (keypoint.score > 0.4) return '#ff8800'; // Low confidence - orange
        return '#ff4444'; // Very low confidence - red
        
      case 'phase':
        // Color by body part
        if (keypoint.name.includes('eye') || keypoint.name.includes('ear') || keypoint.name.includes('nose')) {
          return '#ff6b6b'; // Head - red
        }
        if (keypoint.name.includes('shoulder') || keypoint.name.includes('hip')) {
          return '#4ecdc4'; // Torso - cyan
        }
        if (keypoint.name.includes('elbow') || keypoint.name.includes('wrist')) {
          return keypoint.name.includes('left') ? '#45b7d1' : '#96ceb4'; // Arms - blue/green
        }
        if (keypoint.name.includes('knee') || keypoint.name.includes('ankle')) {
          return keypoint.name.includes('left') ? '#ffeaa7' : '#fdcb6e'; // Legs - yellow/orange
        }
        return '#ffffff'; // Default white
        
      default:
        return keypoint.name.includes('left') ? '#45b7d1' : '#96ceb4'; // Default left/right differentiation
    }
  }, [settings.colorScheme]);

  /**
   * Draw enhanced keypoint with glow effect and confidence indicator
   */
  const drawKeypoint = useCallback((
    ctx: CanvasRenderingContext2D,
    keypoint: EnhancedKeypoint,
    smoothedPosition: Point2D
  ) => {
    const radius = getKeypointRadius(keypoint);
    const color = getKeypointColor(keypoint);
    const alpha = keypoint.score * settings.skeletonOpacity;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Draw glow effect for better visibility
    if (style.keypoint.glowRadius > 0) {
      const gradient = ctx.createRadialGradient(
        smoothedPosition.x, smoothedPosition.y, 0,
        smoothedPosition.x, smoothedPosition.y, style.keypoint.glowRadius
      );
      gradient.addColorStop(0, color + '40'); // 25% opacity
      gradient.addColorStop(1, color + '00'); // 0% opacity
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(smoothedPosition.x, smoothedPosition.y, style.keypoint.glowRadius, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw main keypoint
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = style.keypoint.strokeWidth;
    
    ctx.beginPath();
    ctx.arc(smoothedPosition.x, smoothedPosition.y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Draw confidence indicator if enabled
    if (settings.showConfidence) {
      drawConfidenceIndicator(ctx, smoothedPosition, keypoint.score);
    }
    
    ctx.restore();
  }, [getKeypointRadius, getKeypointColor, settings, style]);

  /**
   * Draw confidence indicator bar above keypoint
   */
  const drawConfidenceIndicator = useCallback((
    ctx: CanvasRenderingContext2D,
    position: Point2D,
    confidence: number
  ) => {
    const barX = position.x - style.confidence.barWidth / 2;
    const barY = position.y - style.confidence.offset;
    
    // Background bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(barX, barY, style.confidence.barWidth, style.confidence.barHeight);
    
    // Confidence bar with color coding
    const confidenceColor = 
      confidence > 0.8 ? '#00ff88' :
      confidence > 0.6 ? '#ffff00' :
      confidence > 0.4 ? '#ff8800' : '#ff4444';
    
    ctx.fillStyle = confidenceColor;
    ctx.fillRect(barX, barY, style.confidence.barWidth * confidence, style.confidence.barHeight);
    
    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, style.confidence.barWidth, style.confidence.barHeight);
  }, [style.confidence]);

  /**
   * Draw skeletal connection between two keypoints
   */
  const drawConnection = useCallback((
    ctx: CanvasRenderingContext2D,
    fromPoint: Point2D,
    toPoint: Point2D,
    connection: SkeletalConnection,
    avgConfidence: number
  ) => {
    const alpha = avgConfidence * settings.skeletonOpacity;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Apply shadow for depth
    if (style.connection.shadowBlur > 0) {
      ctx.shadowColor = connection.color;
      ctx.shadowBlur = style.connection.shadowBlur;
    }
    
    ctx.strokeStyle = connection.color;
    ctx.lineWidth = connection.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Apply dash pattern if specified
    if (style.connection.dashPattern) {
      ctx.setLineDash(style.connection.dashPattern);
    }
    
    ctx.beginPath();
    ctx.moveTo(fromPoint.x, fromPoint.y);
    ctx.lineTo(toPoint.x, toPoint.y);
    ctx.stroke();
    
    ctx.restore();
  }, [settings.skeletonOpacity, style.connection]);

  /**
   * Main render function
   */
  const renderPoses = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive || !isVisible) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const startTime = performance.now();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update canvas size to match video if needed
    if (videoRef?.current) {
      const video = videoRef.current;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    }
    
    // Process each pose
    poses.forEach((pose, poseIndex) => {
      if (pose.confidence < 0.3) return; // Skip low-confidence poses
      
      // Filter and smooth keypoints
      const validKeypoints = pose.keypoints.filter(kp => kp.score > 0.3);
      const smoothedKeypoints = new Map<string, Point2D>();
      
      validKeypoints.forEach(kp => {
        const smoothed = applySmoothingToKeypoint(kp);
        smoothedKeypoints.set(kp.name, smoothed);
      });
      
      // Draw connections first (behind keypoints)
      const sortedConnections = SKELETAL_CONNECTIONS.sort((a, b) => a.priority - b.priority);
      
      sortedConnections.forEach(connection => {
        const fromKeypoint = validKeypoints.find(kp => kp.name === connection.from);
        const toKeypoint = validKeypoints.find(kp => kp.name === connection.to);
        
        if (fromKeypoint && toKeypoint && 
            fromKeypoint.score > 0.3 && toKeypoint.score > 0.3) {
          
          const fromPos = smoothedKeypoints.get(fromKeypoint.name);
          const toPos = smoothedKeypoints.get(toKeypoint.name);
          
          if (fromPos && toPos) {
            const avgConfidence = (fromKeypoint.score + toKeypoint.score) / 2;
            drawConnection(ctx, fromPos, toPos, connection, avgConfidence);
          }
        }
      });
      
      // Draw keypoints on top
      validKeypoints.forEach(keypoint => {
        const smoothedPos = smoothedKeypoints.get(keypoint.name);
        if (smoothedPos) {
          drawKeypoint(ctx, keypoint, smoothedPos);
        }
      });
    });
    
    // Update performance metrics
    const renderTime = performance.now() - startTime;
    renderTimes.current.push(renderTime);
    if (renderTimes.current.length > 60) {
      renderTimes.current.shift();
    }
    
    const averageRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
    
    // Calculate FPS
    const now = performance.now();
    let fps = 0;
    if (lastFrameTime.current > 0) {
      fps = 1000 / (now - lastFrameTime.current);
    }
    lastFrameTime.current = now;
    frameCount.current++;
    
    const metrics: PerformanceMetrics = {
      frameRate: fps,
      averageRenderTime,
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0,
      droppedFrames: fps < 20 ? 1 : 0,
      processingLatency: renderTime
    };
    
    setPerformanceMetrics(metrics);
    onPerformanceUpdate?.(metrics);
    
  }, [
    canvasRef, videoRef, poses, isActive, isVisible, settings,
    applySmoothingToKeypoint, drawConnection, drawKeypoint, onPerformanceUpdate
  ]);

  // Animation loop
  useEffect(() => {
    if (!isActive) return;
    
    const animate = () => {
      renderPoses();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, renderPoses]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className || ''}`}>
      {/* Overlay Controls */}
      <AnimatePresence>
        {showDebugInfo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-sm space-y-1 z-10"
          >
            <div className="flex items-center space-x-2">
              <Gauge className="w-4 h-4" />
              <span>FPS: {performanceMetrics.frameRate.toFixed(1)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Timer className="w-4 h-4" />
              <span>Render: {performanceMetrics.averageRenderTime.toFixed(1)}ms</span>
            </div>
            <div>Memory: {performanceMetrics.memoryUsage.toFixed(1)}MB</div>
            <div>Poses: {poses.length}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay Toggle Controls */}
      <div className="absolute bottom-4 right-4 flex space-x-2 z-10">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className={`p-2 rounded-lg transition-all duration-200 ${
            isVisible 
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : 'bg-gray-500 hover:bg-gray-600 text-white'
          }`}
          title={isVisible ? 'Hide Overlay' : 'Show Overlay'}
        >
          {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white transition-all duration-200"
          title="Overlay Settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg z-20 w-64"
          >
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Overlay Settings
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Color Scheme
                </label>
                <select 
                  value={settings.colorScheme}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="default">Default</option>
                  <option value="confidence">Confidence</option>
                  <option value="phase">Body Parts</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Show Confidence: {settings.showConfidence ? 'On' : 'Off'}
                </label>
                <input
                  type="checkbox"
                  checked={settings.showConfidence}
                  className="w-4 h-4"
                />
              </div>
            </div>
            
            <button
              onClick={() => setShowSettings(false)}
              className="mt-4 w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PoseOverlay;