const express = require('express');

// Create a test app with minimal setup
const createTestApp = (router) => {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    if (err.message) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  });
  
  // Mount router
  app.use('/', router);
  
  return app;
};

module.exports = { createTestApp };
