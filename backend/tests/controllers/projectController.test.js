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
  
  // Project routes
  router.post('/project', userAuth.requireLogin, generalController.createProject);
  router.patch('/project', userAuth.requireLogin, generalController.updateProject);
  router.post('/project/assign', userAuth.requireLogin, generalController.assignUserToProject);
  router.patch('/project/assign', userAuth.requireLogin, generalController.assignUserToProject);
  
  router.get('/project', userAuth.requireLogin, generalController.getAllProjects);
  router.get('/project/mine', userAuth.requireLogin, generalController.getAllMyProjects);
  router.get('/project/:project_id', userAuth.requireLogin, generalController.getProjectDetails);
  
  router.get('/project/:project_id/tasks', userAuth.requireLogin, generalController.getProjectTasks);
  router.get('/project/:project_id/tasks/mine', userAuth.requireLogin, generalController.getMyProjectTasks);
  
  app.use((err, req, res, next) => {
    if (err.message) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  });
  
  app.use('/', router);
  return app;
};

describe('Project Controller', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });
  
  describe('POST /project - createProject', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .post('/project')
        .send({
          title: 'New Project',
          description: 'Project description',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /project - getAllProjects', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .get('/project');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /project/mine - getAllMyProjects', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .get('/project/mine');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /project/:project_id - getProjectDetails', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .get('/project/1');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /project/:project_id/tasks - getProjectTasks', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .get('/project/1/tasks');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /project/:project_id/tasks/mine - getMyProjectTasks', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .get('/project/1/tasks/mine');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /project/assign - assignUserToProject', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .post('/project/assign')
        .send({
          project_id: 1,
          user_id: 2,
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('PATCH /project/assign - assignUserToProject', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .patch('/project/assign')
        .send({
          project_id: 1,
          user_id: 2,
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
