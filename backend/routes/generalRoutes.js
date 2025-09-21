const express = require('express');
const router = express.Router();

// TODO: figure out how to separate each part in its own file?

const userAuth = require('../middlewares/userAuth');
userAuth.init(router);

// user session
router.post('/user/register', userAuth.register);
router.post('/user/login', userAuth.login);
router.post('/user/logout', userAuth.requireLogin, userAuth.logout);
router.get('/user/is_admin', userAuth.requireLogin, userAuth.isAdmin);
// router.get('/is_logged_in', userAuth.isLoggedIn); -- no necesario?

const gc = require('../controllers/generalController');

/// '/admin'
router.post('/admin/user', userAuth.requireAdmin, gc.createUser);
router.patch('/admin/user', userAuth.requireAdmin, gc.updateUser);
router.delete('/admin/user', userAuth.requireAdmin, gc.deleteUser);
router.patch( '/admin/user/account_status', userAuth.requireAdmin, gc.updateUserStatus);
// router.patch('/admin/user/make_admin', userAuth.requireAdmin, generalController.xxx); // TODO: implementar

/// '/user'
router.get('/user', userAuth.requireLogin, gc.getAllUsers);
router.get('/user/:user_id', userAuth.requireLogin, gc.getUserDetails);
router.patch('/user', userAuth.requireLogin, gc.updateMyUser);

/// '/project'
router.post('/project', userAuth.requireLogin, gc.createProject);
router.patch('/project', userAuth.requireLogin, gc.updateProject);
// router.delete('/project', userAuth.requireLogin, generalController.archiveProject); // TODO

router.post('/project/assign', userAuth.requireLogin, gc.assignUserToProject);
router.patch('/project/assign', userAuth.requireLogin, gc.assignUserToProject);
// router.delete('/project/assign', userAuth.requireLogin, generalController.deleteUserFromProject); // TODO

router.get('/project', userAuth.requireLogin, gc.getAllProjects);
router.get('/project/mine', userAuth.requireLogin, gc.getAllMyProjects);
router.get('/project/:project_id', userAuth.requireLogin, gc.getProjectDetails);

router.get('/project/:project_id/tasks', userAuth.requireLogin, gc.getProjectTasks);
router.get( '/project/:project_id/tasks/mine', userAuth.requireLogin, gc.getMyProjectTasks);

/// '/task'
router.post('/tasks', userAuth.requireLogin, gc.createTask);
router.post('/task/assign', userAuth.requireLogin, gc.assignUserToTask);
router.patch('/task/assign', userAuth.requireLogin, gc.assignUserToTask);
router.patch('/tasks/progress_status', userAuth.requireLogin, gc.updateTaskStatus);

router.get('/tasks', userAuth.requireLogin, gc.getUserTasks);
router.get('/tasks/:task_id', userAuth.requireLogin, gc.getTaskDetails);

/// '/file'
router.post('/file/to_project', userAuth.requireLogin, gc.uploadProjectFile);
router.post('/file/to_task', userAuth.requireLogin, gc.uploadTaskFile);
router.get('/file/:file_id', userAuth.requireLogin, gc.downloadFile);

module.exports = router;
