import { Pose } from '@tensorflow-models/pose-detection';
import { GaitParameters } from '@/services/GaitAnalysisService';

/**
 * Factory for creating test data with realistic values
 */
export class TestDataFactory {
  /**
   * Creates a realistic walking pose sequence
   */
  static createWalkingSequence(frameCount: number = 60, startTime: number = Date.now()): Array<{ pose: Pose; timestamp: number }> {
    const sequence: Array<{ pose: Pose; timestamp: number }> = [];
    
    for (let i = 0; i < frameCount; i++) {
      const progress = i / frameCount;
      const walkingPhase = progress * 2 * Math.PI; // One complete gait cycle
      
      const pose: Pose = {
        keypoints: [
          // Nose
          { x: 320, y: 100, score: 0.9, name: 'nose' },
          // Eyes
          { x: 310, y: 95, score: 0.85, name: 'left_eye' },
          { x: 330, y: 95, score: 0.85, name: 'right_eye' },
          // Ears
          { x: 305, y: 100, score: 0.8, name: 'left_ear' },
          { x: 335, y: 100, score: 0.8, name: 'right_ear' },
          // Shoulders
          { x: 280, y: 160, score: 0.9, name: 'left_shoulder' },
          { x: 360, y: 160, score: 0.9, name: 'right_shoulder' },
          // Elbows
          { x: 260, y: 200 + Math.sin(walkingPhase) * 10, score: 0.85, name: 'left_elbow' },
          { x: 380, y: 200 + Math.sin(walkingPhase + Math.PI) * 10, score: 0.85, name: 'right_elbow' },
          // Wrists
          { x: 250, y: 240 + Math.sin(walkingPhase) * 15, score: 0.8, name: 'left_wrist' },
          { x: 390, y: 240 + Math.sin(walkingPhase + Math.PI) * 15, score: 0.8, name: 'right_wrist' },
          // Hips
          { x: 300, y: 280, score: 0.9, name: 'left_hip' },
          { x: 340, y: 280, score: 0.9, name: 'right_hip' },
          // Knees
          { x: 295, y: 350 + Math.sin(walkingPhase) * 20, score: 0.85, name: 'left_knee' },
          { x: 345, y: 350 + Math.sin(walkingPhase + Math.PI) * 20, score: 0.85, name: 'right_knee' },
          // Ankles - realistic walking pattern
          { 
            x: 290 + Math.sin(walkingPhase) * 30 + progress * 50, // Forward movement
            y: 420 + Math.abs(Math.sin(walkingPhase)) * 15, // Foot lift
            score: 0.9, 
            name: 'left_ankle' 
          },
          { 
            x: 350 + Math.sin(walkingPhase + Math.PI) * 30 + progress * 50, // Forward movement
            y: 420 + Math.abs(Math.sin(walkingPhase + Math.PI)) * 15, // Foot lift
            score: 0.9, 
            name: 'right_ankle' 
          }
        ],
        score: 0.9
      };
      
      sequence.push({
        pose,
        timestamp: startTime + i * 33 // 30 FPS
      });
    }
    
    return sequence;
  }
  
  /**
   * Creates a pose with pathological gait patterns
   */
  static createPathologicalGait(type: 'limping' | 'shuffling' | 'asymmetric', frameIndex: number = 0): Pose {
    const baseKeypoints = Array.from({ length: 17 }, (_, i) => ({
      x: 100 + i * 20,
      y: 200 + i * 20,
      score: 0.9,
      name: `keypoint_${i}`
    }));
    
    switch (type) {
      case 'limping':
        // Simulate limping by reducing left foot movement
        baseKeypoints[15] = { // Left ankle
          x: 290 + Math.sin(frameIndex * 0.1) * 10, // Reduced movement
          y: 420,
          score: 0.9,
          name: 'left_ankle'
        };
        baseKeypoints[16] = { // Right ankle
          x: 350 + Math.sin(frameIndex * 0.1) * 30, // Normal movement
          y: 420,
          score: 0.9,
          name: 'right_ankle'
        };
        break;
        
      case 'shuffling':
        // Simulate shuffling with minimal foot lift
        baseKeypoints[15] = { // Left ankle
          x: 290 + frameIndex * 2,
          y: 420 + Math.abs(Math.sin(frameIndex * 0.05)) * 3, // Minimal lift
          score: 0.9,
          name: 'left_ankle'
        };
        baseKeypoints[16] = { // Right ankle
          x: 350 + frameIndex * 2,
          y: 420 + Math.abs(Math.sin(frameIndex * 0.05 + Math.PI)) * 3, // Minimal lift
          score: 0.9,
          name: 'right_ankle'
        };
        break;
        
      case 'asymmetric':
        // Simulate asymmetric gait with different step lengths
        baseKeypoints[15] = { // Left ankle
          x: 290 + Math.sin(frameIndex * 0.1) * 40, // Longer steps
          y: 420 + Math.abs(Math.sin(frameIndex * 0.1)) * 20,
          score: 0.9,
          name: 'left_ankle'
        };
        baseKeypoints[16] = { // Right ankle
          x: 350 + Math.sin(frameIndex * 0.1 + Math.PI) * 20, // Shorter steps
          y: 420 + Math.abs(Math.sin(frameIndex * 0.1 + Math.PI)) * 10,
          score: 0.9,
          name: 'right_ankle'
        };
        break;
    }
    
    return {
      keypoints: baseKeypoints,
      score: 0.8 // Slightly lower confidence for pathological cases
    };
  }
  
  /**
   * Creates realistic gait parameters for testing
   */
  static createRealisticGaitParameters(type: 'normal' | 'elderly' | 'athletic' = 'normal'): GaitParameters {
    const baseParams = {
      cadence: 0,
      strideLength: 0,
      strideTime: 0,
      stepWidth: 0,
      velocity: 0,
      symmetryIndex: 0,
      confidence: 0.9
    };
    
    switch (type) {
      case 'normal':
        return {
          ...baseParams,
          cadence: 110, // steps per minute
          strideLength: 1.4, // meters
          strideTime: 1.1, // seconds
          stepWidth: 0.1, // meters
          velocity: 1.27, // m/s
          symmetryIndex: 95.5 // percentage
        };
        
      case 'elderly':
        return {
          ...baseParams,
          cadence: 95, // slower cadence
          strideLength: 1.1, // shorter strides
          strideTime: 1.3, // longer stride time
          stepWidth: 0.15, // wider steps for stability
          velocity: 0.85, // slower velocity
          symmetryIndex: 88.2, // less symmetric
          confidence: 0.8 // lower confidence due to variability
        };
        
      case 'athletic':
        return {
          ...baseParams,
          cadence: 130, // faster cadence
          strideLength: 1.6, // longer strides
          strideTime: 0.9, // shorter stride time
          stepWidth: 0.08, // narrower steps
          velocity: 1.73, // faster velocity
          symmetryIndex: 98.1 // highly symmetric
        };
        
      default:
        return baseParams;
    }
  }
  
  /**
   * Creates a sequence of poses with specific gait events
   */
  static createGaitEventSequence(events: string[], frameInterval: number = 33): Array<{ pose: Pose; timestamp: number }> {
    const sequence: Array<{ pose: Pose; timestamp: number }> = [];
    const startTime = Date.now();
    
    events.forEach((event, index) => {
      let pose: Pose;
      
      switch (event) {
        case 'left_heel_strike':
          pose = this.createPoseWithEvent('left_heel_strike', index);
          break;
        case 'right_heel_strike':
          pose = this.createPoseWithEvent('right_heel_strike', index);
          break;
        case 'left_toe_off':
          pose = this.createPoseWithEvent('left_toe_off', index);
          break;
        case 'right_toe_off':
          pose = this.createPoseWithEvent('right_toe_off', index);
          break;
        default:
          pose = this.createPoseWithEvent('midstance', index);
      }
      
      sequence.push({
        pose,
        timestamp: startTime + index * frameInterval
      });
    });
    
    return sequence;
  }
  
  /**
   * Creates a pose representing a specific gait event
   */
  private static createPoseWithEvent(event: string, frameIndex: number): Pose {
    const baseKeypoints = Array.from({ length: 17 }, (_, i) => ({
      x: 100 + i * 20,
      y: 200 + i * 20,
      score: 0.9,
      name: `keypoint_${i}`
    }));
    
    switch (event) {
      case 'left_heel_strike':
        baseKeypoints[15] = { // Left ankle
          x: 290,
          y: 420, // Foot on ground
          score: 0.95,
          name: 'left_ankle'
        };
        baseKeypoints[16] = { // Right ankle
          x: 350,
          y: 435, // Foot lifting
          score: 0.9,
          name: 'right_ankle'
        };
        break;
        
      case 'right_heel_strike':
        baseKeypoints[15] = { // Left ankle
          x: 290,
          y: 435, // Foot lifting
          score: 0.9,
          name: 'left_ankle'
        };
        baseKeypoints[16] = { // Right ankle
          x: 350,
          y: 420, // Foot on ground
          score: 0.95,
          name: 'right_ankle'
        };
        break;
        
      case 'left_toe_off':
        baseKeypoints[15] = { // Left ankle
          x: 290,
          y: 440, // Foot pushing off
          score: 0.9,
          name: 'left_ankle'
        };
        baseKeypoints[16] = { // Right ankle
          x: 350,
          y: 420, // Foot on ground
          score: 0.95,
          name: 'right_ankle'
        };
        break;
        
      case 'right_toe_off':
        baseKeypoints[15] = { // Left ankle
          x: 290,
          y: 420, // Foot on ground
          score: 0.95,
          name: 'left_ankle'
        };
        baseKeypoints[16] = { // Right ankle
          x: 350,
          y: 440, // Foot pushing off
          score: 0.9,
          name: 'right_ankle'
        };
        break;
    }
    
    return {
      keypoints: baseKeypoints,
      score: 0.9
    };
  }
  
  /**
   * Creates poses with varying confidence levels
   */
  static createPoseWithConfidence(confidenceLevel: 'high' | 'medium' | 'low'): Pose {
    let scoreRange: [number, number];
    
    switch (confidenceLevel) {
      case 'high':
        scoreRange = [0.8, 0.95];
        break;
      case 'medium':
        scoreRange = [0.5, 0.8];
        break;
      case 'low':
        scoreRange = [0.2, 0.5];
        break;
    }
    
    const keypoints = Array.from({ length: 17 }, (_, i) => ({
      x: 100 + i * 20 + (Math.random() - 0.5) * 10, // Add some noise
      y: 200 + i * 20 + (Math.random() - 0.5) * 10,
      score: scoreRange[0] + Math.random() * (scoreRange[1] - scoreRange[0]),
      name: `keypoint_${i}`
    }));
    
    const overallScore = scoreRange[0] + Math.random() * (scoreRange[1] - scoreRange[0]);
    
    return {
      keypoints,
      score: overallScore
    };
  }
  
  /**
   * Creates a performance metrics object for testing
   */
  static createPerformanceMetrics(scenario: 'optimal' | 'degraded' | 'critical') {
    const baseMetrics = {
      frameRate: 30,
      averageProcessingTime: 16.67,
      memoryUsage: 50,
      cpuUsage: 25,
      droppedFrames: 0,
      modelInferenceTime: 10,
      renderingTime: 5
    };
    
    switch (scenario) {
      case 'optimal':
        return {
          ...baseMetrics,
          frameRate: 60,
          averageProcessingTime: 8.33,
          memoryUsage: 30,
          cpuUsage: 15,
          droppedFrames: 0,
          modelInferenceTime: 5,
          renderingTime: 2
        };
        
      case 'degraded':
        return {
          ...baseMetrics,
          frameRate: 20,
          averageProcessingTime: 35,
          memoryUsage: 100,
          cpuUsage: 60,
          droppedFrames: 15,
          modelInferenceTime: 25,
          renderingTime: 8
        };
        
      case 'critical':
        return {
          ...baseMetrics,
          frameRate: 8,
          averageProcessingTime: 80,
          memoryUsage: 200,
          cpuUsage: 90,
          droppedFrames: 50,
          modelInferenceTime: 60,
          renderingTime: 15
        };
        
      default:
        return baseMetrics;
    }
  }
  
  /**
   * Creates tracked person data for multi-person scenarios
   */
  static createTrackedPersons(count: number = 2) {
    return Array.from({ length: count }, (_, i) => ({
      id: `person_${i + 1}`,
      poses: [
        {
          pose: global.createMockPose({
            keypoints: Array.from({ length: 17 }, (_, j) => ({
              x: 100 + j * 20 + i * 200, // Offset for different persons
              y: 200 + j * 20,
              score: 0.9 - i * 0.1, // Slightly lower confidence for subsequent persons
              name: `keypoint_${j}`
            }))
          }),
          timestamp: Date.now()
        }
      ],
      lastSeen: Date.now(),
      boundingBox: {
        x: 50 + i * 200,
        y: 50,
        width: 200,
        height: 400
      },
      confidence: 0.9 - i * 0.1
    }));
  }
  
  /**
   * Creates mock video constraints for testing
   */
  static createVideoConstraints(quality: 'low' | 'medium' | 'high' = 'medium'): MediaStreamConstraints {
    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 }
      }
    };
    
    switch (quality) {
      case 'low':
        return {
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 10 }
          }
        };
        
      case 'medium':
        return constraints;
        
      case 'high':
        return {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        };
        
      default:
        return constraints;
    }
  }
}