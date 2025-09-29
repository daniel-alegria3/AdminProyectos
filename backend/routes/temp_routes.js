const express = require('express');
const router = express.Router();
const db = require('../config/database'); // Assume you have a database connection
const userAuth = require('../middlewares/userAuth');
const multer = require('multer'); // For file uploads
const path = require('path');

// Initialize authentication middleware
userAuth.init(router);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and JPG files are allowed.'), false);
    }
  },
});

// Error handler for database operations
const handleError = (res, error) => {
  console.error('Database error:', error);
  if (error.sqlState === '45000') {
    return res.status(400).json({ error: error.sqlMessage });
  }
  return res.status(500).json({ error: 'Database operation failed' });
};

// ================================================================================
// USER ROUTES
// ================================================================================

// Get all users (admin only)
router.get('/users', userAuth.requireLogin, userAuth.requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id_user, name, email, phone_number, account_status, is_admin FROM User ORDER BY name',
    );
    res.json(rows);
  } catch (error) {
    handleError(res, error);
  }
});

// Get specific user details
router.get('/user/:user_id', userAuth.requireLogin, async (req, res) => {
  try {
    const { user_id } = req.params;

    // Users can only view their own details unless they're admin
    if (req.user.id_user != user_id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [rows] = await db.execute(
      'SELECT id_user, name, email, phone_number, account_status, is_admin FROM User WHERE id_user = ?',
      [user_id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Update user status (admin only)
router.patch(
  '/user/:user_id/status',
  userAuth.requireLogin,
  userAuth.requireAdmin,
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const { status } = req.body;

      if (!status || !['ENABLED', 'DISABLED'].includes(status)) {
        return res.status(400).json({ error: 'Valid status is required (ENABLED or DISABLED)' });
      }

      const [rows] = await db.execute('CALL UpdateUserStatus(?, ?)', [user_id, status]);
      res.json(rows[0][0]);
    } catch (error) {
      handleError(res, error);
    }
  },
);

// User session routes
router.post('/user/register', userAuth.register);
router.post('/user/login', userAuth.login);
router.post('/user/logout', userAuth.requireLogin, userAuth.logout);
router.get('/user/is_admin', userAuth.requireLogin, userAuth.isAdmin);

// ================================================================================
// PROJECT ROUTES
// ================================================================================

// Get all projects for current user
router.get('/projects', userAuth.requireLogin, async (req, res) => {
  try {
    const query = `
      SELECT p.*, pa.role,
        COUNT(DISTINCT t.id_task) as task_count,
        COUNT(DISTINCT pf.id_file) as file_count
      FROM Project p
      INNER JOIN ProjectAssignment pa ON p.id_project = pa.id_project
      LEFT JOIN Task t ON p.id_project = t.id_project
      LEFT JOIN ProjectFile pf ON p.id_project = pf.id_project
      WHERE pa.id_user = ?
      GROUP BY p.id_project
      ORDER BY p.start_date DESC
    `;
    const [rows] = await db.execute(query, [req.user.id_user]);
    res.json(rows);
  } catch (error) {
    handleError(res, error);
  }
});

// Get specific project details
router.get('/project/:project_id', userAuth.requireLogin, async (req, res) => {
  try {
    const { project_id } = req.params;

    // Check if user has access to this project
    const [accessCheck] = await db.execute(
      'SELECT role FROM ProjectAssignment WHERE id_project = ? AND id_user = ?',
      [project_id, req.user.id_user],
    );

    if (accessCheck.length === 0 && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const [projectRows] = await db.execute('SELECT * FROM Project WHERE id_project = ?', [
      project_id,
    ]);

    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get project members
    const [members] = await db.execute(
      `
      SELECT u.id_user, u.name, u.email, pa.role
      FROM User u
      INNER JOIN ProjectAssignment pa ON u.id_user = pa.id_user
      WHERE pa.id_project = ?
      ORDER BY pa.role, u.name
    `,
      [project_id],
    );

    res.json({
      ...projectRows[0],
      members,
      user_role: accessCheck.length > 0 ? accessCheck[0].status : null,
    });
  } catch (error) {
    handleError(res, error);
  }
});

// Create new project
router.post('/project', userAuth.requireLogin, async (req, res) => {
  try {
    const { title, start_date, end_date } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Project title is required' });
    }

    const [rows] = await db.execute('CALL CreateProject(?, ?, ?, ?)', [
      title,
      start_date || null,
      end_date || null,
      req.user.id_user,
    ]);

    res.status(201).json(rows[0][0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Update project
router.put('/project/:project_id', userAuth.requireLogin, async (req, res) => {
  try {
    const { project_id } = req.params;
    const { title, visibility, start_date, end_date } = req.body;

    // Check if user is project owner or admin
    const [accessCheck] = await db.execute(
      'SELECT role FROM ProjectAssignment WHERE id_project = ? AND id_user = ?',
      [project_id, req.user.id_user],
    );

    if ((accessCheck.length === 0 || accessCheck[0].role !== 'OWNER') && !req.user.is_admin) {
      return res.status(403).json({ error: 'Only project owners can update project details' });
    }

    const [result] = await db.execute(
      'UPDATE Project SET title = ?, visibility = ?, start_date = ?, end_date = ? WHERE id_project = ?',
      [title, visibility || null, start_date || null, end_date || null, project_id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    handleError(res, error);
  }
});

// Assign user to project
router.post('/project/:project_id/assign', userAuth.requireLogin, async (req, res) => {
  try {
    const { project_id } = req.params;
    const { user_id, role } = req.body;

    const [rows] = await db.execute('CALL AssignUserToProject(?, ?, ?)', [
      project_id,
      user_id,
      role || 'MEMBER',
    ]);

    res.json(rows[0][0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Remove user from project
router.delete('/project/:project_id/assign/:user_id', userAuth.requireLogin, async (req, res) => {
  // TODO: yoink
  try {
    const { project_id, user_id } = req.params;

    // Check if current user is project owner or admin
    const [accessCheck] = await db.execute(
      'SELECT role FROM ProjectAssignment WHERE id_project = ? AND id_user = ?',
      [project_id, req.user.id_user],
    );

    if ((accessCheck.length === 0 || accessCheck[0].role !== 'OWNER') && !req.user.is_admin) {
      return res.status(403).json({ error: 'Only project owners can remove users' });
    }

    const [result] = await db.execute(
      'DELETE FROM ProjectAssignment WHERE id_project = ? AND id_user = ?',
      [project_id, user_id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User assignment not found' });
    }

    res.json({ message: 'User removed from project successfully' });
  } catch (error) {
    handleError(res, error);
  }
});

// ================================================================================
// TASK ROUTES
// ================================================================================

// Get tasks by user
router.get('/tasks', userAuth.requireLogin, async (req, res) => {
  try {
    const { project_id } = req.query;
    const [rows] = await db.execute('CALL GetTasksByUser(?, ?)', [
      req.user.id_user,
      project_id || null,
    ]);
    res.json(rows[0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Get tasks by project
router.get('/project/:project_id/tasks', userAuth.requireLogin, async (req, res) => {
  try {
    const { project_id } = req.params;
    const { user_id } = req.query;

    // Check if user has access to this project
    const [accessCheck] = await db.execute(
      'SELECT role FROM ProjectAssignment WHERE id_project = ? AND id_user = ?',
      [project_id, req.user.id_user],
    );

    if (accessCheck.length === 0 && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const [rows] = await db.execute('CALL GetTasksByProject(?, ?)', [project_id, user_id || null]);
    res.json(rows[0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Get specific task details
router.get('/task/:task_id', userAuth.requireLogin, async (req, res) => {
  try {
    const { task_id } = req.params;

    const query = `
      SELECT t.*, p.title as project_title,
        JSON_ARRAYAGG(
          JSON_OBJECT('user_id', u.id_user, 'name', u.name, 'role', ta.role)
        ) as assigned_users
      FROM Task t
      INNER JOIN Project p ON t.id_project = p.id_project
      LEFT JOIN TaskAssignment ta ON t.id_task = ta.id_task
      LEFT JOIN User u ON ta.id_user = u.id_user
      WHERE t.id_task = ?
      GROUP BY t.id_task
    `;

    const [rows] = await db.execute(query, [task_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has access to this task's project
    const [accessCheck] = await db.execute(
      'SELECT role FROM ProjectAssignment WHERE id_project = ? AND id_user = ?',
      [rows[0].id_project, req.user.id_user],
    );

    if (accessCheck.length === 0 && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied to this task' });
    }

    res.json(rows[0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Create new task
router.post('/task', userAuth.requireLogin, async (req, res) => {
  try {
    const {
      project_id,
      title,
      description,
      start_date,
      end_date,
      assigned_user_id,
      assigned_role,
    } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({ error: 'Project ID and title are required' });
    }

    // Check if user has access to create tasks in this project
    const [accessCheck] = await db.execute(
      'SELECT role FROM ProjectAssignment WHERE id_project = ? AND id_user = ?',
      [project_id, req.user.id_user],
    );

    if (
      (accessCheck.length === 0 || !['OWNER', 'MEMBER'].includes(accessCheck[0].status)) &&
      !req.user.is_admin
    ) {
      return res.status(403).json({ error: 'Access denied to create tasks in this project' });
    }

    const [rows] = await db.execute('CALL CreateTask(?, ?, ?, ?, ?, ?, ?)', [
      project_id,
      title,
      description || null,
      start_date || null,
      end_date || null,
      assigned_user_id || null,
      assigned_role || null,
    ]);

    res.status(201).json(rows[0][0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Update task status
router.patch('/task/:task_id/status', userAuth.requireLogin, async (req, res) => {
  try {
    const { task_id } = req.params;
    const { status } = req.body;

    if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    // Check if user is assigned to this task or is project owner/admin
    const [taskCheck] = await db.execute(
      `
      SELECT t.id_project,
        EXISTS(SELECT 1 FROM TaskAssignment WHERE id_task = ? AND id_user = ?) as is_assigned,
        EXISTS(SELECT 1 FROM ProjectAssignment WHERE id_project = t.id_project AND id_user = ? AND role = 'OWNER') as is_owner
      FROM Task t
      WHERE t.id_task = ?
    `,
      [task_id, req.user.id_user, req.user.id_user, task_id],
    );

    if (taskCheck.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { is_assigned, is_owner } = taskCheck[0];
    if (!is_assigned && !is_owner && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied to update this task' });
    }

    const [rows] = await db.execute('CALL UpdateTaskStatus(?, ?)', [task_id, status]);
    res.json(rows[0][0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Assign user to task
router.post('/task/:task_id/assign', userAuth.requireLogin, async (req, res) => {
  try {
    const { task_id } = req.params;
    const { user_id, status } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const [rows] = await db.execute('CALL AssignUserToTask(?, ?, ?)', [
      task_id,
      user_id,
      status || 'MEMBER',
    ]);

    res.json(rows[0][0]);
  } catch (error) {
    handleError(res, error);
  }
});

// ================================================================================
// FILE ROUTES
// ================================================================================

// Upload file
router.post('/file/upload', userAuth.requireLogin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer, size } = req.file;
    const name = path.parse(originalname).name;
    const extension = path.parse(originalname).ext.substring(1); // Remove the dot

    const [rows] = await db.execute('CALL UploadFile(?, ?, ?, ?)', [name, extension, buffer, size]);

    res.status(201).json(rows[0][0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Download file
router.get('/file/:file_id/download', userAuth.requireLogin, async (req, res) => {
  try {
    const { file_id } = req.params;

    const [rows] = await db.execute('CALL DownloadFile(?)', [file_id]);

    if (rows[0].length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = rows[0][0];
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });

    res.send(file.data);
  } catch (error) {
    handleError(res, error);
  }
});

// Attach file to project
router.post('/project/:project_id/files/:file_id', userAuth.requireLogin, async (req, res) => {
  try {
    const { project_id, file_id } = req.params;

    // Check if user has access to this project
    const [accessCheck] = await db.execute(
      'SELECT role FROM ProjectAssignment WHERE id_project = ? AND id_user = ?',
      [project_id, req.user.id_user],
    );

    if (
      (accessCheck.length === 0 || !['OWNER', 'MEMBER'].includes(accessCheck[0].status)) &&
      !req.user.is_admin
    ) {
      return res.status(403).json({ error: 'Access denied to attach files to this project' });
    }

    const [rows] = await db.execute('CALL AttachFileToProject(?, ?)', [project_id, file_id]);
    res.json(rows[0][0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Attach file to task
router.post('/task/:task_id/files/:file_id', userAuth.requireLogin, async (req, res) => {
  try {
    const { task_id, file_id } = req.params;

    const [rows] = await db.execute('CALL AttachFileToTask(?, ?)', [task_id, file_id]);
    res.json(rows[0][0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Get task files
router.get('/task/:task_id/files', userAuth.requireLogin, async (req, res) => {
  try {
    const { task_id } = req.params;

    const [rows] = await db.execute('CALL GetTaskFilenames(?)', [task_id]);
    res.json(rows[0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Get project files
router.get('/project/:project_id/files', userAuth.requireLogin, async (req, res) => {
  try {
    const { project_id } = req.params;

    const query = `
      SELECT f.id_file, CONCAT(f.name, '.', f.extension) AS filename,
        f.name, f.extension, f.size, f.uploaded_at
      FROM ProjectFile pf
      JOIN File f ON pf.id_file = f.id_file
      WHERE pf.id_project = ?
      ORDER BY f.uploaded_at DESC
    `;

    const [rows] = await db.execute(query, [project_id]);
    res.json(rows);
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;
