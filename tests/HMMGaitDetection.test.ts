/**
 * Test suite for HMM-based gait phase detection
 * Based on research showing <100ms detection latency
 */

import { HMMGaitDetector } from '../src/services/HMMGaitDetector';
import { 
  GaitPhase, 
  HMMObservation, 
  HMMState,
  GaitEvent 
} from '../src/types/gait';

describe('HMMGaitDetector', () => {
  let detector: HMMGaitDetector;

  beforeEach(() => {
    detector = new HMMGaitDetector();
  });

  describe('Initialization', () => {
    test('should initialize with default HMM parameters', () => {
      expect(detector.getStates()).toHaveLength(4); // HS, FF, HO, TO
      expect(detector.isInitialized()).toBe(true);
    });

    test('should initialize transition matrix correctly', () => {
      const states = detector.getStates();
      states.forEach(state => {
        const totalProbability = Object.values(state.transitionProbabilities)
          .reduce((sum, prob) => sum + prob, 0);
        expect(totalProbability).toBeCloseTo(1.0, 2);
      });
    });
  });

  describe('Observation Processing', () => {
    test('should process single observation', () => {
      const observation = createMockObservation();
      
      const result = detector.processObservation(observation);
      
      expect(result).toBeDefined();
      expect(result.mostLikelyState).toBeDefined();
      expect(result.probability).toBeGreaterThan(0);
      expect(result.probability).toBeLessThanOrEqual(1);
    });

    test('should track state sequence over time', () => {
      const observations = createGaitSequence();
      const results = [];
      
      observations.forEach(obs => {
        const result = detector.processObservation(obs);
        results.push(result);
      });
      
      expect(results).toHaveLength(observations.length);
      
      // Check for logical state transitions
      const states = results.map(r => r.mostLikelyState);
      expect(states).toContain(GaitPhase.HEEL_STRIKE);
      expect(states).toContain(GaitPhase.PRE_SWING);
    });

    test('should detect gait events with confidence', () => {
      const observations = createGaitSequence();
      const events: GaitEvent[] = [];
      
      observations.forEach(obs => {
        const result = detector.processObservation(obs);
        const event = detector.detectGaitEvent(result);
        
        if (event) {
          events.push(event);
        }
      });
      
      expect(events.length).toBeGreaterThan(0);
      events.forEach(event => {
        expect(event.confidence).toBeGreaterThan(0);
        expect(event.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Real-time Performance', () => {
    test('should process observations within 100ms', () => {
      const observation = createMockObservation();
      
      const startTime = performance.now();
      detector.processObservation(observation);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should handle continuous processing efficiently', () => {
      const observations = createContinuousGaitData(100);
      const processingTimes: number[] = [];
      
      observations.forEach(obs => {
        const startTime = performance.now();
        detector.processObservation(obs);
        const endTime = performance.now();
        processingTimes.push(endTime - startTime);
      });
      
      const averageTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      expect(averageTime).toBeLessThan(10); // Should be much faster than 100ms
    });
  });

  describe('Gait Event Detection', () => {
    test('should detect heel strike events', () => {
      const observations = createHeelStrikeSequence();
      const events: GaitEvent[] = [];
      
      observations.forEach(obs => {
        const result = detector.processObservation(obs);
        const event = detector.detectGaitEvent(result);
        
        if (event && event.phase === GaitPhase.HEEL_STRIKE) {
          events.push(event);
        }
      });
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].phase).toBe(GaitPhase.HEEL_STRIKE);
    });

    test('should detect toe-off events', () => {
      const observations = createToeOffSequence();
      const events: GaitEvent[] = [];
      
      observations.forEach(obs => {
        const result = detector.processObservation(obs);
        const event = detector.detectGaitEvent(result);
        
        if (event && event.phase === GaitPhase.PRE_SWING) {
          events.push(event);
        }
      });
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].phase).toBe(GaitPhase.PRE_SWING);
    });

    test('should detect events with proper timing', () => {
      const observations = createGaitSequence();
      const events: GaitEvent[] = [];
      
      observations.forEach(obs => {
        const result = detector.processObservation(obs);
        const event = detector.detectGaitEvent(result);
        
        if (event) {
          events.push(event);
        }
      });
      
      // Events should be in chronological order
      for (let i = 1; i < events.length; i++) {
        expect(events[i].timestamp).toBeGreaterThanOrEqual(events[i-1].timestamp);
      }
    });
  });

  describe('State Transition Validation', () => {
    test('should follow valid gait phase transitions', () => {
      const observations = createGaitSequence();
      const states: GaitPhase[] = [];
      
      observations.forEach(obs => {
        const result = detector.processObservation(obs);
        states.push(result.mostLikelyState);
      });
      
      // Check for invalid transitions
      const validTransitions = getValidTransitions();
      
      for (let i = 1; i < states.length; i++) {
        const currentState = states[i];
        const previousState = states[i-1];
        
        if (currentState !== previousState) {
          expect(validTransitions[previousState]).toContain(currentState);
        }
      }
    });

    test('should handle state persistence', () => {
      const stableObservations = createStableObservations(GaitPhase.MIDSTANCE);
      const states: GaitPhase[] = [];
      
      stableObservations.forEach(obs => {
        const result = detector.processObservation(obs);
        states.push(result.mostLikelyState);
      });
      
      // Should maintain stable state
      const stableCount = states.filter(s => s === GaitPhase.MIDSTANCE).length;
      expect(stableCount).toBeGreaterThan(states.length * 0.7);
    });
  });

  describe('Confidence Scoring', () => {
    test('should provide higher confidence for clear observations', () => {
      const clearObservation = createClearObservation(GaitPhase.HEEL_STRIKE);
      const noisyObservation = createNoisyObservation();
      
      const clearResult = detector.processObservation(clearObservation);
      const noisyResult = detector.processObservation(noisyObservation);
      
      expect(clearResult.probability).toBeGreaterThan(noisyResult.probability);
    });

    test('should adjust confidence based on observation quality', () => {
      const highQualityObs = createMockObservation(0.9);
      const lowQualityObs = createMockObservation(0.3);
      
      const highQualityResult = detector.processObservation(highQualityObs);
      const lowQualityResult = detector.processObservation(lowQualityObs);
      
      expect(highQualityResult.probability).toBeGreaterThan(lowQualityResult.probability);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing observations gracefully', () => {
      const invalidObservation = createInvalidObservation();
      
      expect(() => {
        detector.processObservation(invalidObservation);
      }).not.toThrow();
    });

    test('should handle extreme values', () => {
      const extremeObservation = createExtremeObservation();
      
      const result = detector.processObservation(extremeObservation);
      
      expect(result.probability).toBeGreaterThan(0);
      expect(result.probability).toBeLessThanOrEqual(1);
    });
  });

  // Helper functions
  function createMockObservation(confidence: number = 0.8): HMMObservation {
    return {
      timestamp: Date.now(),
      features: {
        ankleVelocity: 50 + Math.random() * 100,
        kneeFlexion: 10 + Math.random() * 50,
        hipFlexion: 5 + Math.random() * 30,
        verticalPosition: 300 + Math.random() * 50,
        confidence: confidence
      }
    };
  }

  function createGaitSequence(): HMMObservation[] {
    const observations: HMMObservation[] = [];
    const baseTime = Date.now();
    
    // Create a sequence representing a complete gait cycle
    for (let i = 0; i < 60; i++) {
      const phase = i / 60;
      const obs: HMMObservation = {
        timestamp: baseTime + i * 50,
        features: {
          ankleVelocity: Math.sin(phase * Math.PI * 2) * 100 + 50,
          kneeFlexion: Math.sin(phase * Math.PI * 2 + Math.PI/4) * 30 + 15,
          hipFlexion: Math.sin(phase * Math.PI * 2 + Math.PI/2) * 20 + 10,
          verticalPosition: 300 + Math.sin(phase * Math.PI * 2) * 20,
          confidence: 0.8 + Math.random() * 0.2
        }
      };
      observations.push(obs);
    }
    
    return observations;
  }

  function createHeelStrikeSequence(): HMMObservation[] {
    const observations: HMMObservation[] = [];
    const baseTime = Date.now();
    
    // Create sequence leading to heel strike
    for (let i = 0; i < 10; i++) {
      const obs: HMMObservation = {
        timestamp: baseTime + i * 50,
        features: {
          ankleVelocity: Math.max(0, 200 - i * 20), // Decreasing velocity
          kneeFlexion: 5 + i * 2, // Increasing flexion
          hipFlexion: 10 + i * 1,
          verticalPosition: 300 + i * 2, // Foot approaching ground
          confidence: 0.8
        }
      };
      observations.push(obs);
    }
    
    return observations;
  }

  function createToeOffSequence(): HMMObservation[] {
    const observations: HMMObservation[] = [];
    const baseTime = Date.now();
    
    // Create sequence leading to toe-off
    for (let i = 0; i < 10; i++) {
      const obs: HMMObservation = {
        timestamp: baseTime + i * 50,
        features: {
          ankleVelocity: i * 30, // Increasing velocity
          kneeFlexion: 5 + i * 5, // Increasing flexion
          hipFlexion: 10 + i * 3,
          verticalPosition: 300 - i * 5, // Foot lifting
          confidence: 0.8
        }
      };
      observations.push(obs);
    }
    
    return observations;
  }

  function createContinuousGaitData(count: number): HMMObservation[] {
    const observations: HMMObservation[] = [];
    const baseTime = Date.now();
    
    for (let i = 0; i < count; i++) {
      observations.push({
        timestamp: baseTime + i * 33, // 30 FPS
        features: {
          ankleVelocity: Math.random() * 200,
          kneeFlexion: Math.random() * 60,
          hipFlexion: Math.random() * 40,
          verticalPosition: 280 + Math.random() * 40,
          confidence: 0.6 + Math.random() * 0.3
        }
      });
    }
    
    return observations;
  }

  function createStableObservations(phase: GaitPhase): HMMObservation[] {
    const observations: HMMObservation[] = [];
    const baseTime = Date.now();
    
    // Create stable observations for midstance
    for (let i = 0; i < 20; i++) {
      const obs: HMMObservation = {
        timestamp: baseTime + i * 50,
        features: {
          ankleVelocity: 25 + Math.random() * 10, // Low velocity
          kneeFlexion: 5 + Math.random() * 5, // Minimal flexion
          hipFlexion: 8 + Math.random() * 4,
          verticalPosition: 320 + Math.random() * 5, // Stable position
          confidence: 0.8
        }
      };
      observations.push(obs);
    }
    
    return observations;
  }

  function createClearObservation(phase: GaitPhase): HMMObservation {
    const features = {
      [GaitPhase.HEEL_STRIKE]: {
        ankleVelocity: 10,
        kneeFlexion: 15,
        hipFlexion: 30,
        verticalPosition: 350,
        confidence: 0.9
      },
      [GaitPhase.PRE_SWING]: {
        ankleVelocity: 150,
        kneeFlexion: 60,
        hipFlexion: 40,
        verticalPosition: 280,
        confidence: 0.9
      }
    };
    
    return {
      timestamp: Date.now(),
      features: features[phase] || features[GaitPhase.HEEL_STRIKE]
    };
  }

  function createNoisyObservation(): HMMObservation {
    return {
      timestamp: Date.now(),
      features: {
        ankleVelocity: Math.random() * 300,
        kneeFlexion: Math.random() * 80,
        hipFlexion: Math.random() * 60,
        verticalPosition: 200 + Math.random() * 200,
        confidence: 0.3 + Math.random() * 0.4
      }
    };
  }

  function createInvalidObservation(): HMMObservation {
    return {
      timestamp: Date.now(),
      features: {
        ankleVelocity: NaN,
        kneeFlexion: -1,
        hipFlexion: Infinity,
        verticalPosition: 0,
        confidence: 0
      }
    };
  }

  function createExtremeObservation(): HMMObservation {
    return {
      timestamp: Date.now(),
      features: {
        ankleVelocity: 1000,
        kneeFlexion: 200,
        hipFlexion: 150,
        verticalPosition: 1000,
        confidence: 1.0
      }
    };
  }

  function getValidTransitions(): { [key in GaitPhase]: GaitPhase[] } {
    return {
      [GaitPhase.HEEL_STRIKE]: [GaitPhase.LOADING_RESPONSE, GaitPhase.HEEL_STRIKE],
      [GaitPhase.LOADING_RESPONSE]: [GaitPhase.MIDSTANCE, GaitPhase.LOADING_RESPONSE],
      [GaitPhase.MIDSTANCE]: [GaitPhase.TERMINAL_STANCE, GaitPhase.MIDSTANCE],
      [GaitPhase.TERMINAL_STANCE]: [GaitPhase.PRE_SWING, GaitPhase.TERMINAL_STANCE],
      [GaitPhase.PRE_SWING]: [GaitPhase.INITIAL_SWING, GaitPhase.PRE_SWING],
      [GaitPhase.INITIAL_SWING]: [GaitPhase.MIDSWING, GaitPhase.INITIAL_SWING],
      [GaitPhase.MIDSWING]: [GaitPhase.TERMINAL_SWING, GaitPhase.MIDSWING],
      [GaitPhase.TERMINAL_SWING]: [GaitPhase.HEEL_STRIKE, GaitPhase.TERMINAL_SWING]
    };
  }
});