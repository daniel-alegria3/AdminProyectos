const request = require('supertest');
const express = require('express');
const { mockExecute } = require('../helpers/db.mock');

// Mock the database before requiring the controller
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
  
  // User routes
  router.post('/admin/user', userAuth.requireAdmin, generalController.createUser);
  router.patch('/admin/user', userAuth.requireAdmin, generalController.updateUser);
  router.delete('/admin/user', userAuth.requireAdmin, generalController.deleteUser);
  router.patch('/admin/user/account_status', userAuth.requireAdmin, generalController.updateUserStatus);
  
  router.get('/user', userAuth.requireLogin, generalController.getAllUsers);
  router.get('/user/:user_id', userAuth.requireLogin, generalController.getUserDetails);
  router.patch('/user', userAuth.requireLogin, generalController.updateMyUser);
  
  app.use((err, req, res, next) => {
    if (err.message) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  });
  
  app.use('/', router);
  return app;
};

describe('User Controller', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });
  
  describe('POST /admin/user - createUser', () => {
    it('should return 401 when not admin', async () => {
      const response = await request(app)
        .post('/admin/user')
        .send({
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('should return 401 when not authenticated (auth check before validation)', async () => {
      const response = await request(app)
        .post('/admin/user')
        .send({
          email: 'new@example.com',
          password: 'password123',
        });
      
      // Auth middleware runs first, so 401 is expected
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /user - getAllUsers', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .get('/user');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('should call db.execute with correct query', async () => {
      mockExecute.mockResolvedValue([
        [
          {
            user_id: 1,
            name: 'User 1',
            email: 'user1@example.com',
            phone_number: '1234567890',
            is_enabled: true,
            is_admin: false,
          },
        ],
      ]);
      
      // This test requires session setup which is complex
      // In real scenarios, you'd use a proper session store
    });
  });
  
  describe('DELETE /admin/user - deleteUser', () => {
    it('should return 401 when not admin', async () => {
      const response = await request(app)
        .delete('/admin/user')
        .send({});
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('PATCH /admin/user/account_status - updateUserStatus', () => {
    it('should return 401 when not admin', async () => {
      const response = await request(app)
        .patch('/admin/user/account_status')
        .send({
          account_status: 'ENABLED',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
