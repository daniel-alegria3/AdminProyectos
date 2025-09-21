const express = require('express');
const router = express.Router();

// Usuario
const auth = require('../middlewares/userAuth');
auth.init(router)

router.post('/register', auth.register);
router.post('/login', auth.login);
router.get('/logged_in', auth.isLoggedIn);
router.post('/logout', auth.requireLogin, auth.logout);

const generalController = require('../controllers/generalController.js')
// TODO: implementear funciones
router.post('/ejemplo', auth.requireLogin, generalController.Ejemplo);

module.exports = router;

