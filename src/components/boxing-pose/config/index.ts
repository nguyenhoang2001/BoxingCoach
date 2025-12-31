import { JabConfig } from "../interfaces";

/**
 * Default values for a perfect jab technique
 * Based on professional boxing standards
 */
export const DEFAULT_JAB_CONFIG: JabConfig = {
  leadHand: true, // Left hand for orthodox stance
  
  // Lead elbow (punching arm) - should be fully extended at impact
  leadElbow: {
    min: 140,     // Minimum acceptable extension
    optimal: 180, // Nearly straight arm
    max: 180,     // Fully extended
  },
  
  // Guard elbow (rear hand) - should stay bent to protect face
  guardElbow: {
    min: 20,      // Too extended, guard is down
    optimal: 30,  // Perfect 30-degree guard position
    max: 90,     // Slightly bent but still protecting
  },
  
  // Lead shoulder - rotates forward with the punch
  leadShoulder: {
    min: 70,      // Not rotated enough
    optimal: 90,  // Ideal rotation forward
    max: 110,     // Over-rotated
  },
  
  // Rear shoulder - stays back for balance
  rearShoulder: {
    min: 0,      // Too forward, losing balance
    optimal: 5, // Proper back position
    max: 10,     // Good range for stability
  },
  
  // Head position - should stay centered and neutral
  headAngle: {
    min: 30,       // Head tilted too much
    optimal: 45,   // Perfectly centered
    max: 60,      // Slight tilt acceptable
  },
  
  // Hip rotation - jabs use minimal hip movement
  hipRotation: {
    min: 0,        // No rotation (acceptable for jab)
    optimal: 15,   // Slight rotation for power
    max: 30,       // Too much rotation (becomes a cross)
  },
};

/**
 * Scoring weights for jab analysis
 * Total should add up to 100
 */
export const JAB_SCORING_WEIGHTS = {
  armExtension: 40,      // 40% - Full extension for reach (increased from 25%)
  shoulderAlignment: 30, // 30% - Proper shoulder rotation (increased from 20%)
  hipControl: 20,        // 20% - Minimal hip rotation (increased from 15%)
  headPosition: 10,      // 10% - Head stability (kept same)
};


