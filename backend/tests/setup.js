// Jest setup file
// Global test configuration and hooks

// Increase timeout for integration tests
jest.setTimeout(30000);

// Optional: Add global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
