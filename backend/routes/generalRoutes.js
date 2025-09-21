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

const generalController = require('../controllers/generalController');

/// '/admin'
router.post('/admin/user', userAuth.requireAdmin, generalController.createUser);
router.patch('/admin/user', userAuth.requireAdmin, generalController.updateUser);
router.delete('/admin/user', userAuth.requireAdmin, generalController.deleteUser);
router.patch('/admin/user/account_status', userAuth.requireAdmin, generalController.updateUserStatus);
// router.patch('/admin/user/make_admin', userAuth.requireAdmin, generalController.xxx); // TODO: implementar

/// '/user'
router.get('/user', userAuth.requireLogin, generalController.getAllUsers);
router.get('/user/:user_id', userAuth.requireLogin, generalController.getUserDetails);
router.patch('/user', userAuth.requireLogin, generalController.updateMyUser);

/// '/project'
router.post('/project', userAuth.requireLogin, generalController.createProject);
router.patch('/project', userAuth.requireLogin, generalController.updateProject);
// router.delete('/project', userAuth.requireLogin, generalController.archiveProject); // TODO

router.post('/project/assign', userAuth.requireLogin, generalController.assignUserToProject);
router.patch('/project/assign', userAuth.requireLogin, generalController.assignUserToProject);
// router.delete('/project/assign', userAuth.requireLogin, generalController.deleteUserFromProject); // TODO

router.get('/project', userAuth.requireLogin, generalController.getAllProjects);
router.get('/project/mine', userAuth.requireLogin, generalController.getAllMyProjects);
router.get('/project/:project_id', userAuth.requireLogin, generalController.getProjectDetails);

router.get('/project/:project_id/tasks', userAuth.requireLogin, generalController.getProjectTasks);
router.get('/project/:project_id/tasks/mine', userAuth.requireLogin, generalController.getMyProjectTasks);

/// '/task'
router.post('/tasks', userAuth.requireLogin, generalController.createTask);
router.post('/task/assign', userAuth.requireLogin, generalController.assignUserToTask);
router.patch('/task/assign', userAuth.requireLogin, generalController.assignUserToTask);
router.patch('/tasks/progress_status', userAuth.requireLogin, generalController.updateTaskStatus);

router.get('/tasks', userAuth.requireLogin, generalController.getUserTasks);
router.get('/tasks/:task_id', userAuth.requireLogin, generalController.getTaskDetails);

/// '/file'
// TODO: implement

module.exports = router;
