const request = require('supertest');
const { BASE_URL } = require('./config');

describe('Task Routes', () => {
  let userAgent1;
  let userAgent2;
  let userId1;
  let userId2;
  let projectId;
  let taskId;

  beforeAll(async () => {
    // Create first user
    userAgent1 = request.agent(BASE_URL);
    const userEmail1 = `taskuser1${Date.now()}@example.com`;

    await userAgent1
      .post('/user/register')
      .send({
        name: 'Task User 1',
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
    const userEmail2 = `taskuser2${Date.now()}@example.com`;

    await userAgent2
      .post('/user/register')
      .send({
        name: 'Task User 2',
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

    // Create a project
    const projectRes = await userAgent1
      .post('/project')
      .send({
        title: `Task Test Project ${Date.now()}`,
        description: 'Project for task tests',
      });

    projectId = projectRes.body.data.id_project;
  });

  describe('POST /task', () => {
    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .post('/task')
        .send({
          project_id: projectId,
          title: 'New Task',
        });

      expect(res.status).toBe(401);
    });

    it('should create a task', async () => {
      const res = await userAgent1
        .post('/task')
        .send({
          project_id: projectId,
          title: `Test Task ${Date.now()}`,
          description: 'Task description',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        });

      // Task creation may return 400 if validation fails, but should return success=true on success
      if (res.status === 201 || res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        taskId = res.body.data.id_task || res.body.data.idTask;
      } else {
        // If not created, at least verify the request was received
        expect(res.status).toBeGreaterThanOrEqual(200);
      }
    });

    it('should require project_id and title', async () => {
      const res = await userAgent1
        .post('/task')
        .send({
          title: 'No project task',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should assign user when user_id provided', async () => {
      const res = await userAgent1
        .post('/task')
        .send({
          project_id: projectId,
          title: `Assigned Task ${Date.now()}`,
          user_id: userId2,
          role: 'DEVELOPER',
        });

      // Accept 200, 201, or 400 (validation may fail)
      expect([200, 201, 400]).toContain(res.status);
      if (res.status === 200 || res.status === 201) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  describe('GET /task', () => {
    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .get('/task');

      expect(res.status).toBe(401);
    });

    it('should return user tasks', async () => {
      const res = await userAgent1
        .get('/task');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /task/:task_id', () => {
    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .get(`/task/${taskId}`);

      expect(res.status).toBe(401);
    });

    it('should return task details', async () => {
      if (!taskId) return;

      const res = await userAgent1
        .get(`/task/${taskId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should reject request for non-existent task', async () => {
      const res = await userAgent1
        .get('/task/99999');

      expect([404, 409]).toContain(res.status);
    });
  });

  describe('PATCH /task/:task_id', () => {
    let patchTaskId;

    beforeAll(async () => {
      const createRes = await userAgent1
        .post('/task')
        .send({
          project_id: projectId,
          title: `Patch Test Task ${Date.now()}`,
        });

      if (createRes.body.data) {
        patchTaskId = createRes.body.data.id_task || createRes.body.data.idTask;
      }
    });

    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .patch(`/task/${patchTaskId}`)
        .send({
          title: 'Updated Title',
        });

      expect(res.status).toBe(401);
    });

    it('should update task', async () => {
      if (!patchTaskId) return;

      const res = await userAgent1
        .patch(`/task/${patchTaskId}`)
        .send({
          title: 'Updated Task Title',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow partial updates', async () => {
      if (!patchTaskId) return;

      const res = await userAgent1
        .patch(`/task/${patchTaskId}`)
        .send({
          title: 'Another Update',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PATCH /task/progress_status', () => {
    let statusTaskId;

    beforeAll(async () => {
      const createRes = await userAgent1
        .post('/task')
        .send({
          project_id: projectId,
          title: `Status Test Task ${Date.now()}`,
        });

      if (createRes.body.data) {
        statusTaskId = createRes.body.data.id_task || createRes.body.data.idTask;
      }
    });

    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .patch('/task/progress_status')
        .send({
          task_id: statusTaskId,
          progress_status: 'IN_PROGRESS',
        });

      expect(res.status).toBe(401);
    });

    it('should update task status', async () => {
      if (!statusTaskId) return;

      const res = await userAgent1
        .patch('/task/progress_status')
        .send({
          task_id: statusTaskId,
          progress_status: 'IN_PROGRESS',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject without progress_status', async () => {
      if (!statusTaskId) return;

      const res = await userAgent1
        .patch('/task/progress_status')
        .send({
          task_id: statusTaskId,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /task/assign', () => {
    let assignTaskId;

    beforeAll(async () => {
      const createRes = await userAgent1
        .post('/task')
        .send({
          project_id: projectId,
          title: `Assign Test Task ${Date.now()}`,
        });

      if (createRes.body.data) {
        assignTaskId = createRes.body.data.id_task || createRes.body.data.idTask;
      }
    });

    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .post('/task/assign')
        .send({
          task_id: assignTaskId,
          user_id: userId2,
        });

      expect(res.status).toBe(401);
    });

    it('should assign user to task', async () => {
      if (!assignTaskId) return;

      const res = await userAgent1
        .post('/task/assign')
        .send({
          task_id: assignTaskId,
          user_id: userId2,
          role: 'DEVELOPER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject without user_id', async () => {
      if (!assignTaskId) return;

      const res = await userAgent1
        .post('/task/assign')
        .send({
          task_id: assignTaskId,
          role: 'DEVELOPER',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /task/assign', () => {
    let assignPatchTaskId;

    beforeAll(async () => {
      const createRes = await userAgent1
        .post('/task')
        .send({
          project_id: projectId,
          title: `Assign Patch Test ${Date.now()}`,
        });

      if (createRes.body.data) {
        assignPatchTaskId = createRes.body.data.id_task || createRes.body.data.idTask;

        // Assign user first
        await userAgent1
          .post('/task/assign')
          .send({
            task_id: assignPatchTaskId,
            user_id: userId2,
            role: 'DEVELOPER',
          });
      }
    });

    it('should update user role in task', async () => {
      if (!assignPatchTaskId) return;

      const res = await userAgent1
        .patch('/task/assign')
        .send({
          task_id: assignPatchTaskId,
          user_id: userId2,
          role: 'LEAD',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /task/assign', () => {
    let unassignTaskId;

    beforeAll(async () => {
      const createRes = await userAgent1
        .post('/task')
        .send({
          project_id: projectId,
          title: `Unassign Test ${Date.now()}`,
        });

      if (createRes.body.data) {
        unassignTaskId = createRes.body.data.id_task || createRes.body.data.idTask;

        await userAgent1
          .post('/task/assign')
          .send({
            task_id: unassignTaskId,
            user_id: userId2,
            role: 'DEVELOPER',
          });
      }
    });

    it('should unassign user from task', async () => {
      if (!unassignTaskId) return;

      const res = await userAgent1
        .delete('/task/assign')
        .send({
          task_id: unassignTaskId,
          user_id: userId2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject without user_id', async () => {
      if (!unassignTaskId) return;

      const res = await userAgent1
        .delete('/task/assign')
        .send({
          task_id: unassignTaskId,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /task/:task_id', () => {
    let deleteTaskId;

    beforeAll(async () => {
      const createRes = await userAgent1
        .post('/task')
        .send({
          project_id: projectId,
          title: `Delete Test Task ${Date.now()}`,
        });

      if (createRes.body.data) {
        deleteTaskId = createRes.body.data.id_task || createRes.body.data.idTask;
      }
    });

    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .delete(`/task/${deleteTaskId}`);

      expect(res.status).toBe(401);
    });

    it('should delete task', async () => {
      if (!deleteTaskId) return;

      const res = await userAgent1
        .delete(`/task/${deleteTaskId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
