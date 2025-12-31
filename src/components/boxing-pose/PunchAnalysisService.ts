// Minimal PunchAnalysisService - MVP heuristics and eventing
import { JabAnalysisResult} from './interfaces';
import { PunchStat } from './PunchStat';
import { DEFAULT_JAB_CONFIG, JAB_SCORING_WEIGHTS } from './config';


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
    let headPositionScore = 0;

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

    // 4. HIP CONTROL ANALYSIS (15% of total score)
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

    // 5. HEAD POSITION ANALYSIS (10% of total score)
    const headAngle = stat.headAngle;
    
    if (headAngle >= config.headAngle.min && headAngle <= config.headAngle.max) {
      const optimalDistance = Math.abs(headAngle - config.headAngle.optimal);
      const rangeSize = config.headAngle.max - config.headAngle.min;
      const score = Math.max(0, 1 - (optimalDistance / rangeSize));
      headPositionScore = score * weights.headPosition;
      
      if (optimalDistance <= 5) {
        feedback.push('Perfect head position');
      } else {
        feedback.push('Good head position');
      }
    } else {
      const distance = Math.min(
        Math.abs(headAngle - config.headAngle.min),
        Math.abs(headAngle - config.headAngle.max)
      );
      headPositionScore = Math.max(0, weights.headPosition * (1 - distance / 30));
      tips.push('Keep your head centered and eyes on your target');
    }

    // Calculate total score (0-100)
    const totalScore = Math.round(
      armExtensionScore + 
      shoulderAlignmentScore + 
      hipControlScore + 
      headPositionScore
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
        guardScore: Math.round(headPositionScore),
      },
      tips,
    };
  }
}
