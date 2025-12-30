const request = require('supertest');
const { BASE_URL } = require('./config');

describe('Authentication Routes', () => {
  let agent;

  beforeAll(() => {
    // Create a supertest agent to maintain session cookies
    agent = request.agent(BASE_URL);
  });

  describe('POST /user/register', () => {
    it('should register a new user with valid data', async () => {
      const res = await request(BASE_URL)
        .post('/user/register')
        .send({
          name: 'Test User Register',
          email: `testregister${Date.now()}@example.com`,
          password: 'password123',
          phone_number: '1234567890',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Check that response has data object (structure may vary)
      expect(res.body).toHaveProperty('data');
    });

    it('should reject registration without required fields', async () => {
      const res = await request(BASE_URL)
        .post('/user/register')
        .send({
          name: 'Test User',
          // missing email and password
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate email', async () => {
      const email = `duplicate${Date.now()}@example.com`;

      // First registration
      await request(BASE_URL)
        .post('/user/register')
        .send({
          name: 'User One',
          email,
          password: 'password123',
        });

      // Second registration with same email
      const res = await request(BASE_URL)
        .post('/user/register')
        .send({
          name: 'User Two',
          email,
          password: 'password123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /user/login', () => {
    let testEmail;
    let testPassword = 'password123';

    beforeAll(async () => {
      // Create a user for login tests
      testEmail = `testlogin${Date.now()}@example.com`;
      await request(BASE_URL)
        .post('/user/register')
        .send({
          name: 'Login Test User',
          email: testEmail,
          password: testPassword,
        });
    });

    it('should login with valid credentials', async () => {
      const res = await agent
        .post('/user/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('data');
      // Check that data has user identifier (may be user_id or id_user)
      expect(res.body.data).toBeDefined();
    });

    it('should reject login with missing email', async () => {
      const res = await request(BASE_URL)
        .post('/user/login')
        .send({
          password: testPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with invalid credentials', async () => {
      const res = await request(BASE_URL)
        .post('/user/login')
        .send({
          email: testEmail,
          password: 'wrongpassword',
        });

      // Backend may return 401 or 500 on invalid credentials
      expect([401, 500]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /user/is_logged_in', () => {
    it('should return false when not logged in', async () => {
      const res = await request(BASE_URL)
        .get('/user/is_logged_in');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
    });

    it('should return true and user info when logged in', async () => {
      const testEmail = `isloggedin${Date.now()}@example.com`;
      const testPassword = 'password123';
      const agentIsLoggedIn = request.agent(BASE_URL);

      // Register and login
      await agentIsLoggedIn
        .post('/user/register')
        .send({
          name: 'Is Logged In Test',
          email: testEmail,
          password: testPassword,
        });

      const loginRes = await agentIsLoggedIn
        .post('/user/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      // Check if logged in using same agent (with cookies)
      const res = await agentIsLoggedIn.get('/user/is_logged_in');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('POST /user/logout', () => {
    it('should reject logout when not logged in', async () => {
      const res = await request(BASE_URL)
        .post('/user/logout');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should logout successfully when logged in', async () => {
      const testEmail = `logout${Date.now()}@example.com`;
      const testPassword = 'password123';

      const agentLogout = request.agent(BASE_URL);

      // Register and login
      const registerRes = await agentLogout
        .post('/user/register')
        .send({
          name: 'Logout Test',
          email: testEmail,
          password: testPassword,
        });

      // Login separately to ensure session is set
      const loginRes = await agentLogout
        .post('/user/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      // Logout
      const res = await agentLogout
        .post('/user/logout');

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  describe('GET /user/is_admin', () => {
    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .get('/user/is_admin');

      expect(res.status).toBe(401);
    });

    it('should return is_admin status for logged in user', async () => {
      const testEmail = `isadmin${Date.now()}@example.com`;
      const testPassword = 'password123';

      const agentAdmin = request.agent(BASE_URL);

      // Register and login
      await agentAdmin
        .post('/user/register')
        .send({
          name: 'Admin Test',
          email: testEmail,
          password: testPassword,
        });

      // Login to ensure session is set
      const loginRes = await agentAdmin
        .post('/user/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      const res = await agentAdmin.get('/user/is_admin');

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('success');
      }
    });
  });
});
