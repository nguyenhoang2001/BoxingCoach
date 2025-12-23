import './commands';

// Cypress E2E support file
// This file is processed and loaded automatically before test files.

// Global configuration
Cypress.config('defaultCommandTimeout', 10000);
Cypress.config('requestTimeout', 10000);
Cypress.config('responseTimeout', 10000);

// Custom error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing the test on uncaught exceptions
  // that are expected in the application (e.g., TensorFlow.js warnings)
  if (err.message.includes('TensorFlow.js')) {
    return false;
  }
  if (err.message.includes('WebGL')) {
    return false;
  }
  if (err.message.includes('MediaDevices')) {
    return false;
  }
  // Return true to fail the test for unexpected errors
  return true;
});

// Global test setup
beforeEach(() => {
  // Mock performance.now() for consistent timestamps
  cy.window().then((win) => {
    let startTime = Date.now();
    cy.stub(win.performance, 'now').callsFake(() => {
      return Date.now() - startTime;
    });
  });

  // Mock requestAnimationFrame for consistent timing
  cy.window().then((win) => {
    let frameId = 0;
    cy.stub(win, 'requestAnimationFrame').callsFake((callback) => {
      return setTimeout(() => {
        callback(Date.now());
      }, 16);
    });
    
    cy.stub(win, 'cancelAnimationFrame').callsFake((id) => {
      clearTimeout(id);
    });
  });
});

// Global test cleanup
afterEach(() => {
  // Clean up any running timers
  cy.window().then((win) => {
    // Clear any remaining intervals or timeouts
    for (let i = 1; i < 99999; i++) {
      win.clearInterval(i);
      win.clearTimeout(i);
    }
  });
});