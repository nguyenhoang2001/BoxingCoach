/**
 * Coordinate transformation utilities for pose detection and motion tracking
 */

import { Point2D, Point3D } from '../types/gait';
import { EnhancedKeypoint } from '../types/pose';
import { Skeleton } from '../types/skeleton';

/**
 * Camera calibration parameters
 */
export interface CameraCalibration {
  /** Focal length in pixels */
  focalLength: { x: number; y: number };
  /** Principal point (optical center) */
  principalPoint: { x: number; y: number };
  /** Radial distortion coefficients */
  distortionCoefficients: number[];
  /** Image resolution */
  imageSize: { width: number; height: number };
  /** Camera position in world coordinates */
  position: Point3D;
  /** Camera rotation (Euler angles in radians) */
  rotation: { x: number; y: number; z: number };
  /** Scale factor (pixels per meter) */
  scale: number;
}

/**
 * Transformation matrix (4x4 homogeneous)
 */
export type TransformMatrix = number[][];

/**
 * Viewport configuration
 */
export interface Viewport {
  /** Viewport offset */
  x: number;
  y: number;
  /** Viewport dimensions */
  width: number;
  height: number;
  /** Zoom factor */
  zoom: number;
  /** Rotation angle in radians */
  rotation: number;
}

/**
 * Coordinate system types
 */
export enum CoordinateSystem {
  /** Screen/pixel coordinates (origin top-left) */
  SCREEN = 'screen',
  /** Normalized device coordinates (-1 to 1) */
  NDC = 'ndc',
  /** World coordinates (real-world measurements) */
  WORLD = 'world',
  /** Camera coordinates */
  CAMERA = 'camera',
  /** Image coordinates (origin bottom-left) */
  IMAGE = 'image'
}

/**
 * Create identity transformation matrix
 */
export function createIdentityMatrix(): TransformMatrix {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
}

/**
 * Create translation matrix
 */
export function createTranslationMatrix(dx: number, dy: number, dz: number = 0): TransformMatrix {
  return [
    [1, 0, 0, dx],
    [0, 1, 0, dy],
    [0, 0, 1, dz],
    [0, 0, 0, 1]
  ];
}

/**
 * Create scaling matrix
 */
export function createScaleMatrix(sx: number, sy: number, sz: number = 1): TransformMatrix {
  return [
    [sx, 0, 0, 0],
    [0, sy, 0, 0],
    [0, 0, sz, 0],
    [0, 0, 0, 1]
  ];
}

/**
 * Create rotation matrix around Z-axis
 */
export function createRotationMatrix(angle: number): TransformMatrix {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  return [
    [cos, -sin, 0, 0],
    [sin, cos, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
}

/**
 * Multiply two transformation matrices
 */
export function multiplyMatrices(a: TransformMatrix, b: TransformMatrix): TransformMatrix {
  const result: TransformMatrix = Array(4).fill(null).map(() => Array(4).fill(0));
  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  
  return result;
}

/**
 * Apply transformation matrix to a 2D point
 */
export function transformPoint2D(point: Point2D, matrix: TransformMatrix): Point2D {
  const x = point.x * matrix[0][0] + point.y * matrix[0][1] + matrix[0][3];
  const y = point.x * matrix[1][0] + point.y * matrix[1][1] + matrix[1][3];
  
  return { x, y };
}

/**
 * Apply transformation matrix to a 3D point
 */
export function transformPoint3D(point: Point3D, matrix: TransformMatrix): Point3D {
  const x = point.x * matrix[0][0] + point.y * matrix[0][1] + point.z * matrix[0][2] + matrix[0][3];
  const y = point.x * matrix[1][0] + point.y * matrix[1][1] + point.z * matrix[1][2] + matrix[1][3];
  const z = point.x * matrix[2][0] + point.y * matrix[2][1] + point.z * matrix[2][2] + matrix[2][3];
  const w = point.x * matrix[3][0] + point.y * matrix[3][1] + point.z * matrix[3][2] + matrix[3][3];
  
  return { x: x / w, y: y / w, z: z / w };
}

/**
 * Convert screen coordinates to normalized device coordinates
 */
export function screenToNDC(point: Point2D, viewport: Viewport): Point2D {
  return {
    x: ((point.x - viewport.x) / viewport.width) * 2 - 1,
    y: ((point.y - viewport.y) / viewport.height) * 2 - 1
  };
}

/**
 * Convert normalized device coordinates to screen coordinates
 */
export function ndcToScreen(point: Point2D, viewport: Viewport): Point2D {
  return {
    x: ((point.x + 1) / 2) * viewport.width + viewport.x,
    y: ((point.y + 1) / 2) * viewport.height + viewport.y
  };
}

/**
 * Convert screen coordinates to world coordinates using calibration
 */
export function screenToWorld(
  point: Point2D,
  calibration: CameraCalibration,
  depth: number = 1
): Point3D {
  // Remove principal point offset
  const centered = {
    x: point.x - calibration.principalPoint.x,
    y: point.y - calibration.principalPoint.y
  };
  
  // Convert to normalized coordinates
  const normalized = {
    x: centered.x / calibration.focalLength.x,
    y: centered.y / calibration.focalLength.y
  };
  
  // Apply depth to get 3D coordinates
  const worldX = normalized.x * depth / calibration.scale;
  const worldY = normalized.y * depth / calibration.scale;
  const worldZ = depth / calibration.scale;
  
  return { x: worldX, y: worldY, z: worldZ };
}

/**
 * Convert world coordinates to screen coordinates using calibration
 */
export function worldToScreen(point: Point3D, calibration: CameraCalibration): Point2D {
  // Apply scale
  const scaled = {
    x: point.x * calibration.scale,
    y: point.y * calibration.scale,
    z: point.z * calibration.scale
  };
  
  // Project to 2D
  const projected = {
    x: (scaled.x / scaled.z) * calibration.focalLength.x,
    y: (scaled.y / scaled.z) * calibration.focalLength.y
  };
  
  // Add principal point offset
  return {
    x: projected.x + calibration.principalPoint.x,
    y: projected.y + calibration.principalPoint.y
  };
}

/**
 * Apply lens distortion correction
 */
export function correctDistortion(point: Point2D, calibration: CameraCalibration): Point2D {
  const [k1, k2, p1, p2, k3 = 0] = calibration.distortionCoefficients;
  
  // Normalize coordinates
  const x = (point.x - calibration.principalPoint.x) / calibration.focalLength.x;
  const y = (point.y - calibration.principalPoint.y) / calibration.focalLength.y;
  
  const r2 = x * x + y * y;
  const r4 = r2 * r2;
  const r6 = r4 * r2;
  
  // Radial distortion
  const radialDistortion = 1 + k1 * r2 + k2 * r4 + k3 * r6;
  
  // Tangential distortion
  const tangentialX = 2 * p1 * x * y + p2 * (r2 + 2 * x * x);
  const tangentialY = p1 * (r2 + 2 * y * y) + 2 * p2 * x * y;
  
  // Apply corrections
  const correctedX = x * radialDistortion + tangentialX;
  const correctedY = y * radialDistortion + tangentialY;
  
  // Convert back to pixel coordinates
  return {
    x: correctedX * calibration.focalLength.x + calibration.principalPoint.x,
    y: correctedY * calibration.focalLength.y + calibration.principalPoint.y
  };
}

/**
 * Remove lens distortion
 */
export function removeDistortion(point: Point2D, calibration: CameraCalibration): Point2D {
  // Iterative approach to reverse distortion
  let undistorted = { ...point };
  
  for (let i = 0; i < 5; i++) {
    const distorted = correctDistortion(undistorted, calibration);
    const errorX = distorted.x - point.x;
    const errorY = distorted.y - point.y;
    
    undistorted.x -= errorX;
    undistorted.y -= errorY;
  }
  
  return undistorted;
}

/**
 * Apply viewport transformation
 */
export function applyViewport(point: Point2D, viewport: Viewport): Point2D {
  // Create transformation matrix
  const translation = createTranslationMatrix(viewport.x, viewport.y);
  const scale = createScaleMatrix(viewport.zoom, viewport.zoom);
  const rotation = createRotationMatrix(viewport.rotation);
  
  // Combine transformations
  let transform = multiplyMatrices(translation, scale);
  transform = multiplyMatrices(transform, rotation);
  
  return transformPoint2D(point, transform);
}

/**
 * Transform keypoint coordinates
 */
export function transformKeypoint(
  keypoint: EnhancedKeypoint,
  fromSystem: CoordinateSystem,
  toSystem: CoordinateSystem,
  calibration?: CameraCalibration,
  viewport?: Viewport
): EnhancedKeypoint {
  let transformed = { x: keypoint.x, y: keypoint.y };
  
  // Handle coordinate system conversions
  switch (fromSystem + '_to_' + toSystem) {
    case 'screen_to_world':
      if (calibration) {
        const world3D = screenToWorld(transformed, calibration);
        transformed = { x: world3D.x, y: world3D.y };
      }
      break;
      
    case 'world_to_screen':
      if (calibration) {
        transformed = worldToScreen({ x: transformed.x, y: transformed.y, z: 1 }, calibration);
      }
      break;
      
    case 'screen_to_ndc':
      if (viewport) {
        transformed = screenToNDC(transformed, viewport);
      }
      break;
      
    case 'ndc_to_screen':
      if (viewport) {
        transformed = ndcToScreen(transformed, viewport);
      }
      break;
      
    case 'image_to_screen':
      // Flip Y-axis (image origin bottom-left, screen origin top-left)
      if (calibration) {
        transformed.y = calibration.imageSize.height - transformed.y;
      }
      break;
      
    case 'screen_to_image':
      // Flip Y-axis
      if (calibration) {
        transformed.y = calibration.imageSize.height - transformed.y;
      }
      break;
  }
  
  return {
    ...keypoint,
    x: transformed.x,
    y: transformed.y
  };
}

/**
 * Transform entire skeleton
 */
export function transformSkeleton(
  skeleton: Skeleton,
  fromSystem: CoordinateSystem,
  toSystem: CoordinateSystem,
  calibration?: CameraCalibration,
  viewport?: Viewport
): Skeleton {
  const transformedKeypoints = skeleton.keypoints.map(keypoint =>
    transformKeypoint(keypoint, fromSystem, toSystem, calibration, viewport)
  );
  
  // Transform bounding box
  const bbox = skeleton.boundingBox;
  const topLeft = transformKeypoint(
    { ...skeleton.keypoints[0], x: bbox.x, y: bbox.y },
    fromSystem,
    toSystem,
    calibration,
    viewport
  );
  const bottomRight = transformKeypoint(
    { ...skeleton.keypoints[0], x: bbox.x + bbox.width, y: bbox.y + bbox.height },
    fromSystem,
    toSystem,
    calibration,
    viewport
  );
  
  return {
    ...skeleton,
    keypoints: transformedKeypoints,
    boundingBox: {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    }
  };
}

/**
 * Calculate homography matrix between two sets of corresponding points
 */
export function calculateHomography(
  sourcePoints: Point2D[],
  targetPoints: Point2D[]
): TransformMatrix | null {
  if (sourcePoints.length !== targetPoints.length || sourcePoints.length < 4) {
    return null;
  }
  
  // This is a simplified implementation
  // In practice, you would use a robust method like RANSAC
  
  // For now, return a basic transformation based on first 4 points
  const src = sourcePoints.slice(0, 4);
  const dst = targetPoints.slice(0, 4);
  
  // Calculate translation and scale (simplified)
  const srcCenter = {
    x: src.reduce((sum, p) => sum + p.x, 0) / src.length,
    y: src.reduce((sum, p) => sum + p.y, 0) / src.length
  };
  
  const dstCenter = {
    x: dst.reduce((sum, p) => sum + p.x, 0) / dst.length,
    y: dst.reduce((sum, p) => sum + p.y, 0) / dst.length
  };
  
  // Calculate average scale
  const srcScale = Math.sqrt(
    src.reduce((sum, p) => sum + Math.pow(p.x - srcCenter.x, 2) + Math.pow(p.y - srcCenter.y, 2), 0) / src.length
  );
  
  const dstScale = Math.sqrt(
    dst.reduce((sum, p) => sum + Math.pow(p.x - dstCenter.x, 2) + Math.pow(p.y - dstCenter.y, 2), 0) / dst.length
  );
  
  const scale = srcScale > 0 ? dstScale / srcScale : 1;
  
  return [
    [scale, 0, 0, dstCenter.x - srcCenter.x * scale],
    [0, scale, 0, dstCenter.y - srcCenter.y * scale],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
}

/**
 * Apply perspective correction
 */
export function applyPerspectiveCorrection(
  point: Point2D,
  homography: TransformMatrix
): Point2D {
  const x = point.x * homography[0][0] + point.y * homography[0][1] + homography[0][3];
  const y = point.x * homography[1][0] + point.y * homography[1][1] + homography[1][3];
  const w = point.x * homography[2][0] + point.y * homography[2][1] + homography[2][3];
  
  return { x: x / w, y: y / w };
}

/**
 * Create calibration from reference points
 */
export function createCalibrationFromPoints(
  imagePoints: Point2D[],
  worldPoints: Point3D[],
  imageSize: { width: number; height: number }
): CameraCalibration {
  // Simplified calibration - in practice use proper camera calibration
  const scale = 100; // Default pixels per meter
  
  return {
    focalLength: { x: imageSize.width, y: imageSize.width }, // Assume square pixels
    principalPoint: { x: imageSize.width / 2, y: imageSize.height / 2 },
    distortionCoefficients: [0, 0, 0, 0], // No distortion
    imageSize,
    position: { x: 0, y: 0, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
    scale
  };
}

/**
 * Convert between different angle representations
 */
export const AngleUtils = {
  /**
   * Convert radians to degrees
   */
  radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
  },
  
  /**
   * Convert degrees to radians
   */
  degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  },
  
  /**
   * Normalize angle to [-π, π] range
   */
  normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  },
  
  /**
   * Calculate angle difference (shortest path)
   */
  angleDifference(angle1: number, angle2: number): number {
    const diff = angle2 - angle1;
    return this.normalizeAngle(diff);
  }
};

/**
 * Coordinate system converter class
 */
export class CoordinateConverter {
  private calibration?: CameraCalibration;
  private viewport?: Viewport;
  
  constructor(calibration?: CameraCalibration, viewport?: Viewport) {
    this.calibration = calibration;
    this.viewport = viewport;
  }
  
  /**
   * Update calibration
   */
  setCalibration(calibration: CameraCalibration): void {
    this.calibration = calibration;
  }
  
  /**
   * Update viewport
   */
  setViewport(viewport: Viewport): void {
    this.viewport = viewport;
  }
  
  /**
   * Convert point between coordinate systems
   */
  convert(
    point: Point2D,
    from: CoordinateSystem,
    to: CoordinateSystem
  ): Point2D {
    if (from === to) return { ...point };
    
    switch (from + '_to_' + to) {
      case 'screen_to_world':
        if (!this.calibration) throw new Error('Calibration required for screen to world conversion');
        const world3D = screenToWorld(point, this.calibration);
        return { x: world3D.x, y: world3D.y };
        
      case 'world_to_screen':
        if (!this.calibration) throw new Error('Calibration required for world to screen conversion');
        return worldToScreen({ x: point.x, y: point.y, z: 1 }, this.calibration);
        
      case 'screen_to_ndc':
        if (!this.viewport) throw new Error('Viewport required for screen to NDC conversion');
        return screenToNDC(point, this.viewport);
        
      case 'ndc_to_screen':
        if (!this.viewport) throw new Error('Viewport required for NDC to screen conversion');
        return ndcToScreen(point, this.viewport);
        
      default:
        console.warn(`Conversion from ${from} to ${to} not implemented`);
        return { ...point };
    }
  }
  
  /**
   * Batch convert points
   */
  convertBatch(
    points: Point2D[],
    from: CoordinateSystem,
    to: CoordinateSystem
  ): Point2D[] {
    return points.map(point => this.convert(point, from, to));
  }
}