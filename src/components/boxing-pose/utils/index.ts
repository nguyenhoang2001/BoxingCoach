import { Landmark, LandmarkMap } from "../interfaces";

export function dist(a: Landmark, b: Landmark) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z ?? 0) - (b.z ?? 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function angleBetween(a: Landmark, b: Landmark, c: Landmark) {
    // angle at point b between segments b->a and b->c (in degrees)
    const v1 = { x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) };
    const v2 = { x: c.x - b.x, y: c.y - b.y, z: (c.z ?? 0) - (b.z ?? 0) };
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const n1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
    const n2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
    if (n1 === 0 || n2 === 0) return 0;
    const cos = Math.min(1, Math.max(-1, dot / (n1 * n2)));
    return (Math.acos(cos) * 180) / Math.PI;
}

export function toMap(landmarks: Landmark[] | LandmarkMap) {
    if (Array.isArray(landmarks)) {
        const map: LandmarkMap = {};
        for (const lm of landmarks) {
            if (lm.name) map[lm.name] = lm;
        }
        return map;
    }
    return landmarks;
}

/**
 * Helper function to check if a value is within optimal range
 */
export function isInOptimalRange(
  value: number,
  config: { min: number; optimal: number; max: number }
): boolean {
  return value >= config.min && value <= config.max;
}

/**
 * Helper function to calculate score based on how close to optimal
 */
export function calculateRangeScore(
  value: number,
  config: { min: number; optimal: number; max: number },
  maxScore: number
): number {
  if (value < config.min || value > config.max) {
    // Value is outside acceptable range
    const distanceFromMin = Math.abs(value - config.min);
    const distanceFromMax = Math.abs(value - config.max);
    const minDistance = Math.min(distanceFromMin, distanceFromMax);
    // Give partial credit based on how far outside range
    return Math.max(0, maxScore * (1 - minDistance / 50));
  }
  
  // Value is within range - calculate score based on distance from optimal
  const distanceFromOptimal = Math.abs(value - config.optimal);
  const rangeSize = config.max - config.min;
  const normalizedDistance = distanceFromOptimal / (rangeSize / 2);
  
  return maxScore * (1 - normalizedDistance * 0.3); // Max 30% penalty for being away from optimal
}