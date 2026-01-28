// Minimal PunchAnalysisService - MVP heuristics and eventing
import { JabAnalysisResult} from './interfaces';
import { PunchStat } from './PunchStat';
import { DEFAULT_JAB_CONFIG, JAB_SCORING_WEIGHTS, DEFAULT_CROSS_CONFIG, CROSS_SCORING_WEIGHTS, DEFAULT_HOOK_CONFIG, HOOK_SCORING_WEIGHTS, DEFAULT_UPPERCUT_CONFIG, UPPERCUT_SCORING_WEIGHTS } from './config';


export class PunchAnalysisService {
  /**
   * Analyzes a jab punch based on PunchStat metrics using default config
   * Assumes lead hand is left (orthodox stance)
   * @param stat - The punch statistics to analyze
   * @returns JabAnalysisResult with score (0-100%), feedback, and tips
   */
  public analyzeJab(stat: PunchStat): JabAnalysisResult {
    const feedback: string[] = [];
    const tips: string[] = [];
    
    const config = DEFAULT_JAB_CONFIG;
    const weights = JAB_SCORING_WEIGHTS;
    
    // Initialize component scores
    let armExtensionScore = 0;
    let shoulderAlignmentScore = 0;
    let hipControlScore = 0;

    // 1. ARM EXTENSION ANALYSIS (25% of total score)
    // For left lead hand - check left elbow angle
    const leadElbowAngle = stat.leftElbowAngle;
    const guardElbowAngle = stat.rightElbowAngle;
    
    // Lead arm extension score (60% of arm extension)
    if (leadElbowAngle < config.leadElbow.min) {
      armExtensionScore += (leadElbowAngle / config.leadElbow.min) * 0.6 * weights.armExtension * 0.5;
      feedback.push('Arm not extended enough');
      tips.push('Extend your lead arm fully at the end of the jab');
    } else if (leadElbowAngle >= config.leadElbow.optimal) {
      armExtensionScore += 0.6 * weights.armExtension;
      feedback.push('Perfect arm extension');
    } else {
      const range = config.leadElbow.optimal - config.leadElbow.min;
      const progress = (leadElbowAngle - config.leadElbow.min) / range;
      armExtensionScore += progress * 0.6 * weights.armExtension;
      feedback.push('Good extension, could be straighter');
      tips.push('Try to fully extend your arm for maximum reach');
    }
    
    // Guard arm position score (40% of arm extension)
    if (guardElbowAngle >= config.guardElbow.min && guardElbowAngle <= config.guardElbow.max) {
      const optimalDistance = Math.abs(guardElbowAngle - config.guardElbow.optimal);
      const rangeSize = config.guardElbow.max - config.guardElbow.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize));
      armExtensionScore += score * 0.4 * weights.armExtension;
      
      if (optimalDistance <= 10) {
        feedback.push('Excellent guard position');
      } else {
        feedback.push('Guard position acceptable');
      }
    } else if (guardElbowAngle > config.guardElbow.max) {
      armExtensionScore += 0.1 * weights.armExtension;
      feedback.push('Guard hand too extended');
      tips.push('Keep your rear hand up by your chin to protect your face');
    } else {
      armExtensionScore += 0.2 * weights.armExtension;
      tips.push('Maintain proper guard position with your rear hand');
    }

    // 3. SHOULDER ALIGNMENT ANALYSIS (20% of total score)
    const leadShoulderAngle = stat.leftShoulderAngle;
    const rearShoulderAngle = stat.rightShoulderAngle;
    
    // Lead shoulder score (50% of shoulder alignment)
    if (leadShoulderAngle >= config.leadShoulder.min && leadShoulderAngle <= config.leadShoulder.max) {
      const optimalDistance = Math.abs(leadShoulderAngle - config.leadShoulder.optimal);
      const rangeSize = config.leadShoulder.max - config.leadShoulder.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize));
      shoulderAlignmentScore += score * 0.5 * weights.shoulderAlignment;
      
      if (optimalDistance <= 10) {
        feedback.push('Perfect lead shoulder rotation');
      }
    } else {
      shoulderAlignmentScore += 0.2 * weights.shoulderAlignment;
      tips.push('Rotate your lead shoulder forward as you jab');
    }
    
    // Rear shoulder score (50% of shoulder alignment)
    if (rearShoulderAngle >= config.rearShoulder.min && rearShoulderAngle <= config.rearShoulder.max) {
      const optimalDistance = Math.abs(rearShoulderAngle - config.rearShoulder.optimal);
      const rangeSize = Math.max(1, config.rearShoulder.max - config.rearShoulder.min);
      const score = Math.max(0, 1 - (optimalDistance / rangeSize));
      shoulderAlignmentScore += score * 0.5 * weights.shoulderAlignment;
      
      if (optimalDistance <= 5) {
        feedback.push('Perfect rear shoulder position');
      }
    } else {
      shoulderAlignmentScore += 0.2 * weights.shoulderAlignment;
      tips.push('Keep your rear shoulder back for balance');
    }

    // 4. HIP CONTROL ANALYSIS (25% of total score)
    const hipRotation = stat.hipRotation;
    
    if (hipRotation <= config.hipRotation.optimal) {
      hipControlScore = weights.hipControl;
      feedback.push('Perfect hip control for jab');
    } else if (hipRotation <= config.hipRotation.max) {
      const excess = hipRotation - config.hipRotation.optimal;
      const range = config.hipRotation.max - config.hipRotation.optimal;
      hipControlScore = weights.hipControl * (1 - (excess / range) * 0.4);
      feedback.push('Slight over-rotation in hips');
      tips.push('Jabs should use minimal hip rotation - save rotation for crosses');
    } else {
      const penalty = Math.min(1, (hipRotation - config.hipRotation.max) / 30);
      hipControlScore = weights.hipControl * (0.3 - penalty * 0.3);
      feedback.push('Too much hip rotation for a jab');
      tips.push('Keep your hips stable - this should be a quick, straight punch');
    }

    // Calculate total score (0-100)
    const totalScore = Math.round(
      armExtensionScore + 
      shoulderAlignmentScore + 
      hipControlScore
    );

    // Clamp score between 0 and 100
    const finalScore = Math.max(0, Math.min(100, totalScore));

    // Determine if it's a valid jab (score >= 50%)
    const isValidJab = finalScore >= 50;

    return {
      isValidJab,
      score: finalScore,
      feedback,
      metrics: {
        velocityScore: 0,
        formScore: Math.round(armExtensionScore + shoulderAlignmentScore),
        powerScore: Math.round(hipControlScore),
        guardScore: 0,
      },
      tips,
    };
  }

  /**
   * Analyzes a cross punch based on PunchStat metrics
   * Rear hand (right hand for orthodox stance)
   * More forgiving scoring to help users achieve higher scores
   * @param stat - The punch statistics to analyze
   * @returns JabAnalysisResult with score (0-100%), feedback, and tips
   */
  public analyzeCross(stat: PunchStat): JabAnalysisResult {
    const feedback: string[] = [];
    const tips: string[] = [];
    
    const config = DEFAULT_CROSS_CONFIG;
    const weights = CROSS_SCORING_WEIGHTS;
    
    // Initialize component scores
    let armExtensionScore = 0;
    let shoulderAlignmentScore = 0;
    let hipControlScore = 0;

    // 1. ARM EXTENSION ANALYSIS (30% of total score)
    // For rear hand (right) - check right elbow angle
    const rearElbowAngle = stat.rightElbowAngle;
    const leadElbowAngle = stat.leftElbowAngle;
    
    // Rear arm extension score (60% of arm extension)
    if (rearElbowAngle < config.rearElbow.min) {
      armExtensionScore += (rearElbowAngle / config.rearElbow.min) * 0.6 * weights.armExtension * 0.5;
      feedback.push('Arm not extended enough');
      tips.push('Extend your rear arm fully to generate power');
    } else if (rearElbowAngle >= config.rearElbow.optimal) {
      armExtensionScore += 0.6 * weights.armExtension;
      feedback.push('Perfect arm extension');
    } else {
      const range = config.rearElbow.optimal - config.rearElbow.min;
      const progress = (rearElbowAngle - config.rearElbow.min) / range;
      armExtensionScore += progress * 0.6 * weights.armExtension;
      feedback.push('Good extension, could be straighter');
      tips.push('Try to fully extend your arm for maximum power');
    }
    
    // Lead arm position score (40% of arm extension) - more forgiving for cross
    if (leadElbowAngle >= config.leadElbow.min && leadElbowAngle <= config.leadElbow.max) {
      const optimalDistance = Math.abs(leadElbowAngle - config.leadElbow.optimal);
      const rangeSize = config.leadElbow.max - config.leadElbow.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize * 0.5)); // More forgiving
      armExtensionScore += score * 0.4 * weights.armExtension;
      
      if (optimalDistance <= 20) {
        feedback.push('Good lead hand position');
      }
    } else if (leadElbowAngle > config.leadElbow.max) {
      armExtensionScore += 0.3 * weights.armExtension;
      feedback.push('Lead hand slightly extended');
      tips.push('Keep your front hand closer to protect your face');
    } else {
      armExtensionScore += 0.5 * weights.armExtension;
      feedback.push('Lead hand position acceptable');
    }

    // 2. SHOULDER ALIGNMENT ANALYSIS (35% of total score)
    const rearShoulderAngle = stat.rightShoulderAngle;
    const leadShoulderAngle = stat.leftShoulderAngle;
    
    // Rear shoulder score (70% of shoulder alignment) - primary power source
    if (rearShoulderAngle >= config.rearShoulder.min && rearShoulderAngle <= config.rearShoulder.max) {
      const optimalDistance = Math.abs(rearShoulderAngle - config.rearShoulder.optimal);
      const rangeSize = config.rearShoulder.max - config.rearShoulder.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize * 0.4)); // More forgiving
      shoulderAlignmentScore += score * 0.7 * weights.shoulderAlignment;
      
      if (optimalDistance <= 15) {
        feedback.push('Excellent rear shoulder rotation');
      }
    } else {
      shoulderAlignmentScore += 0.3 * weights.shoulderAlignment;
      tips.push('Rotate your rear shoulder forward for more power');
    }
    
    // Lead shoulder score (30% of shoulder alignment)
    if (leadShoulderAngle >= config.leadShoulder.min && leadShoulderAngle <= config.leadShoulder.max) {
      const optimalDistance = Math.abs(leadShoulderAngle - config.leadShoulder.optimal);
      const rangeSize = config.leadShoulder.max - config.leadShoulder.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize));
      shoulderAlignmentScore += score * 0.3 * weights.shoulderAlignment;
      
      if (optimalDistance <= 10) {
        feedback.push('Perfect lead shoulder position');
      }
    } else {
      shoulderAlignmentScore += 0.4 * weights.shoulderAlignment;
      feedback.push('Lead shoulder position acceptable');
    }

    // 3. HIP CONTROL ANALYSIS (30% of total score)
    const hipRotation = stat.hipRotation;
    
    // Crosses require more hip rotation than jabs - much more forgiving
    if (hipRotation >= config.hipRotation.optimal) {
      hipControlScore = weights.hipControl;
      feedback.push('Perfect hip rotation for cross');
    } else if (hipRotation >= config.hipRotation.min) {
      const deficit = config.hipRotation.optimal - hipRotation;
      const range = config.hipRotation.optimal - config.hipRotation.min;
      hipControlScore = weights.hipControl * (0.7 + (1 - deficit / range) * 0.3);
      feedback.push('Good hip rotation');
      tips.push('More hip rotation will increase your power');
    } else {
      hipControlScore = weights.hipControl * 0.4;
      feedback.push('Minimum hip rotation detected');
      tips.push('Rotate your hips to generate power for the cross');
    }

    // Calculate total score (0-100) - biased towards higher scores
    const totalScore = Math.round(
      armExtensionScore + 
      shoulderAlignmentScore + 
      hipControlScore
    );

    // Clamp score between 0 and 100
    const finalScore = Math.max(0, Math.min(100, totalScore));

    // Determine if it's a valid cross (score >= 40% - easier than jab's 50%)
    const isValidCross = finalScore >= 40;

    return {
      isValidJab: isValidCross, // Reuse for cross validation
      score: finalScore,
      feedback,
      metrics: {
        velocityScore: 0,
        formScore: Math.round(armExtensionScore + shoulderAlignmentScore),
        powerScore: Math.round(hipControlScore),
        guardScore: 0,
      },
      tips,
    };
  }

  /**
   * Analyzes a hook punch based on PunchStat metrics
   * Hook is a curved punch - arm should be bent (unlike jab/cross)
   * Shoulder and hip rotation are key for hooks
   * Most forgiving scoring to help users achieve higher scores
   * @param stat - The punch statistics to analyze
   * @returns JabAnalysisResult with score (0-100%), feedback, and tips
   */
  public analyzeHook(stat: PunchStat): JabAnalysisResult {
    const feedback: string[] = [];
    const tips: string[] = [];
    
    const config = DEFAULT_HOOK_CONFIG;
    const weights = HOOK_SCORING_WEIGHTS;
    
    // Initialize component scores
    let armExtensionScore = 0;
    let shoulderAlignmentScore = 0;
    let hipControlScore = 0;

    // 1. ARM BEND ANALYSIS (25% of total score)
    // For hooks, arm should be bent (not fully extended)
    // Using left shoulder as reference for which arm is punching
    const punchingElbowAngle = stat.leftElbowAngle;
    const guardElbowAngle = stat.rightElbowAngle;
    
    // Punching arm bend score (60% of arm extension)
    // For hooks, optimal is around 90 degrees (bent)
    if (punchingElbowAngle >= config.punchingElbow.min && punchingElbowAngle <= config.punchingElbow.max) {
      const optimalDistance = Math.abs(punchingElbowAngle - config.punchingElbow.optimal);
      const rangeSize = config.punchingElbow.max - config.punchingElbow.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize * 0.3)); // More forgiving
      armExtensionScore += score * 0.6 * weights.armExtension;
      
      if (optimalDistance <= 20) {
        feedback.push('Excellent arm bend for hook');
      } else {
        feedback.push('Good arm bend');
      }
    } else if (punchingElbowAngle > config.punchingElbow.max) {
      armExtensionScore += 0.2 * weights.armExtension;
      feedback.push('Arm too extended for a hook');
      tips.push('Keep your arm bent for a proper hook - this is what makes it a hook!');
    } else {
      armExtensionScore += 0.4 * weights.armExtension;
      feedback.push('Arm very bent');
      tips.push('Extend your arm slightly more while keeping it bent');
    }
    
    // Guard arm position score (40% of arm extension)
    if (guardElbowAngle >= config.guardElbow.min && guardElbowAngle <= config.guardElbow.max) {
      const optimalDistance = Math.abs(guardElbowAngle - config.guardElbow.optimal);
      const rangeSize = config.guardElbow.max - config.guardElbow.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize * 0.4));
      armExtensionScore += score * 0.4 * weights.armExtension;
      
      if (optimalDistance <= 25) {
        feedback.push('Good guard position');
      }
    } else if (guardElbowAngle > config.guardElbow.max) {
      armExtensionScore += 0.3 * weights.armExtension;
      feedback.push('Guard slightly too extended');
      tips.push('Keep your guard hand closer for protection');
    } else {
      armExtensionScore += 0.5 * weights.armExtension;
      feedback.push('Guard position acceptable');
    }

    // 2. SHOULDER ALIGNMENT ANALYSIS (45% of total score)
    // Shoulder rotation is CRUCIAL for hooks
    const leadShoulderAngle = stat.leftShoulderAngle;
    const rearShoulderAngle = stat.rightShoulderAngle;
    
    // Lead shoulder score (60% of shoulder alignment) - primary power source for hooks
    if (leadShoulderAngle >= config.leadShoulder.min && leadShoulderAngle <= config.leadShoulder.max) {
      const optimalDistance = Math.abs(leadShoulderAngle - config.leadShoulder.optimal);
      const rangeSize = config.leadShoulder.max - config.leadShoulder.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize * 0.3)); // More forgiving
      shoulderAlignmentScore += score * 0.6 * weights.shoulderAlignment;
      
      if (optimalDistance <= 20) {
        feedback.push('Excellent lead shoulder rotation for hook');
      }
    } else {
      shoulderAlignmentScore += 0.3 * weights.shoulderAlignment;
      tips.push('Rotate your lead shoulder significantly - shoulder rotation powers the hook');
    }
    
    // Rear shoulder score (40% of shoulder alignment)
    if (rearShoulderAngle >= config.rearShoulder.min && rearShoulderAngle <= config.rearShoulder.max) {
      const optimalDistance = Math.abs(rearShoulderAngle - config.rearShoulder.optimal);
      const rangeSize = config.rearShoulder.max - config.rearShoulder.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize * 0.4));
      shoulderAlignmentScore += score * 0.4 * weights.shoulderAlignment;
      
      if (optimalDistance <= 20) {
        feedback.push('Good rear shoulder position');
      }
    } else {
      shoulderAlignmentScore += 0.4 * weights.shoulderAlignment;
      feedback.push('Rear shoulder position acceptable');
    }

    // 3. HIP CONTROL ANALYSIS (30% of total score)
    const hipRotation = stat.hipRotation;
    
    // Hooks use significant hip rotation - much more forgiving
    if (hipRotation >= config.hipRotation.optimal) {
      hipControlScore = weights.hipControl;
      feedback.push('Perfect hip rotation for hook');
    } else if (hipRotation >= config.hipRotation.min) {
      const deficit = config.hipRotation.optimal - hipRotation;
      const range = config.hipRotation.optimal - config.hipRotation.min;
      hipControlScore = weights.hipControl * (0.6 + (1 - deficit / range) * 0.4);
      feedback.push('Good hip rotation');
      tips.push('More hip rotation will increase your hook power');
    } else {
      hipControlScore = weights.hipControl * 0.3;
      feedback.push('Minimum hip rotation detected');
      tips.push('Rotate your hips to generate power for the hook');
    }

    // Calculate total score (0-100) - most forgiving of all punch types
    const totalScore = Math.round(
      armExtensionScore + 
      shoulderAlignmentScore + 
      hipControlScore
    );

    // Clamp score between 0 and 100
    const finalScore = Math.max(0, Math.min(100, totalScore));

    // Determine if it's a valid hook (score >= 35% - easiest of all)
    const isValidHook = finalScore >= 35;

    return {
      isValidJab: isValidHook, // Reuse for hook validation
      score: finalScore,
      feedback,
      metrics: {
        velocityScore: 0,
        formScore: Math.round(armExtensionScore + shoulderAlignmentScore),
        powerScore: Math.round(hipControlScore),
        guardScore: 0,
      },
      tips,
    };
  }

  /**
   * Analyzes an uppercut punch based on PunchStat metrics
   * Uppercut is an upward punch requiring significant hip rotation and vertical drive
   * Emphasizes hip power and rear shoulder drive
   * @param stat - The punch statistics to analyze
   * @returns JabAnalysisResult with score (0-100%), feedback, and tips
   */
  public analyzeUppercut(stat: PunchStat): JabAnalysisResult {
    const feedback: string[] = [];
    const tips: string[] = [];
    
    const config = DEFAULT_UPPERCUT_CONFIG;
    const weights = UPPERCUT_SCORING_WEIGHTS;
    
    // Initialize component scores
    let armExtensionScore = 0;
    let shoulderAlignmentScore = 0;
    let hipControlScore = 0;

    // 1. ARM BEND ANALYSIS (25% of total score)
    // For uppercuts, arm should be bent for upward motion
    const punchingElbowAngle = stat.leftElbowAngle;
    const guardElbowAngle = stat.rightElbowAngle;
    
    // Punching arm bend score (60% of arm extension)
    if (punchingElbowAngle >= config.punchingElbow.min && punchingElbowAngle <= config.punchingElbow.max) {
      const optimalDistance = Math.abs(punchingElbowAngle - config.punchingElbow.optimal);
      const rangeSize = config.punchingElbow.max - config.punchingElbow.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize * 0.25)); // Very forgiving
      armExtensionScore += score * 0.6 * weights.armExtension;
      
      if (optimalDistance <= 20) {
        feedback.push('Excellent arm position for uppercut');
      } else {
        feedback.push('Good arm bend');
      }
    } else if (punchingElbowAngle > config.punchingElbow.max) {
      armExtensionScore += 0.3 * weights.armExtension;
      feedback.push('Arm too extended for uppercut');
      tips.push('Keep your arm bent more - this helps drive the punch upward');
    } else {
      armExtensionScore += 0.5 * weights.armExtension;
      feedback.push('Arm very bent');
      tips.push('Slightly more arm extension while staying bent');
    }
    
    // Guard arm position score (40% of arm extension)
    if (guardElbowAngle >= config.guardElbow.min && guardElbowAngle <= config.guardElbow.max) {
      const optimalDistance = Math.abs(guardElbowAngle - config.guardElbow.optimal);
      const rangeSize = config.guardElbow.max - config.guardElbow.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize * 0.4));
      armExtensionScore += score * 0.4 * weights.armExtension;
      
      if (optimalDistance <= 15) {
        feedback.push('Perfect guard position');
      }
    } else {
      armExtensionScore += 0.4 * weights.armExtension;
      feedback.push('Guard position acceptable');
      tips.push('Keep your guard closer to your body for uppercuts');
    }

    // 2. SHOULDER ALIGNMENT ANALYSIS (35% of total score)
    // Rear shoulder drive is crucial for uppercut power
    const leadShoulderAngle = stat.leftShoulderAngle;
    const rearShoulderAngle = stat.rightShoulderAngle;
    
    // Lead shoulder score (30% of shoulder alignment) - minimal rotation
    if (leadShoulderAngle >= config.leadShoulder.min && leadShoulderAngle <= config.leadShoulder.max) {
      const optimalDistance = Math.abs(leadShoulderAngle - config.leadShoulder.optimal);
      const rangeSize = config.leadShoulder.max - config.leadShoulder.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize * 0.3)); // More forgiving
      shoulderAlignmentScore += score * 0.3 * weights.shoulderAlignment;
      
      if (optimalDistance <= 10) {
        feedback.push('Excellent lead shoulder position');
      }
    } else {
      shoulderAlignmentScore += 0.3 * weights.shoulderAlignment;
      feedback.push('Lead shoulder position acceptable');
    }
    
    // Rear shoulder score (70% of shoulder alignment) - primary power source
    if (rearShoulderAngle >= config.rearShoulder.min && rearShoulderAngle <= config.rearShoulder.max) {
      const optimalDistance = Math.abs(rearShoulderAngle - config.rearShoulder.optimal);
      const rangeSize = config.rearShoulder.max - config.rearShoulder.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize * 0.25)); // More forgiving
      shoulderAlignmentScore += score * 0.7 * weights.shoulderAlignment;
      
      if (optimalDistance <= 15) {
        feedback.push('Excellent rear shoulder drive for uppercut');
      }
    } else {
      shoulderAlignmentScore += 0.3 * weights.shoulderAlignment;
      tips.push('Drive your rear shoulder forward for more power');
    }

    // 3. HIP CONTROL ANALYSIS (40% of total score) - MOST IMPORTANT for uppercuts
    const hipRotation = stat.hipRotation;
    
    // Uppercuts rely heavily on hip rotation for upward drive
    if (hipRotation >= config.hipRotation.optimal) {
      hipControlScore = weights.hipControl;
      feedback.push('Perfect hip rotation for uppercut');
    } else if (hipRotation >= config.hipRotation.min) {
      const deficit = config.hipRotation.optimal - hipRotation;
      const range = config.hipRotation.optimal - config.hipRotation.min;
      hipControlScore = weights.hipControl * (0.65 + (1 - deficit / range) * 0.35);
      feedback.push('Good hip rotation');
      tips.push('More hip rotation will increase your uppercut power');
    } else {
      hipControlScore = weights.hipControl * 0.35;
      feedback.push('Minimum hip rotation detected');
      tips.push('Hip rotation is KEY for uppercut power - drive through your legs');
    }

    // Calculate total score (0-100)
    const totalScore = Math.round(
      armExtensionScore + 
      shoulderAlignmentScore + 
      hipControlScore
    );

    // Clamp score between 0 and 100
    const finalScore = Math.max(0, Math.min(100, totalScore));

    // Determine if it's a valid uppercut (score >= 40%)
    const isValidUppercut = finalScore >= 40;

    return {
      isValidJab: isValidUppercut, // Reuse for uppercut validation
      score: finalScore,
      feedback,
      metrics: {
        velocityScore: 0,
        formScore: Math.round(armExtensionScore + shoulderAlignmentScore),
        powerScore: Math.round(hipControlScore),
        guardScore: 0,
      },
      tips,
    };
  }
}
