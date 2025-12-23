/**
 * Skeletal overlay rendering utilities for pose visualization
 */

import { Point2D } from '../types/gait';
import { EnhancedKeypoint, KeypointName } from '../types/pose';
import { 
  Skeleton, 
  SkeletalConnection, 
  ANATOMICAL_CONNECTIONS, 
  GAIT_CONNECTIONS,
  CONNECTION_STYLES,
  KEYPOINT_STYLES,
  ConnectionStyle,
  KeypointStyle,
  KeypointTrajectory,
  TrajectoryPoint
} from '../types/skeleton';

/**
 * Rendering options for skeleton visualization
 */
export interface SkeletonRenderOptions {
  /** Canvas context to draw on */
  ctx: CanvasRenderingContext2D;
  /** Skeleton data to render */
  skeleton: Skeleton;
  /** Whether to show keypoints */
  showKeypoints: boolean;
  /** Whether to show connections */
  showConnections: boolean;
  /** Whether to show confidence scores */
  showConfidence: boolean;
  /** Whether to show keypoint names */
  showLabels: boolean;
  /** Connection style */
  connectionStyle: ConnectionStyle;
  /** Keypoint style */
  keypointStyle: KeypointStyle;
  /** Scale factor for rendering */
  scale: number;
  /** Offset for positioning */
  offset: Point2D;
  /** Minimum confidence threshold for rendering */
  minConfidence: number;
  /** Use gait-specific connections instead of anatomical */
  useGaitConnections: boolean;
}

/**
 * Default rendering options
 */
export const DEFAULT_RENDER_OPTIONS: Partial<SkeletonRenderOptions> = {
  showKeypoints: true,
  showConnections: true,
  showConfidence: false,
  showLabels: false,
  connectionStyle: CONNECTION_STYLES.default,
  keypointStyle: KEYPOINT_STYLES.default,
  scale: 1.0,
  offset: { x: 0, y: 0 },
  minConfidence: 0.3,
  useGaitConnections: false
};

/**
 * Skeleton renderer class
 */
export class SkeletonRenderer {
  private ctx: CanvasRenderingContext2D;
  private options: SkeletonRenderOptions;

  constructor(ctx: CanvasRenderingContext2D, options: Partial<SkeletonRenderOptions> = {}) {
    this.ctx = ctx;
    this.options = { ...DEFAULT_RENDER_OPTIONS, ...options } as SkeletonRenderOptions;
  }

  /**
   * Render a complete skeleton
   */
  renderSkeleton(skeleton: Skeleton, options?: Partial<SkeletonRenderOptions>): void {
    const renderOptions = { ...this.options, ...options };
    
    if (renderOptions.showConnections) {
      this.renderConnections(skeleton, renderOptions);
    }
    
    if (renderOptions.showKeypoints) {
      this.renderKeypoints(skeleton, renderOptions);
    }
    
    if (renderOptions.showConfidence) {
      this.renderConfidenceScores(skeleton, renderOptions);
    }
    
    if (renderOptions.showLabels) {
      this.renderKeypointLabels(skeleton, renderOptions);
    }
  }

  /**
   * Render skeletal connections
   */
  renderConnections(skeleton: Skeleton, options: SkeletonRenderOptions): void {
    const connections = options.useGaitConnections ? GAIT_CONNECTIONS : ANATOMICAL_CONNECTIONS;
    
    this.ctx.save();
    
    connections.forEach(([fromName, toName]) => {
      const fromKeypoint = skeleton.keypoints.find(kp => kp.name === fromName);
      const toKeypoint = skeleton.keypoints.find(kp => kp.name === toName);
      
      if (fromKeypoint && toKeypoint && 
          fromKeypoint.score >= options.minConfidence && 
          toKeypoint.score >= options.minConfidence) {
        
        this.renderConnection(fromKeypoint, toKeypoint, options);
      }
    });
    
    this.ctx.restore();
  }

  /**
   * Render a single connection between two keypoints
   */
  renderConnection(
    from: EnhancedKeypoint, 
    to: EnhancedKeypoint, 
    options: SkeletonRenderOptions
  ): void {
    const style = options.connectionStyle;
    const fromPos = this.transformPoint({ x: from.x, y: from.y }, options);
    const toPos = this.transformPoint({ x: to.x, y: to.y }, options);
    
    // Set line style
    this.ctx.strokeStyle = style.color;
    this.ctx.lineWidth = style.width;
    this.ctx.globalAlpha = style.opacity;
    
    // Set line dash pattern
    if (style.style === 'dashed') {
      this.ctx.setLineDash([5, 5]);
    } else if (style.style === 'dotted') {
      this.ctx.setLineDash([2, 3]);
    } else {
      this.ctx.setLineDash([]);
    }
    
    // Draw connection
    this.ctx.beginPath();
    this.ctx.moveTo(fromPos.x, fromPos.y);
    this.ctx.lineTo(toPos.x, toPos.y);
    this.ctx.stroke();
    
    // Draw gradient if specified
    if (style.gradient) {
      this.renderGradientConnection(fromPos, toPos, style);
    }
  }

  /**
   * Render gradient connection
   */
  private renderGradientConnection(
    from: Point2D, 
    to: Point2D, 
    style: ConnectionStyle
  ): void {
    if (!style.gradient) return;
    
    const gradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    gradient.addColorStop(0, style.gradient.start);
    gradient.addColorStop(1, style.gradient.end);
    
    this.ctx.strokeStyle = gradient;
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }

  /**
   * Render keypoints
   */
  renderKeypoints(skeleton: Skeleton, options: SkeletonRenderOptions): void {
    this.ctx.save();
    
    skeleton.keypoints.forEach(keypoint => {
      if (keypoint.score >= options.minConfidence) {
        this.renderKeypoint(keypoint, options);
      }
    });
    
    this.ctx.restore();
  }

  /**
   * Render a single keypoint
   */
  renderKeypoint(keypoint: EnhancedKeypoint, options: SkeletonRenderOptions): void {
    const style = this.getKeypointStyle(keypoint, options);
    const pos = this.transformPoint({ x: keypoint.x, y: keypoint.y }, options);
    
    // Draw keypoint based on shape
    this.ctx.save();
    this.ctx.globalAlpha = style.fillOpacity;
    
    switch (style.shape) {
      case 'circle':
        this.renderCircleKeypoint(pos, style);
        break;
      case 'square':
        this.renderSquareKeypoint(pos, style);
        break;
      case 'diamond':
        this.renderDiamondKeypoint(pos, style);
        break;
      case 'cross':
        this.renderCrossKeypoint(pos, style);
        break;
    }
    
    this.ctx.restore();
  }

  /**
   * Get keypoint style based on confidence and type
   */
  private getKeypointStyle(keypoint: EnhancedKeypoint, options: SkeletonRenderOptions): KeypointStyle {
    const baseStyle = options.keypointStyle;
    
    // Adjust style based on confidence
    if (keypoint.score < 0.5) {
      return KEYPOINT_STYLES.lowConfidence;
    } else if (keypoint.score > 0.8) {
      return KEYPOINT_STYLES.highConfidence;
    }
    
    return baseStyle;
  }

  /**
   * Render circle keypoint
   */
  private renderCircleKeypoint(pos: Point2D, style: KeypointStyle): void {
    // Fill circle
    this.ctx.fillStyle = style.color;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, style.radius, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Border
    if (style.borderColor && style.borderWidth) {
      this.ctx.strokeStyle = style.borderColor;
      this.ctx.lineWidth = style.borderWidth;
      this.ctx.globalAlpha = style.borderOpacity || 1.0;
      this.ctx.stroke();
    }
  }

  /**
   * Render square keypoint
   */
  private renderSquareKeypoint(pos: Point2D, style: KeypointStyle): void {
    const size = style.radius * 2;
    
    // Fill square
    this.ctx.fillStyle = style.color;
    this.ctx.fillRect(pos.x - style.radius, pos.y - style.radius, size, size);
    
    // Border
    if (style.borderColor && style.borderWidth) {
      this.ctx.strokeStyle = style.borderColor;
      this.ctx.lineWidth = style.borderWidth;
      this.ctx.globalAlpha = style.borderOpacity || 1.0;
      this.ctx.strokeRect(pos.x - style.radius, pos.y - style.radius, size, size);
    }
  }

  /**
   * Render diamond keypoint
   */
  private renderDiamondKeypoint(pos: Point2D, style: KeypointStyle): void {
    this.ctx.fillStyle = style.color;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y - style.radius);
    this.ctx.lineTo(pos.x + style.radius, pos.y);
    this.ctx.lineTo(pos.x, pos.y + style.radius);
    this.ctx.lineTo(pos.x - style.radius, pos.y);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Border
    if (style.borderColor && style.borderWidth) {
      this.ctx.strokeStyle = style.borderColor;
      this.ctx.lineWidth = style.borderWidth;
      this.ctx.globalAlpha = style.borderOpacity || 1.0;
      this.ctx.stroke();
    }
  }

  /**
   * Render cross keypoint
   */
  private renderCrossKeypoint(pos: Point2D, style: KeypointStyle): void {
    this.ctx.strokeStyle = style.color;
    this.ctx.lineWidth = style.borderWidth || 2;
    
    // Vertical line
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y - style.radius);
    this.ctx.lineTo(pos.x, pos.y + style.radius);
    this.ctx.stroke();
    
    // Horizontal line
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x - style.radius, pos.y);
    this.ctx.lineTo(pos.x + style.radius, pos.y);
    this.ctx.stroke();
  }

  /**
   * Render confidence scores
   */
  renderConfidenceScores(skeleton: Skeleton, options: SkeletonRenderOptions): void {
    this.ctx.save();
    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    
    skeleton.keypoints.forEach(keypoint => {
      if (keypoint.score >= options.minConfidence) {
        const pos = this.transformPoint({ x: keypoint.x, y: keypoint.y }, options);
        const text = (keypoint.score * 100).toFixed(0) + '%';
        
        // Draw text with outline
        this.ctx.strokeText(text, pos.x + 10, pos.y - 5);
        this.ctx.fillText(text, pos.x + 10, pos.y - 5);
      }
    });
    
    this.ctx.restore();
  }

  /**
   * Render keypoint labels
   */
  renderKeypointLabels(skeleton: Skeleton, options: SkeletonRenderOptions): void {
    this.ctx.save();
    this.ctx.font = '10px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    
    skeleton.keypoints.forEach(keypoint => {
      if (keypoint.score >= options.minConfidence) {
        const pos = this.transformPoint({ x: keypoint.x, y: keypoint.y }, options);
        const text = keypoint.name.replace('_', ' ');
        
        // Draw text with outline
        this.ctx.strokeText(text, pos.x + 5, pos.y + 15);
        this.ctx.fillText(text, pos.x + 5, pos.y + 15);
      }
    });
    
    this.ctx.restore();
  }

  /**
   * Transform point based on scale and offset
   */
  private transformPoint(point: Point2D, options: SkeletonRenderOptions): Point2D {
    return {
      x: point.x * options.scale + options.offset.x,
      y: point.y * options.scale + options.offset.y
    };
  }

  /**
   * Update rendering options
   */
  updateOptions(options: Partial<SkeletonRenderOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

/**
 * Trajectory renderer class
 */
export class TrajectoryRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Render keypoint trajectory
   */
  renderTrajectory(
    trajectory: KeypointTrajectory,
    options: {
      color?: string;
      lineWidth?: number;
      opacity?: number;
      showVelocity?: boolean;
      showPoints?: boolean;
      scale?: number;
      offset?: Point2D;
    } = {}
  ): void {
    const {
      color = '#0066ff',
      lineWidth = 2,
      opacity = 0.7,
      showVelocity = false,
      showPoints = true,
      scale = 1.0,
      offset = { x: 0, y: 0 }
    } = options;

    if (trajectory.points.length < 2) return;

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;

    // Draw trajectory line
    this.ctx.beginPath();
    trajectory.points.forEach((point, index) => {
      const pos = {
        x: point.position.x * scale + offset.x,
        y: point.position.y * scale + offset.y
      };

      if (index === 0) {
        this.ctx.moveTo(pos.x, pos.y);
      } else {
        this.ctx.lineTo(pos.x, pos.y);
      }
    });
    this.ctx.stroke();

    // Draw trajectory points
    if (showPoints) {
      this.ctx.fillStyle = color;
      trajectory.points.forEach(point => {
        const pos = {
          x: point.position.x * scale + offset.x,
          y: point.position.y * scale + offset.y
        };
        const radius = Math.max(1, lineWidth / 2);

        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
      });
    }

    // Draw velocity vectors
    if (showVelocity) {
      this.renderVelocityVectors(trajectory, { color, scale, offset });
    }

    this.ctx.restore();
  }

  /**
   * Render velocity vectors for trajectory
   */
  private renderVelocityVectors(
    trajectory: KeypointTrajectory,
    options: {
      color: string;
      scale: number;
      offset: Point2D;
    }
  ): void {
    this.ctx.strokeStyle = options.color;
    this.ctx.lineWidth = 1;

    trajectory.points.forEach(point => {
      if (point.velocity) {
        const pos = {
          x: point.position.x * options.scale + options.offset.x,
          y: point.position.y * options.scale + options.offset.y
        };

        const velEnd = {
          x: pos.x + point.velocity.x * 10, // Scale velocity for visibility
          y: pos.y + point.velocity.y * 10
        };

        // Draw velocity vector
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.lineTo(velEnd.x, velEnd.y);
        this.ctx.stroke();

        // Draw arrowhead
        this.drawArrowhead(pos, velEnd, 5);
      }
    });
  }

  /**
   * Draw arrowhead for velocity vector
   */
  private drawArrowhead(start: Point2D, end: Point2D, size: number): void {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    
    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - size * Math.cos(angle - Math.PI / 6),
      end.y - size * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - size * Math.cos(angle + Math.PI / 6),
      end.y - size * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  /**
   * Render multiple trajectories
   */
  renderMultipleTrajectories(
    trajectories: KeypointTrajectory[],
    options: {
      colors?: string[];
      lineWidth?: number;
      opacity?: number;
      scale?: number;
      offset?: Point2D;
    } = {}
  ): void {
    const defaultColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const colors = options.colors || defaultColors;

    trajectories.forEach((trajectory, index) => {
      this.renderTrajectory(trajectory, {
        ...options,
        color: colors[index % colors.length]
      });
    });
  }
}

/**
 * Utility functions for rendering
 */

/**
 * Create gradient for connection based on confidence
 */
export function createConfidenceGradient(
  ctx: CanvasRenderingContext2D,
  from: Point2D,
  to: Point2D,
  fromConfidence: number,
  toConfidence: number
): CanvasGradient {
  const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  
  const fromColor = confidenceToColor(fromConfidence);
  const toColor = confidenceToColor(toConfidence);
  
  gradient.addColorStop(0, fromColor);
  gradient.addColorStop(1, toColor);
  
  return gradient;
}

/**
 * Convert confidence score to color
 */
export function confidenceToColor(confidence: number): string {
  // Red (low) to yellow (medium) to green (high)
  if (confidence < 0.5) {
    const ratio = confidence * 2;
    return `rgb(255, ${Math.floor(255 * ratio)}, 0)`;
  } else {
    const ratio = (confidence - 0.5) * 2;
    return `rgb(${Math.floor(255 * (1 - ratio))}, 255, 0)`;
  }
}

/**
 * Draw bounding box around skeleton
 */
export function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  skeleton: Skeleton,
  options: {
    color?: string;
    lineWidth?: number;
    opacity?: number;
    showLabel?: boolean;
    scale?: number;
    offset?: Point2D;
  } = {}
): void {
  const {
    color = '#ffffff',
    lineWidth = 2,
    opacity = 0.8,
    showLabel = true,
    scale = 1.0,
    offset = { x: 0, y: 0 }
  } = options;

  const bbox = skeleton.boundingBox;
  const x = bbox.x * scale + offset.x;
  const y = bbox.y * scale + offset.y;
  const width = bbox.width * scale;
  const height = bbox.height * scale;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([5, 5]);

  // Draw bounding box
  ctx.strokeRect(x, y, width, height);

  // Draw label
  if (showLabel) {
    ctx.fillStyle = color;
    ctx.font = '12px Arial';
    ctx.fillText(`ID: ${skeleton.id}`, x, y - 5);
    ctx.fillText(`Conf: ${(skeleton.confidence * 100).toFixed(0)}%`, x, y - 20);
  }

  ctx.restore();
}

/**
 * Render skeleton quality indicators
 */
export function renderQualityIndicators(
  ctx: CanvasRenderingContext2D,
  skeleton: Skeleton,
  quality: {
    overall: number;
    keypointVisibility: number;
    connectionIntegrity: number;
    temporalConsistency: number;
  },
  position: Point2D
): void {
  ctx.save();
  
  const barWidth = 100;
  const barHeight = 15;
  const spacing = 20;
  
  const indicators = [
    { label: 'Overall', value: quality.overall, color: '#00ff00' },
    { label: 'Visibility', value: quality.keypointVisibility, color: '#ffff00' },
    { label: 'Integrity', value: quality.connectionIntegrity, color: '#ff6600' },
    { label: 'Consistency', value: quality.temporalConsistency, color: '#0066ff' }
  ];
  
  indicators.forEach((indicator, index) => {
    const y = position.y + index * spacing;
    
    // Background bar
    ctx.fillStyle = '#333333';
    ctx.fillRect(position.x, y, barWidth, barHeight);
    
    // Value bar
    ctx.fillStyle = indicator.color;
    ctx.fillRect(position.x, y, barWidth * indicator.value, barHeight);
    
    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial';
    ctx.fillText(`${indicator.label}: ${(indicator.value * 100).toFixed(0)}%`, 
                 position.x + barWidth + 5, y + barHeight - 2);
  });
  
  ctx.restore();
}