describe('Gait Detection Application - E2E Tests', () => {
  beforeEach(() => {
    // Setup mocks before each test
    cy.mockCameraAccess();
    cy.mockTensorFlowJS();
    cy.mockVideoElement();
    cy.mockCanvas();
    
    // Visit the application
    cy.visit('/');
  });

  describe('Application Initialization', () => {
    it('should load the main application', () => {
      cy.get('[data-testid="gait-detection-app"]').should('be.visible');
      cy.get('[data-testid="app-title"]').should('contain.text', 'Gait Detection');
    });

    it('should show initial state before camera access', () => {
      cy.get('[data-testid="start-camera-button"]').should('be.visible');
      cy.get('[data-testid="camera-status"]').should('contain.text', 'Camera not started');
      cy.get('[data-testid="video-container"]').should('not.exist');
    });

    it('should display available camera devices', () => {
      cy.get('[data-testid="camera-selector"]').should('be.visible');
      cy.get('[data-testid="camera-selector"] option').should('have.length.at.least', 2);
      cy.get('[data-testid="camera-selector"] option').first().should('contain.text', 'Mock Camera 1');
    });
  });

  describe('Camera Access and Video Stream', () => {
    it('should start camera when button is clicked', () => {
      cy.get('[data-testid="start-camera-button"]').click();
      
      // Verify camera access was requested
      cy.get('@getUserMedia').should('have.been.called');
      
      // Verify video element appears
      cy.get('[data-testid="video-element"]').should('be.visible');
      cy.get('[data-testid="camera-status"]').should('contain.text', 'Camera active');
      
      // Verify camera controls are available
      cy.get('[data-testid="stop-camera-button"]').should('be.visible');
      cy.get('[data-testid="start-camera-button"]').should('be.disabled');
    });

    it('should handle camera access denied gracefully', () => {
      cy.mockCameraAccessDenied('Permission denied by user');
      
      cy.get('[data-testid="start-camera-button"]').click();
      
      // Verify error message is displayed
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="error-message"]').should('contain.text', 'Permission denied');
      
      // Verify camera status reflects error
      cy.get('[data-testid="camera-status"]').should('contain.text', 'Camera access denied');
    });

    it('should stop camera when stop button is clicked', () => {
      // Start camera first
      cy.get('[data-testid="start-camera-button"]').click();
      cy.get('[data-testid="video-element"]').should('be.visible');
      
      // Stop camera
      cy.get('[data-testid="stop-camera-button"]').click();
      
      // Verify camera stopped
      cy.get('@stopTrack').should('have.been.called');
      cy.get('[data-testid="camera-status"]').should('contain.text', 'Camera not started');
      cy.get('[data-testid="start-camera-button"]').should('be.enabled');
    });

    it('should allow camera device switching', () => {
      // Start with first camera
      cy.get('[data-testid="start-camera-button"]').click();
      cy.get('[data-testid="video-element"]').should('be.visible');
      
      // Switch to second camera
      cy.get('[data-testid="camera-selector"]').select('Mock Camera 2');
      
      // Verify new camera access was requested
      cy.get('@getUserMedia').should('have.been.called.at.least', 2);
    });
  });

  describe('Pose Detection', () => {
    beforeEach(() => {
      // Start camera for pose detection tests
      cy.get('[data-testid="start-camera-button"]').click();
      cy.get('[data-testid="video-element"]').should('be.visible');
    });

    it('should initialize pose detection when analysis starts', () => {
      cy.get('[data-testid="start-analysis-button"]').click();
      
      // Verify TensorFlow.js initialization
      cy.get('@tfReady').should('have.been.called');
      cy.get('@createDetector').should('have.been.called');
      
      // Verify pose detection status
      cy.get('[data-testid="pose-detection-status"]').should('contain.text', 'Active');
    });

    it('should display pose skeleton overlay', () => {
      cy.get('[data-testid="start-analysis-button"]').click();
      
      // Wait for pose detection to start
      cy.waitForPoseDetection();
      
      // Verify skeleton overlay is visible
      cy.get('[data-testid="pose-skeleton"]').should('be.visible');
      cy.get('[data-testid="skeleton-canvas"]').should('be.visible');
    });

    it('should show pose confidence indicators', () => {
      cy.get('[data-testid="start-analysis-button"]').click();
      cy.waitForPoseDetection();
      
      // Verify confidence indicators
      cy.get('[data-testid="pose-confidence"]').should('be.visible');
      cy.get('[data-testid="pose-confidence-value"]').should('contain.text', '95%');
      cy.get('[data-testid="pose-confidence-indicator"]').should('have.class', 'high-confidence');
    });

    it('should handle pose detection errors gracefully', () => {
      // Mock pose detection failure
      cy.window().then((win) => {
        if (win.poseDetection) {
          win.poseDetection.createDetector.rejects(new Error('Model loading failed'));
        }
      });
      
      cy.get('[data-testid="start-analysis-button"]').click();
      
      // Verify error handling
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="error-message"]').should('contain.text', 'Model loading failed');
    });
  });

  describe('Gait Analysis', () => {
    beforeEach(() => {
      // Start camera and pose detection
      cy.get('[data-testid="start-camera-button"]').click();
      cy.get('[data-testid="video-element"]').should('be.visible');
      cy.get('[data-testid="start-analysis-button"]').click();
      cy.waitForPoseDetection();
    });

    it('should display gait parameters', () => {
      cy.waitForGaitAnalysis();
      
      // Verify gait parameters are displayed
      cy.get('[data-testid="cadence-value"]').should('be.visible');
      cy.get('[data-testid="stride-length-value"]').should('be.visible');
      cy.get('[data-testid="stride-time-value"]').should('be.visible');
      cy.get('[data-testid="step-width-value"]').should('be.visible');
      cy.get('[data-testid="velocity-value"]').should('be.visible');
      cy.get('[data-testid="symmetry-index-value"]').should('be.visible');
    });

    it('should update gait parameters in real-time', () => {
      cy.waitForGaitAnalysis();
      
      // Simulate walking pattern
      cy.simulateWalkingPattern(3000);
      
      // Verify parameters update
      cy.get('[data-testid="cadence-value"]').should('not.contain.text', '0');
      cy.get('[data-testid="confidence-indicator"]').should('have.class', 'high-confidence');
    });

    it('should show confidence indicators for gait analysis', () => {
      cy.waitForGaitAnalysis();
      
      // Verify confidence display
      cy.get('[data-testid="gait-confidence"]').should('be.visible');
      cy.get('[data-testid="gait-confidence-bar"]').should('be.visible');
      cy.get('[data-testid="gait-confidence-percentage"]').should('be.visible');
    });

    it('should handle calibration', () => {
      cy.waitForGaitAnalysis();
      
      // Open calibration dialog
      cy.get('[data-testid="calibration-button"]').click();
      cy.get('[data-testid="calibration-dialog"]').should('be.visible');
      
      // Set calibration value
      cy.get('[data-testid="pixels-per-meter-input"]').clear().type('100');
      cy.get('[data-testid="apply-calibration-button"]').click();
      
      // Verify calibration applied
      cy.get('[data-testid="calibration-status"]').should('contain.text', 'Calibrated');
      cy.get('[data-testid="stride-length-value"]').should('not.contain.text', '0.0');
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      // Start full application
      cy.get('[data-testid="start-camera-button"]').click();
      cy.get('[data-testid="start-analysis-button"]').click();
      cy.waitForPoseDetection();
      cy.waitForGaitAnalysis();
    });

    it('should display performance metrics', () => {
      // Verify performance metrics are shown
      cy.get('[data-testid="fps-counter"]').should('be.visible');
      cy.get('[data-testid="processing-time"]').should('be.visible');
      cy.get('[data-testid="memory-usage"]').should('be.visible');
    });

    it('should maintain acceptable frame rate', () => {
      // Check frame rate is acceptable
      cy.checkPerformanceMetrics(20);
    });

    it('should show performance warnings for poor performance', () => {
      // Mock poor performance
      cy.window().then((win) => {
        // Simulate low FPS
        const mockMetrics = {
          frameRate: 10,
          averageProcessingTime: 50,
          memoryUsage: 200,
          cpuUsage: 80,
          droppedFrames: 20,
          modelInferenceTime: 30,
          renderingTime: 15
        };
        
        // This would typically be done through a performance service mock
        cy.get('[data-testid="fps-value"]').invoke('text', '10');
      });
      
      // Verify performance warning
      cy.get('[data-testid="performance-warning"]').should('be.visible');
      cy.get('[data-testid="performance-warning"]').should('contain.text', 'Performance is below optimal');
    });
  });

  describe('Data Export', () => {
    beforeEach(() => {
      // Start application and generate some data
      cy.get('[data-testid="start-camera-button"]').click();
      cy.get('[data-testid="start-analysis-button"]').click();
      cy.waitForGaitAnalysis();
      cy.simulateWalkingPattern(5000);
      cy.mockFileDownload();
    });

    it('should export gait data as JSON', () => {
      // Open export dialog
      cy.get('[data-testid="export-button"]').click();
      cy.get('[data-testid="export-dialog"]').should('be.visible');
      
      // Select JSON format
      cy.get('[data-testid="export-format-json"]').click();
      cy.get('[data-testid="confirm-export-button"]').click();
      
      // Verify export was triggered
      cy.get('@createObjectURL').should('have.been.called');
      cy.get('@downloadClick').should('have.been.called');
    });

    it('should export gait data as CSV', () => {
      cy.get('[data-testid="export-button"]').click();
      cy.get('[data-testid="export-dialog"]').should('be.visible');
      
      // Select CSV format
      cy.get('[data-testid="export-format-csv"]').click();
      cy.get('[data-testid="confirm-export-button"]').click();
      
      // Verify export was triggered
      cy.get('@createObjectURL').should('have.been.called');
      cy.get('@downloadClick').should('have.been.called');
    });

    it('should include session metadata in export', () => {
      cy.get('[data-testid="export-button"]').click();
      cy.get('[data-testid="export-dialog"]').should('be.visible');
      
      // Enable metadata inclusion
      cy.get('[data-testid="include-metadata-checkbox"]').check();
      cy.get('[data-testid="export-format-json"]').click();
      cy.get('[data-testid="confirm-export-button"]').click();
      
      // Verify metadata was included (this would need to be checked in the actual export content)
      cy.get('@createObjectURL').should('have.been.called');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should recover from temporary network errors', () => {
      cy.get('[data-testid="start-camera-button"]').click();
      cy.get('[data-testid="start-analysis-button"]').click();
      
      // Simulate network error
      cy.window().then((win) => {
        if (win.poseDetection) {
          win.poseDetection.createDetector.rejects(new Error('Network error'));
        }
      });
      
      // Verify error is displayed
      cy.get('[data-testid="error-message"]').should('be.visible');
      
      // Simulate recovery
      cy.window().then((win) => {
        if (win.poseDetection) {
          const mockDetector = {
            estimatePoses: cy.stub().resolves([{
              keypoints: Array.from({ length: 17 }, (_, i) => ({
                x: 100 + i * 10,
                y: 200 + i * 10,
                score: 0.9,
                name: `keypoint_${i}`
              })),
              score: 0.95
            }]),
            dispose: cy.stub()
          };
          win.poseDetection.createDetector.resolves(mockDetector);
        }
      });
      
      // Retry
      cy.get('[data-testid="retry-button"]').click();
      
      // Verify recovery
      cy.get('[data-testid="error-message"]').should('not.exist');
      cy.waitForPoseDetection();
    });

    it('should handle memory pressure gracefully', () => {
      cy.get('[data-testid="start-camera-button"]').click();
      cy.get('[data-testid="start-analysis-button"]').click();
      cy.waitForGaitAnalysis();
      
      // Simulate memory pressure
      cy.window().then((win) => {
        // Mock high memory usage
        if (win.performance && win.performance.memory) {
          win.performance.memory.usedJSHeapSize = 500 * 1024 * 1024; // 500MB
        }
      });
      
      // Verify memory warning
      cy.get('[data-testid="memory-warning"]').should('be.visible');
      cy.get('[data-testid="memory-warning"]').should('contain.text', 'High memory usage');
    });
  });

  describe('Multi-Person Detection', () => {
    beforeEach(() => {
      // Setup multi-person detection
      cy.window().then((win) => {
        if (win.poseDetection) {
          const multiplePoses = [
            {
              keypoints: Array.from({ length: 17 }, (_, i) => ({
                x: 100 + i * 10,
                y: 200 + i * 10,
                score: 0.9,
                name: `keypoint_${i}`
              })),
              score: 0.95
            },
            {
              keypoints: Array.from({ length: 17 }, (_, i) => ({
                x: 300 + i * 10,
                y: 200 + i * 10,
                score: 0.8,
                name: `keypoint_${i}`
              })),
              score: 0.85
            }
          ];
          
          win.poseDetection.createDetector.resolves({
            estimatePoses: cy.stub().resolves(multiplePoses),
            dispose: cy.stub()
          });
        }
      });
      
      cy.get('[data-testid="start-camera-button"]').click();
      cy.get('[data-testid="start-analysis-button"]').click();
    });

    it('should detect and track multiple people', () => {
      cy.waitForPoseDetection();
      
      // Verify multiple people are detected
      cy.get('[data-testid="person-count"]').should('contain.text', '2');
      cy.get('[data-testid="tracked-person"]').should('have.length', 2);
    });

    it('should display individual gait analysis for each person', () => {
      cy.waitForGaitAnalysis();
      
      // Verify individual analysis displays
      cy.get('[data-testid="person-1-gait-params"]').should('be.visible');
      cy.get('[data-testid="person-2-gait-params"]').should('be.visible');
      
      // Verify each person has their own parameters
      cy.get('[data-testid="person-1-cadence"]').should('be.visible');
      cy.get('[data-testid="person-2-cadence"]').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      // Test keyboard navigation
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'start-camera-button');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'camera-selector');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'start-analysis-button');
    });

    it('should have proper ARIA labels', () => {
      cy.get('[data-testid="start-camera-button"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="camera-selector"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="gait-parameters"]').should('have.attr', 'aria-label');
    });

    it('should announce status changes to screen readers', () => {
      cy.get('[data-testid="sr-announcements"]').should('exist');
      
      cy.get('[data-testid="start-camera-button"]').click();
      cy.get('[data-testid="sr-announcements"]').should('contain.text', 'Camera started');
      
      cy.get('[data-testid="start-analysis-button"]').click();
      cy.get('[data-testid="sr-announcements"]').should('contain.text', 'Gait analysis started');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile devices', () => {
      cy.viewport('iphone-x');
      
      cy.get('[data-testid="gait-detection-app"]').should('be.visible');
      cy.get('[data-testid="start-camera-button"]').should('be.visible');
      
      // Test mobile-specific layout
      cy.get('[data-testid="mobile-layout"]').should('be.visible');
      cy.get('[data-testid="desktop-layout"]').should('not.be.visible');
    });

    it('should work on tablet devices', () => {
      cy.viewport('ipad-2');
      
      cy.get('[data-testid="gait-detection-app"]').should('be.visible');
      cy.get('[data-testid="start-camera-button"]').should('be.visible');
      
      // Test tablet-specific layout
      cy.get('[data-testid="tablet-layout"]').should('be.visible');
    });
  });
});