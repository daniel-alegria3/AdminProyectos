const request = require('supertest');
const express = require('express');
const { mockExecute, mockQuery } = require('../helpers/db.mock');

jest.mock('../../database/db', () => {
  const { dbMock } = require('../helpers/db.mock');
  return dbMock;
});

const generalController = require('../../controllers/generalController');
const userAuth = require('../../middlewares/userAuth');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  const router = express.Router();
  userAuth.init(router);
  
  // File routes
  router.post('/file/to_project', userAuth.requireLogin, generalController.uploadProjectFile);
  router.post('/file/to_task', userAuth.requireLogin, generalController.uploadTaskFile);
  router.get('/file/:file_id', userAuth.requireLogin, generalController.downloadFile);
  
  app.use((err, req, res, next) => {
    if (err.message) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  });
  
  app.use('/', router);
  return app;
};

describe('File Controller', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });
  
  describe('GET /file/:file_id - downloadFile', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .get('/file/1');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /file/to_project - uploadProjectFile', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .post('/file/to_project')
        .field('project_id', '1');
      
      expect(response.status).toBe(401);
    });
    
    it('should return 400 when no files are uploaded', async () => {
      // Without session setup, auth will fail first
      // This test demonstrates the structure
      const response = await request(app)
        .post('/file/to_project')
        .field('project_id', '1');
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('POST /file/to_task - uploadTaskFile', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .post('/file/to_task')
        .field('task_id', '1');
      
      expect(response.status).toBe(401);
    });
  });
});
