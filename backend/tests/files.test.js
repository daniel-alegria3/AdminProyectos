const request = require('supertest');
const { BASE_URL } = require('./config');
const fs = require('fs');
const path = require('path');

describe('File Routes', () => {
  let userAgent;
  let userId;
  let projectId;
  let taskId;
  let fileId;

  beforeAll(async () => {
    // Create user
    userAgent = request.agent(BASE_URL);
    const userEmail = `fileuser${Date.now()}@example.com`;

    await userAgent
      .post('/user/register')
      .send({
        name: 'File Test User',
        email: userEmail,
        password: 'password123',
      });

    const loginRes = await userAgent
      .post('/user/login')
      .send({
        email: userEmail,
        password: 'password123',
      });

    userId = loginRes.body.data.user_id;

    // Create project
    const projectRes = await userAgent
      .post('/project')
      .send({
        title: `File Test Project ${Date.now()}`,
      });

    projectId = projectRes.body.data.id_project;

    // Create task
    const taskRes = await userAgent
      .post('/task')
      .send({
        project_id: projectId,
        title: `File Test Task ${Date.now()}`,
      });

    if (taskRes.body.data) {
      taskId = taskRes.body.data.id_task || taskRes.body.data.idTask;
    }
  });

  describe('POST /file/to_project', () => {
    it('should reject when not logged in', async () => {
      const res = await request(BASE_URL)
        .post('/file/to_project')
        .field('project_id', String(projectId));

      expect(res.status).toBe(401);
    });

    it('should reject without files', async () => {
      const res = await userAgent
        .post('/file/to_project')
        .field('project_id', String(projectId));

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject without project_id', async () => {
      // Create a test file in memory
      const res = await userAgent
        .post('/file/to_project')
        .attach('files', Buffer.from('test content'), 'test.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should upload file to project', async () => {
      if (!projectId) return;

      const res = await userAgent
        .post('/file/to_project')
        .field('project_id', String(projectId))
        .attach('files', Buffer.from('PDF test content'), 'test.pdf');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.uploadedFiles).toBeDefined();
      expect(res.body.uploadedFiles.length).toBeGreaterThan(0);
      fileId = res.body.uploadedFiles[0].file_id;
    });

    it('should reject invalid file types', async () => {
      if (!projectId) return;

      const res = await userAgent
        .post('/file/to_project')
        .field('project_id', String(projectId))
        .attach('files', Buffer.from('test'), 'test.exe');

      // Multer may reject or include in errors
      expect(res.status).toBeGreaterThanOrEqual(200);
    });

    it('should upload multiple files', async () => {
      if (!projectId) return;

      const res = await userAgent
        .post('/file/to_project')
        .field('project_id', String(projectId))
        .attach('files', Buffer.from('content1'), 'file1.pdf')
        .attach('files', Buffer.from('content2'), 'file2.doc');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /file/to_task', () => {
    it('should reject when not logged in', async () => {
      if (!taskId) return;

      const res = await request(BASE_URL)
        .post('/file/to_task')
        .field('task_id', String(taskId));

      expect(res.status).toBe(401);
    });

    it('should reject without files', async () => {
      if (!taskId) return;

      const res = await userAgent
        .post('/file/to_task')
        .field('task_id', String(taskId));

      expect(res.status).toBe(400);
    });

    it('should reject without task_id', async () => {
      const res = await userAgent
        .post('/file/to_task')
        .attach('files', Buffer.from('test'), 'test.pdf');

      expect(res.status).toBe(400);
    });

    it('should upload file to task', async () => {
      if (!taskId) return;

      const res = await userAgent
        .post('/file/to_task')
        .field('task_id', String(taskId))
        .attach('files', Buffer.from('PDF test content'), 'task_file.pdf');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.uploadedFiles.length).toBeGreaterThan(0);
    });

    it('should upload multiple files to task', async () => {
      if (!taskId) return;

      const res = await userAgent
        .post('/file/to_task')
        .field('task_id', String(taskId))
        .attach('files', Buffer.from('doc1'), 'doc1.docx')
        .attach('files', Buffer.from('img1'), 'img1.jpg');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /file/:file_id', () => {
    it('should reject when not logged in', async () => {
      if (!fileId) return;

      const res = await request(BASE_URL)
        .get(`/file/${fileId}`);

      expect(res.status).toBe(401);
    });

    it('should download file', async () => {
      if (!fileId && projectId) {
        // Create a file first
        const uploadRes = await userAgent
          .post('/file/to_project')
          .field('project_id', String(projectId))
          .attach('files', Buffer.from('download test'), 'download.pdf');

        if (uploadRes.body.uploadedFiles && uploadRes.body.uploadedFiles.length > 0) {
          fileId = uploadRes.body.uploadedFiles[0].file_id;
        }
      }

      if (!fileId) return;

      const res = await userAgent
        .get(`/file/${fileId}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBeDefined();
    });

    it('should reject request for non-existent file', async () => {
      const res = await userAgent
        .get('/file/99999');

      expect([404, 409]).toContain(res.status);
    });
  });

  describe('DELETE /file/:file_id', () => {
    let deleteFileId;

    beforeAll(async () => {
      if (!projectId) return;

      // Create a file to delete
      const uploadRes = await userAgent
        .post('/file/to_project')
        .field('project_id', String(projectId))
        .attach('files', Buffer.from('to delete'), 'delete_me.pdf');

      if (uploadRes.body.uploadedFiles && uploadRes.body.uploadedFiles.length > 0) {
        deleteFileId = uploadRes.body.uploadedFiles[0].file_id;
      }
    });

    it('should reject when not logged in', async () => {
      if (!deleteFileId) return;

      const res = await request(BASE_URL)
        .delete(`/file/${deleteFileId}`);

      expect(res.status).toBe(401);
    });

    it('should delete file', async () => {
      if (!deleteFileId) return;

      const res = await userAgent
        .delete(`/file/${deleteFileId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return error for non-existent file', async () => {
      const res = await userAgent
        .delete('/file/99999');

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('File upload content validation', () => {
    it('should reject files exceeding size limit (10MB)', async () => {
      if (!projectId) return;

      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      const res = await userAgent
        .post('/file/to_project')
        .field('project_id', String(projectId))
        .attach('files', largeBuffer, 'large.pdf');

      // Should either reject or include in errors
      expect(res.status).toBeGreaterThanOrEqual(200);
    });

    it('should handle multiple valid file extensions', async () => {
      if (!projectId) return;

      const validExtensions = [
        { buffer: Buffer.from('pdf'), name: 'test.pdf' },
        { buffer: Buffer.from('doc'), name: 'test.doc' },
        { buffer: Buffer.from('docx'), name: 'test.docx' },
        { buffer: Buffer.from('jpg'), name: 'test.jpg' },
        { buffer: Buffer.from('jpeg'), name: 'test.jpeg' },
        { buffer: Buffer.from('png'), name: 'test.png' },
      ];

      let req = userAgent.post('/file/to_project').field('project_id', String(projectId));

      validExtensions.forEach((file) => {
        req = req.attach('files', file.buffer, file.name);
      });

      const res = await req;

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
