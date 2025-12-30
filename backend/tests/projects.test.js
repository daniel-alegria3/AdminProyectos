const request = require('supertest');
const { BASE_URL } = require('./config');

describe('Project Routes', () => {
  let userAgent1;
  let userAgent2;
  let userId1;
  let userId2;
  let projectId;

  beforeAll(async () => {
    // Create first user
    userAgent1 = request.agent(BASE_URL);
    const userEmail1 = `projectuser1${Date.now()}@example.com`;

    await userAgent1
      .post('/user/register')
      .send({
        name: 'Project User 1',
        email: userEmail1,
        password: 'password123',
      });

    const loginRes1 = await userAgent1
      .post('/user/login')
      .send({
        email: userEmail1,
        password: 'password123',
      });

    userId1 = loginRes1.body.data.user_id;

    // Create second user
    userAgent2 = request.agent(BASE_URL);
    const userEmail2 = `projectuser2${Date.now()}@example.com`;

    await userAgent2
      .post('/user/register')
      .send({
        name: 'Project User 2',
        email: userEmail2,
        password: 'password123',
      });

    const loginRes2 = await userAgent2
      .post('/user/login')
      .send({
        email: userEmail2,
        password: 'password123',
      });

    userId2 = loginRes2.body.data.user_id;
  });

  describe('POST /project', () => {
    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .post('/project')
        .send({
          title: 'New Project',
          description: 'Test project',
        });

      expect(res.status).toBe(401);
    });

    it('should create a project when logged in', async () => {
      const res = await userAgent1
        .post('/project')
        .send({
          title: `Test Project ${Date.now()}`,
          description: 'A test project',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
        });

      // Accept 200 or 201 as creation success
      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      projectId = res.body.data.id_project || res.body.data.idProject;
    });

    it('should require project title', async () => {
      const res = await userAgent1
        .post('/project')
        .send({
          description: 'No title project',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /project', () => {
    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .get('/project');

      expect(res.status).toBe(401);
    });

    it('should return all projects', async () => {
      const res = await userAgent1
        .get('/project');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /project/mine', () => {
    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .get('/project/mine');

      expect(res.status).toBe(401);
    });

    it('should return only user projects', async () => {
      const res = await userAgent1
        .get('/project/mine');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /project/:project_id', () => {
    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .get(`/project/${projectId}`);

      expect(res.status).toBe(401);
    });

    it('should return project details', async () => {
      if (!projectId) return;

      const res = await userAgent1
        .get(`/project/${projectId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should reject request for non-existent project', async () => {
      const res = await userAgent1
        .get('/project/99999');

      // Accept 404 or 409 as invalid project
      expect([404, 409]).toContain(res.status);
    });
  });

  describe('PATCH /project', () => {
    let testProjectId;

    beforeAll(async () => {
      const createRes = await userAgent1
        .post('/project')
        .send({
          title: `Patch Test Project ${Date.now()}`,
          description: 'Test patch',
        });

      testProjectId = createRes.body.data.id_project;
    });

    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .patch('/project')
        .send({
          project_id: testProjectId,
          title: 'Updated Title',
        });

      expect(res.status).toBe(401);
    });

    it('should update project', async () => {
      if (!testProjectId) return;

      const res = await userAgent1
        .patch('/project')
        .send({
          project_id: testProjectId,
          title: 'Updated Project Title',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /project/assign', () => {
    let assignTestProjectId;

    beforeAll(async () => {
      const createRes = await userAgent1
        .post('/project')
        .send({
          title: `Assign Test Project ${Date.now()}`,
          description: 'Test assignment',
        });

      assignTestProjectId = createRes.body.data.id_project;
    });

    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .post('/project/assign')
        .send({
          project_id: assignTestProjectId,
          user_id: userId2,
          role: 'MEMBER',
        });

      expect(res.status).toBe(401);
    });

    it('should assign user to project', async () => {
      if (!assignTestProjectId) return;

      const res = await userAgent1
        .post('/project/assign')
        .send({
          project_id: assignTestProjectId,
          user_id: userId2,
          role: 'MEMBER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject without user_id', async () => {
      if (!assignTestProjectId) return;

      const res = await userAgent1
        .post('/project/assign')
        .send({
          project_id: assignTestProjectId,
          role: 'MEMBER',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /project/assign', () => {
    let assignPatchProjectId;

    beforeAll(async () => {
      const createRes = await userAgent1
        .post('/project')
        .send({
          title: `Assign Patch Test ${Date.now()}`,
        });

      assignPatchProjectId = createRes.body.data.id_project;

      // Assign user first
      await userAgent1
        .post('/project/assign')
        .send({
          project_id: assignPatchProjectId,
          user_id: userId2,
          role: 'MEMBER',
        });
    });

    it('should update user role in project', async () => {
      if (!assignPatchProjectId) return;

      const res = await userAgent1
        .patch('/project/assign')
        .send({
          project_id: assignPatchProjectId,
          user_id: userId2,
          role: 'LEAD',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /project/assign', () => {
    let unassignProjectId;

    beforeAll(async () => {
      const createRes = await userAgent1
        .post('/project')
        .send({
          title: `Unassign Test ${Date.now()}`,
        });

      unassignProjectId = createRes.body.data.id_project;

      await userAgent1
        .post('/project/assign')
        .send({
          project_id: unassignProjectId,
          user_id: userId2,
          role: 'MEMBER',
        });
    });

    it('should unassign user from project', async () => {
      if (!unassignProjectId) return;

      const res = await userAgent1
        .delete('/project/assign')
        .send({
          project_id: unassignProjectId,
          user_id: userId2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /project/:project_id', () => {
    let deleteProjectId;

    beforeAll(async () => {
      const createRes = await userAgent1
        .post('/project')
        .send({
          title: `Delete Test Project ${Date.now()}`,
        });

      deleteProjectId = createRes.body.data.id_project;
    });

    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .delete(`/project/${deleteProjectId}`);

      expect(res.status).toBe(401);
    });

    it('should delete project', async () => {
      if (!deleteProjectId) return;

      const res = await userAgent1
        .delete(`/project/${deleteProjectId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /project/:project_id/tasks', () => {
    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .get(`/project/${projectId}/tasks`);

      expect(res.status).toBe(401);
    });

    it('should return project tasks', async () => {
      if (!projectId) return;

      const res = await userAgent1
        .get(`/project/${projectId}/tasks`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /project/:project_id/tasks/mine', () => {
    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .get(`/project/${projectId}/tasks/mine`);

      expect(res.status).toBe(401);
    });

    it('should return user tasks in project', async () => {
      if (!projectId) return;

      const res = await userAgent1
        .get(`/project/${projectId}/tasks/mine`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
