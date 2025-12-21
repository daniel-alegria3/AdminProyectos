const request = require('supertest');
const express = require('express');
const userAuth = require('../../middlewares/userAuth');

// Setup test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  const router = express.Router();
  userAuth.init(router);
  
  router.post('/user/register', userAuth.register);
  router.post('/user/login', userAuth.login);
  router.post('/user/logout', userAuth.requireLogin, userAuth.logout);
  router.get('/user/is_admin', userAuth.requireLogin, userAuth.isAdmin);
  router.get('/user/is_logged_in', userAuth.isLoggedIn);
  
  app.use('/', router);
  return app;
};

describe('Authentication Routes', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });
  
  describe('POST /user/register', () => {
    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/user/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });
    
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/user/register')
        .send({
          name: 'Test User',
          password: 'password123',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/user/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /user/login', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/user/login')
        .send({
          password: 'password123',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email');
    });
    
    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/user/login')
        .send({
          email: 'test@example.com',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /user/is_logged_in', () => {
    it('should return success false when not logged in', async () => {
      const response = await request(app)
        .get('/user/is_logged_in');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /user/logout', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .post('/user/logout');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /user/is_admin', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app)
        .get('/user/is_admin');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
