import { PunchStat } from '../components/boxing-pose/PunchStat';

interface BoxingTipsResponse {
  tips: string[];
  feedback: string;
  recommendation: string;
}

/**
 * Get intelligent boxing coaching tips from OpenAI ChatGPT
 * @param punch - The type of punch being performed (Jab, Cross, Hook, etc.)
 * @param metrics - Current punch statistics from pose detection
 * @param score - Current form score (0-100)
 * @param previousFeedback - Previous feedback to provide context
 * @returns Promise with AI-generated tips and feedback
 */
export async function getOpenAIBoxingTips(
  punch: string,
  metrics: PunchStat,
  score: number,
  previousFeedback: string[]
): Promise<BoxingTipsResponse> {
  try {
    // Prepare metrics summary for ChatGPT
    const metricsSummary = `
      Current ${punch} Analysis:
      - Head Angle: ${Math.round(metrics.headAngle)}°
      - Left Shoulder: ${Math.round(metrics.leftShoulderAngle)}°
      - Right Shoulder: ${Math.round(metrics.rightShoulderAngle)}°
      - Left Elbow: ${Math.round(metrics.leftElbowAngle)}°
      - Right Elbow: ${Math.round(metrics.rightElbowAngle)}°
      - Hip Rotation: ${Math.round(metrics.hipRotation)}°
      - Lead Hand: ${metrics.leadHand ? 'Left' : 'Right'}
      - Form Score: ${score}%
    `;

    // Call our backend API endpoint
    const response = await fetch('/api/boxing-tips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        punch,
        metricsSummary,
        score,
        previousFeedback: previousFeedback.slice(-3), // Last 3 feedback items for context
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data as BoxingTipsResponse;
  } catch (error) {
    console.error('Error getting ChatGPT boxing tips:', error);
    // Fallback to generic tips
    return {
      tips: [
        'Keep your guard up',
        'Rotate your hips for more power',
        'Extend your arm fully',
        'Keep your chin tucked',
      ],
      feedback: 'Unable to connect to AI coaching service',
      recommendation: 'Continue practicing your form',
    };
  }
}

/**
 * Lightweight version for quick feedback (without full API call)
 * Falls back to local heuristics if needed
 */
export function getLocalBoxingTips(
  punch: string,
  metrics: PunchStat,
  score: number
): string[] {
  const tips: string[] = [];

  // Generic tips based on score
  if (score < 40) {
    tips.push('Focus on proper form before adding power');
  } else if (score < 70) {
    tips.push('Getting better! Keep practicing this punch');
  } else {
    tips.push('Excellent form! Try increasing your speed');
  }

  // Metrics-based tips
  if (metrics.headAngle > 30) {
    tips.push('Keep your head steady - avoid looking down');
  }

  if (metrics.leftElbowAngle > 120 && punch === 'Jab') {
    tips.push('Extend your jab arm straighter');
  }

  if (metrics.hipRotation < 20) {
    tips.push('Generate more power by rotating your hips');
  }

  if (metrics.rightElbowAngle > 100) {
    tips.push('Guard your right hand up by your chin');
  }

  return tips;
}
