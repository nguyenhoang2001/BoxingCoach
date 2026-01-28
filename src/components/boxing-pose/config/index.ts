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
  armExtension: 40,      // 40% - Full extension for reach
  shoulderAlignment: 35, // 35% - Proper shoulder rotation
  hipControl: 25,        // 25% - Minimal hip rotation
};

/**
 * Default values for a perfect cross punch technique
 * Based on professional boxing standards
 * More forgiving than jab to allow users to get higher scores
 */
export const DEFAULT_CROSS_CONFIG = {
  rearHand: false, // Right hand for orthodox stance (rear hand)
  
  // Rear elbow (punching arm) - should be fully extended at impact
  rearElbow: {
    min: 130,     // Minimum acceptable extension (slightly more forgiving than jab)
    optimal: 170, // Nearly straight arm
    max: 180,     // Fully extended
  },
  
  // Lead elbow (front hand) - should stay bent to protect face
  leadElbow: {
    min: 40,      // More forgiving than jab
    optimal: 60,  // Perfect 60-degree guard position
    max: 100,     // Slightly bent but still protecting
  },
  
  // Rear shoulder - rotates forward with the punch (primary power source)
  rearShoulder: {
    min: 60,      // Not rotated enough
    optimal: 85,  // Ideal rotation forward
    max: 120,     // Over-rotated
  },
  
  // Lead shoulder - comes forward as cross is thrown
  leadShoulder: {
    min: 50,      // Minimum acceptable position
    optimal: 70,  // Proper position during cross
    max: 100,     // Over-extended
  },
  
  // Head position - should stay relatively centered
  headAngle: {
    min: 30,      // Head tilted too much
    optimal: 50,  // Naturally centered
    max: 70,      // Slight tilt acceptable
  },
  
  // Hip rotation - crosses use significant hip rotation for power
  hipRotation: {
    min: 20,      // Minimum hip rotation for cross
    optimal: 45,  // Good hip rotation for power
    max: 80,      // Over-rotation still acceptable for power
  },
};

/**
 * Scoring weights for cross analysis
 * Total should add up to 100
 * Weighted more favorably than jab to allow easier scoring
 */
export const CROSS_SCORING_WEIGHTS = {
  armExtension: 30,      // 30% - Full extension for reach
  shoulderAlignment: 40, // 40% - Proper shoulder rotation (more important for cross)
  hipControl: 30,        // 30% - Hip rotation for power (more important for cross)
};

/**
 * Default values for a perfect hook punch technique
 * Based on professional boxing standards
 * Hook is a curved punch - arm should be bent, not fully extended
 * Most forgiving scoring to allow users to achieve higher scores
 */
export const DEFAULT_HOOK_CONFIG = {
  hand: 'left', // Can be lead or rear hand
  
  // Elbow angle for hook - should be bent (not fully extended like jab/cross)
  punchingElbow: {
    min: 30,      // Slightly bent
    optimal: 90,  // Perfect 90-degree angle for circular motion
    max: 120,     // Moderately bent
  },
  
  // Guard elbow - should stay bent to protect face
  guardElbow: {
    min: 30,      // More forgiving for hooks
    optimal: 40,  // Good guard position
    max: 90,     // Can be more open for hook
  },
  
  // Lead shoulder - rotates significantly for hook power
  leadShoulder: {
    min: 80,      // Minimum rotation for hook
    optimal: 120, // Ideal rotation (hooks use shoulder heavily)
    max: 150,     // Can over-rotate for hooks
  },
  
  // Rear shoulder - comes forward with the hook
  rearShoulder: {
    min: 40,      // Minimum position
    optimal: 60,  // Good rear shoulder position
    max: 110,     // Can be extended
  },
  
  // Hip rotation - hooks use significant hip rotation
  hipRotation: {
    min: 10,      // Minimum hip rotation for hook
    optimal: 17,  // Good hip rotation
    max: 30,     // Hooks can use lots of hip rotation
  },
};

/**
 * Scoring weights for hook analysis
 * Total should add up to 100
 * Most forgiving scoring - hooks are natural and user-friendly
 */
export const HOOK_SCORING_WEIGHTS = {
  armExtension: 25,      // 25% - Proper arm bend (not full extension)
  shoulderAlignment: 45, // 45% - Shoulder rotation is KEY for hooks
  hipControl: 30,        // 30% - Hip rotation for power
};

/**
 * Default values for a perfect uppercut punch technique
 * Based on professional boxing standards
 * Uppercut is an upward punch with significant hip rotation
 * Requires lots of hip drive and upward body movement
 */
export const DEFAULT_UPPERCUT_CONFIG = {
  hand: 'left', // Can be lead or rear hand
  
  // Elbow angle for uppercut - should be bent for upward motion
  punchingElbow: {
    min: 30,      // Minimum bend
    optimal: 56,  // Optimal based on your measurements
    max: 100,     // More bent than hooks allows for upward drive
  },
  
  // Guard elbow - should stay bent to protect face
  guardElbow: {
    min: 25,      // More forgiving for uppercut
    optimal: 30,  // Close to body for uppercut
    max: 90,      // Can be more open
  },
  
  // Lead shoulder - minimal rotation for uppercut (more vertical)
  leadShoulder: {
    min: 30,      // Minimal rotation
    optimal: 42,  // Based on your measurements
    max: 60,      // Limited rotation (vertical motion dominates)
  },
  
  // Rear shoulder - significant forward movement for power
  rearShoulder: {
    min: 60,      // Good forward position for uppercut
    optimal: 77,  // Based on your measurements
    max: 110,     // Can be extended
  },
  
  // Hip rotation - uppercuts use significant hip rotation upward
  hipRotation: {
    min: 15,      // Minimum hip rotation
    optimal: 24,  // Based on your measurements
    max: 50,      // Significant but not as much as hooks
  },
};

/**
 * Scoring weights for uppercut analysis
 * Total should add up to 100
 * Uppercuts emphasize vertical drive and hip rotation
 */
export const UPPERCUT_SCORING_WEIGHTS = {
  armExtension: 25,      // 25% - Proper arm bend (vertical alignment)
  shoulderAlignment: 35, // 35% - Rear shoulder drive is important
  hipControl: 40,        // 40% - Hip rotation is CRITICAL for uppercut power
};


