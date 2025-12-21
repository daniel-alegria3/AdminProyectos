const request = require('supertest');
const express = require('express');
const { mockExecute } = require('../helpers/db.mock');

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
  
  // Task routes
  router.post('/task', userAuth.requireLogin, generalController.createTask);
  router.post('/task/assign', userAuth.requireLogin, generalController.assignUserToTask);
  router.patch('/task/assign', userAuth.requireLogin, generalController.assignUserToTask);
  router.patch('/task/progress_status', userAuth.requireLogin, generalController.updateTaskStatus);
  
  router.get('/task', userAuth.requireLogin, generalController.getUserTasks);
  router.get('/task/:task_id', userAuth.requireLogin, generalController.getTaskDetails);
  
  app.use((err, req, res, next) => {
    if (err.message) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  });
  
  app.use('/', router);
  return app;
};

describe('Task Controller', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });
  
  describe('POST /task - createTask', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .post('/task')
        .send({
          project_id: 1,
          title: 'New Task',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /task - getUserTasks', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .get('/task');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /task/:task_id - getTaskDetails', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .get('/task/1');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('PATCH /task/progress_status - updateTaskStatus', () => {
    it('should return 401 when not logged in', async () => {
      // Auth check happens before input validation
      const response = await request(app)
        .patch('/task/progress_status')
        .send({
          task_id: 1,
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /task/assign - assignUserToTask', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .post('/task/assign')
        .send({
          task_id: 1,
          user_id: 2,
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('PATCH /task/assign - assignUserToTask', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .patch('/task/assign')
        .send({
          task_id: 1,
          user_id: 2,
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
