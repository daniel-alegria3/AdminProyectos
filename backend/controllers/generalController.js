const db = require('../database/db');

const multer = require('multer');
const path = require('path');
const mime = require('mime-types');

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

const createUploadHandler = (attachFunction, entityIdField, entityName) => {
  return [
    upload.array('files'),
    async (req, res) => {
      try {
        // Check if any files were uploaded
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ error: 'No se pasaron archivos' });
        }

        const entityId = req.body[entityIdField];
        if (!entityId) {
          return res.status(400).json({ error: `${entityName} ID is required` });
        }

        const uploadedFiles = [];
        const errors = [];
        const { requesting_user_id } = req.body;

        // Process each file
        for (const file of req.files) {
          try {
            const { originalname, buffer } = file;
            const size = Buffer.byteLength(buffer);

            // Extract name + extension
            const parts = originalname.split('.');
            const extension = parts.length > 1 ? parts.pop() : '';
            const name = parts.join('.') || originalname;

            // Upload file to database
            let rows;
            [rows] = await db.query('CALL UploadFile(?, ?, ?, ?)', [name, extension, buffer, size]);
            const file_id = rows[0][0].file_id;

            // Attach file using the provided attach function
            [rows] = await attachFunction(entityId, file_id, requesting_user_id || req.session.user_id);

            uploadedFiles.push({
              file_id,
              filename: originalname,
              size,
            });
          } catch (fileError) {
            errors.push({
              filename: file.originalname,
              error: fileError.message,
            });
          }
        }

        // Prepare response
        const response = {
          success: uploadedFiles.length > 0,
          message: `${uploadedFiles.length} archivo(s) subido(s) exitosamente al ${entityName.toLowerCase()}`,
          uploadedFiles,
          totalUploaded: uploadedFiles.length,
          totalFiles: req.files.length,
        };

        // Include errors if any occurred
        if (errors.length > 0) {
          response.errors = errors;
          response.message += `, ${errors.length} archivo(s) fallaron`;
        }

        return res.json(response);
      } catch (error) {
        return handleError(res, error);
      }
    },
  ];
};

const handleError = (res, error) => {
  console.error('Backend error:', error);

  // Catches sql store procedure custom errors
  if (error.sqlState === '45000') {
  const msg = error.sqlMessage || 'Operación no permitida';
  const isForbidden = /propietario|owner|permiso|no autorizado|forbidden/i.test(msg);

  return res.status(isForbidden ? 403 : 409).json({
    success: false,
    message: msg,
  });
}


  // Generic error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

const generalController = {
  createUser: async (req, res) => {
    try {
      const { name, email, password, phone_number, is_admin } = req.body;
      const requesting_user_id = req.session.user_id;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, email y contraseña son requeridos',
        });
      }

      const [rows] = await db.execute('CALL CreateUser(?, ?, ?, ?, ?, ?)', [
        name,
        email,
        password,
        phone_number || null,
        is_admin || false,
        requesting_user_id,
      ]);

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: rows[0][0],
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  updateUser: async (req, res) => {
    try {
      const { user_id, name, email, phone_number, account_status } = req.body;
      const requesting_user_id = req.session.user_id;

      const [rows] = await db.execute('CALL UpdateUser(?, ?, ?, ?, ?, ?)', [
        parseInt(user_id),
        name || null,
        email || null,
        phone_number || null,
        account_status || null,
        requesting_user_id,
      ]);

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { user_id } = req.body;
      const requesting_user_id = req.session.user_id;

      // Validate required parameters
      if (!user_id) {
        return res.status(400).json({ success: false, message: 'ID de usuario es requerido' });
      }

      // Prevent self-deletion
      if (parseInt(user_id) === requesting_user_id) {
        return res
          .status(400)
          .json({ success: false, message: 'No puedes eliminar tu propia cuenta' });
      }

      // Call stored procedure to delete user
      const [rows] = await db.execute('CALL DeleteUser(?, ?)', [
        parseInt(user_id),
        requesting_user_id,
      ]);

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente',
        data: {
          deleted_user_id: parseInt(user_id),
        },
      });
    } catch (error) {
      handleError(res, error);
    }
  },
  //------------------------------------------------------------------------------

  updateUserStatus: async (req, res) => {
    try {
      const { user_id, account_status } = req.body;

      if (!user_id || !account_status) {
        return res.status(400).json({ success: false, error: 'missing parameters' });
      }

      const [rows] = await db.execute('CALL UpdateUserStatus(?, ?)', [user_id, account_status]);
      res.json({
        success: true,
        message: 'Estado de usuario actualizado exitosamente',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const [rows] = await db.execute(
        'SELECT id_user as user_id, name, email, phone_number, account_status = "ENABLED" as is_enabled, is_admin FROM User ORDER BY name',
      );
      res.json({
        success: true,
        message: 'Usuarios recuperados exitosamente',
        data: rows,
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  getUserDetails: async (req, res) => {
    try {
      const { user_id } = req.params;

      const [rows] = await db.execute(
        'SELECT id_user as user_id, name, email, phone_number, account_status = "ENABLED" as is_enabled FROM `User` WHERE id_user = ?',
        [user_id],
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      res.json({
        success: true,
        message: 'Detalles del usuario recuperados exitosamente',
        data: rows[0][0],
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  updateMyUser: async (req, res) => {
    try {
      const { name, email, phone_number } = req.body;
      const requesting_user_id = req.session.user_id;

      // For self-update, user_id and requesting_user_id are the same
      // Also, don't allow account_status changes in self-update
      const [rows] = await db.execute('CALL UpdateUser(?, ?, ?, ?, ?, ?)', [
        requesting_user_id,
        name || null,
        email || null,
        phone_number || null,
        null, // Don't allow self account_status changes
        requesting_user_id,
      ]);

      res.json({
        success: true,
        message: 'Detalles del usuario actualizados exitosamente',
        data: {
          user_id: requesting_user_id,
          data: rows[0][0],
        },
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  createProject: async (req, res) => {
    try {
      const { title, visibility, description, start_date, end_date } = req.body;
      const creator_user_id = req.session.user_id;

      if (!title) {
        return res.status(400).json({ success: false, error: 'title not defined' });
      }

      const [rows] = await db.execute('CALL CreateProject(?, ?, ?, ?, ?, ?)', [
        title,
        visibility || 'PUBLIC',
        description || null,
        start_date || null,
        end_date || null,
        creator_user_id,
      ]);

      res.json({
        success: true,
        message: 'Proyecto creado exitosamente',
        data: rows[0][0],
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  updateProject: async (req, res) => {
    try {
      const { project_id, title, visibility, description, start_date, end_date } = req.body;
      const requesting_user_id = req.session.user_id;

      const [rows] = await db.execute('CALL UpdateProject(?, ?, ?, ?, ?, ?, ?)', [
        parseInt(project_id),
        title || null,
        visibility || null,
        description || null,
        start_date || null,
        end_date || null,
        requesting_user_id,
      ]);

      res.json({
        success: true,
        message: 'Proyecto actualizado exitosamente',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  deleteProject: async (req, res) => {
    try {
      const { project_id } = req.params;
      const requesting_user_id = req.session.user_id;

      const [rows] = await db.execute('CALL DeleteProject(?, ?)', [project_id, requesting_user_id]);

      res.json({
        success: true,
        message: 'Projecto eliminado exitosamente',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  assignUserToProject: async (req, res) => {
    // Can also update existing user if role provided
    try {
      const { project_id, user_id, role } = req.body;
      const requesting_user_id = req.session.user_id;

      if (!project_id || !user_id) {
        return res.status(400).json({ success: false, error: 'missing parameters' });
      }

      const [rows] = await db.execute('CALL AssignUserToProject(?, ?, ?, ?)', [
        project_id,
        user_id,
        role || 'MEMBER',
        requesting_user_id,
      ]);

      res.json({
        success: true,
        message: 'Usuario asignado a proyecto exitosamente',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  UNassignUserToProject: async (req, res) => {
  try {
    const project_id_raw = req.body?.project_id ?? req.query?.project_id;
    const user_id_raw = req.body?.user_id ?? req.query?.user_id;

    const project_id = parseInt(project_id_raw, 10);
    const user_id = parseInt(user_id_raw, 10);

    if (!Number.isFinite(project_id) || !Number.isFinite(user_id)) {
      return res.status(400).json({
        success: false,
        message: 'project_id y user_id son requeridos (numéricos)',
      });
    }

    const requesting_user_id = req.session.user_id;

    await db.execute('CALL UNassignUserToProject(?, ?, ?)', [
      project_id,
      user_id,
      requesting_user_id,
    ]);

    res.json({
      success: true,
      message: 'Usuario desasignado a proyecto exitosamente',
    });
  } catch (error) {
    handleError(res, error);
  }
},




  getAllProjects: async (req, res) => {
    try {
      const [rows] = await db.execute('CALL GetAllProjects(?)', [null]);
      res.json({
        success: true,
        message: 'Proyectos recuperados exitosamente',
        data: rows[0],
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  getAllMyProjects: async (req, res) => {
    try {
      const [rows] = await db.execute('CALL GetAllProjects(?)', [req.session.user_id]);
      res.json({
        success: true,
        message: 'Mis proyectos recuperados exitosamente',
        data: rows[0],
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  getProjectDetails: async (req, res) => {
    try {
      // Returns members, files

      const { project_id } = req.params;
      const requesting_user_id = req.session.user_id;

      const [rows] = await db.execute(`CALL GetProjectDetails(?, ?)`, [
        project_id,
        requesting_user_id,
      ]);

      res.json({
        success: true,
        message: 'Detalles del proyecto recuperados exitosamente',
        data: rows[0],
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  getProjectTasks: async (req, res) => {
    // Puede filtrar por usuario
    try {
      const { project_id } = req.params;
      const { filter_user_id } = req.query;
      const requesting_user_id = req.session.user_id;

      // CORREGIDO: Solo enviamos 2 argumentos (project_id, filter_user_id)
      const [rows] = await db.execute('CALL GetTasksByProject(?, ?, ?)', [
        project_id,
        filter_user_id || null,
        requesting_user_id,
      ]);
      res.json({
        success: true,
        message: 'Tareas de proyecto recuperados exitosamente',
        data: rows[0],
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  getMyProjectTasks: async (req, res) => {
    try {
      const { project_id } = req.params;
      const requesting_user_id = req.session.user_id;
      const filter_user_id = req.session.user_id;

      const [rows] = await db.execute('CALL GetTasksByProject(?, ?, ?)', [
        project_id,
        filter_user_id,
        requesting_user_id,
      ]);
      res.json({
        success: true,
        message: 'Mis tareas de proyecto recuperados exitosamente',
        data: rows[0],
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  createTask: async (req, res) => {
    try {
      const { project_id, title, description, start_date, end_date, user_id, role } = req.body;

      const creator_user_id = req.session.user_id;

      if (!project_id || !title) {
        return res.status(400).json({ success: false, error: 'missing parameters' });
      }

      const [rows] = await db.execute('CALL CreateTask(?, ?, ?, ?, ?, ?, ?, ?)', [
        project_id,
        title,
        description || null,
        start_date || null,
        end_date || null,
        user_id || creator_user_id || null,
        role || null,
        creator_user_id,
      ]);

      res.json({
        success: true,
        message: 'Tarea creada exitosamente',
        data: rows[0][0],
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  getUserTasks: async (req, res) => {
    try {
      const user_id = req.session.user_id;

      const [rows] = await db.execute('CALL GetTasksByUser(?, ?)', [user_id, null]);
      res.json({
        success: true,
        message: 'Tareas del usuario recuperados exitosamente',
        data: rows[0],
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  getTaskDetails: async (req, res) => {
    try {
      // Returns members, files
      const { task_id } = req.params;
      const requesting_user_id = req.session.user_id;

      const [rows] = await db.execute(`CALL GetTaskDetails(?, ?)`, [task_id, requesting_user_id]);

      res.json({
        success: true,
        message: 'Detalles de tarea recuperados exitosamente',
        data: rows[0],
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  updateTask: async (req, res) => {
    try {
      const { task_id } = req.params;
      const { title, description, start_date, end_date } = req.body;
      const requesting_user_id = req.session.user_id;

      const [rows] = await db.execute('CALL UpdateTask(?, ?, ?, ?, ?, ?)', [
        task_id,
        title || null,
        description || null,
        start_date || null,
        end_date || null,
        requesting_user_id,
      ]);

      res.json({
        success: true,
        message: 'Tarea actualizada exitosamente',
        data: rows[0][0],
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  deleteTask: async (req, res) => {
    try {
      const { task_id } = req.params;
      const requesting_user_id = req.session.user_id;

      const [rows] = await db.execute('CALL DeleteTask(?, ?)', [task_id, requesting_user_id]);

      res.json({
        success: true,
        message: 'Tarea eliminada exitosamente',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  updateTaskStatus: async (req, res) => {
    try {
      const { task_id, progress_status } = req.body;

      if (!progress_status) {
        return res.status(400).json({ success: false, error: 'missing parameters' });
      }
      const requesting_user_id = req.session.user_id;

      const [rows] = await db.execute('CALL UpdateTaskStatus(?, ?, ?)', [
        task_id,
        progress_status,
        requesting_user_id,
      ]);

      res.json({
        success: true,
        message: 'Estado de tarea actualizado exitosamente',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  assignUserToTask: async (req, res) => {
    // Can also update existing user if role provided
    try {
      const { task_id, user_id, role } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      const requesting_user_id = req.session.user_id;

      const [rows] = await db.execute('CALL AssignUserToTask(?, ?, ?, ?)', [
        task_id,
        user_id,
        role || 'MEMBER',
        requesting_user_id,
      ]);

      res.json({
        success: true,
        message: 'Usuario asignado a tarea exitosamente',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  UNassignUserToTask: async (req, res) => {
    try {
      const { task_id, user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      const requesting_user_id = req.session.user_id;

      const [rows] = await db.execute('CALL UNassignUserToTask(?, ?, ?)', [
        task_id,
        user_id,
        requesting_user_id,
      ]);

      res.json({
        success: true,
        message: 'Usuario desasignado a tarea exitosamente',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  downloadFile: async (req, res) => {
    try {
      const { file_id } = req.params;
      const requesting_user_id = req.session.user_id;

      const [rows] = await db.execute('CALL DownloadFile(?, ?)', [file_id, requesting_user_id]);
      const result = rows[0][0];

      if (!result) {
        return res.status(404).json({ error: 'File not found' });
      }

      const mimeType = mime.lookup(result.extension) || 'application/octet-stream';

      // Set headers
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', Buffer.byteLength(result.data));
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

      // Send raw binary data
      res.send(result.data);
    } catch (error) {
      handleError(res, error);
    }
  },

  deleteFile: async (req, res) => {
    try {
      const { file_id } = req.params;
      const requesting_user_id = req.session.user_id;

      const [rows] = await db.execute('CALL DeleteFile(?, ?)', [file_id, requesting_user_id]);

      res.json({
        success: true,
        message: 'Archivo eliminado exitosamente',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  uploadProjectFile: createUploadHandler(
    (projectId, fileId, requesting_user_id) =>
      db.execute('CALL AttachFileToProject(?, ?, ?)', [projectId, fileId, requesting_user_id]),
    'project_id',
    'Project',
  ),

  uploadTaskFile: createUploadHandler(
    (taskId, fileId, requesting_user_id) =>
      db.execute('CALL AttachFileToTask(?, ?, ?)', [taskId, fileId, requesting_user_id]),
    'task_id',
    'Task',
  ),
};

module.exports = generalController;
