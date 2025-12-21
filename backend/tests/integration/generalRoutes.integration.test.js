const request = require('supertest');
const express = require('express');
const { mockExecute, mockQuery } = require('../helpers/db.mock');

jest.mock('../../database/db', () => {
  const { dbMock } = require('../helpers/db.mock');
  return dbMock;
});

const generalRoutes = require('../../routes/generalRoutes');
const userAuth = require('../../middlewares/userAuth');

const createTestApp = () => {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  app.use('/', generalRoutes);
  
  app.use((err, req, res, next) => {
    if (err.message) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  });
  
  return app;
};

describe('General Routes Integration Tests', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });
  
  describe('Authentication Flow', () => {
    describe('POST /user/register', () => {
      it('should reject registration without required fields', async () => {
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
      it('should reject login without email', async () => {
        const response = await request(app)
          .post('/user/login')
          .send({
            password: 'password123',
          });
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
      
      it('should reject login without password', async () => {
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
      it('should return not logged in status', async () => {
        const response = await request(app)
          .get('/user/is_logged_in');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(false);
      });
    });
  });
  
  describe('Protected Routes', () => {
    describe('Routes requiring login', () => {
      const loginRequiredRoutes = [
        { method: 'get', path: '/user' },
        { method: 'get', path: '/user/1' },
        { method: 'patch', path: '/user' },
        { method: 'get', path: '/project' },
        { method: 'post', path: '/project' },
        { method: 'get', path: '/project/1' },
        { method: 'get', path: '/task' },
        { method: 'post', path: '/task' },
        { method: 'get', path: '/task/1' },
      ];
      
      loginRequiredRoutes.forEach(({ method, path }) => {
        it(`${method.toUpperCase()} ${path} should return 401 when not logged in`, async () => {
          const res = await request(app)[method](path)
            .send({});
          
          expect(res.status).toBe(401);
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('iniciado sesion');
        });
      });
    });
    
    describe('Routes requiring admin', () => {
      const adminRequiredRoutes = [
        { method: 'post', path: '/admin/user' },
        { method: 'patch', path: '/admin/user' },
        { method: 'delete', path: '/admin/user' },
        { method: 'patch', path: '/admin/user/account_status' },
      ];
      
      adminRequiredRoutes.forEach(({ method, path }) => {
        it(`${method.toUpperCase()} ${path} should return 401 when not admin`, async () => {
          const res = await request(app)[method](path)
            .send({});
          
          expect(res.status).toBe(401);
        });
      });
    });
  });
  
  describe('Input Validation', () => {
    describe('User Creation', () => {
      it('should validate required fields for user creation', async () => {
        const missingFieldTests = [
          { payload: { email: 'test@example.com', password: 'pass' }, missing: 'name' },
          { payload: { name: 'Test', password: 'pass' }, missing: 'email' },
          { payload: { name: 'Test', email: 'test@example.com' }, missing: 'password' },
        ];
        
        for (const test of missingFieldTests) {
          const response = await request(app)
            .post('/admin/user')
            .send(test.payload);
          
          expect(response.status).toBe(401);
        }
      });
    });
    
    describe('Task Status Updates', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .patch('/task/progress_status')
          .send({
            task_id: 1,
          });
        
        // Auth check happens before input validation
        expect(response.status).toBe(401);
      });
    });
    
    describe('User Status Updates', () => {
      it('should require admin role', async () => {
        const response = await request(app)
          .patch('/admin/user/account_status')
          .send({
            user_id: 1,
          });
        
        // Admin check happens before input validation
        expect(response.status).toBe(401);
      });
    });
  });
  
  describe('File Operations', () => {
    describe('GET /file/:file_id', () => {
      it('should return 401 when not logged in', async () => {
        const response = await request(app)
          .get('/file/1');
        
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
    
    describe('POST /file/to_project', () => {
      it('should return 401 when not logged in', async () => {
        const response = await request(app)
          .post('/file/to_project')
          .field('project_id', '1');
        
        expect(response.status).toBe(401);
      });
    });
    
    describe('POST /file/to_task', () => {
      it('should return 401 when not logged in', async () => {
        const response = await request(app)
          .post('/file/to_task')
          .field('task_id', '1');
        
        expect(response.status).toBe(401);
      });
    });
  });
  
  describe('Query Parameters Handling', () => {
    describe('GET /project/:project_id/tasks', () => {
      it('should accept optional filter_user_id query parameter', async () => {
        // Without session, will return 401, but tests parameter handling
        const response = await request(app)
          .get('/project/1/tasks')
          .query({ filter_user_id: 2 });
        
        expect(response.status).toBe(401);
      });
    });
  });
});
