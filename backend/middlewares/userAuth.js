const session = require('express-session');
const db = require('../database/db');

const COOKIE_NAME = 'my-result-cookie-name.sid';
const SECRET = 'my-result-secret-key';
const PRIMARY_KEY = 'user_id';

const userAuth = {};

/// NOTE: Usar 'req.session.variable' para guardar una 'variable' en la session
/// NOTE: en este caso, usaremos 'req.session.id_user'

/// Permite que router use express-session
userAuth.init = (router) => {
  router.use(
    session({
      name: COOKIE_NAME,
      secret: SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // set to true in production with HTTPS
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60, // 1 hour
      },
    }),
  );
};

/// METODOS
userAuth.register = async (req, res) => {
  try {
    const { name, email, password, phone_number } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const [data] = await db.execute('CALL RegisterUser(?, ?, ?, ?, ?)', [
      name,
      email,
      password,
      phone_number,
      false,
    ]);

    // TODO: don't give session on register, verify user with email.
    const result = data[0];
    req.session[PRIMARY_KEY] = result['user_id'];

    // Success response
    res.status(201).json({
      success: true,
      message: result['message'],
      data: {
        [PRIMARY_KEY]: data['user_id'],
      },
    });
  } catch (error) {
    console.error('Error creating result:', error);

    // Catches sql store procedure custom errors
    if (error.sqlState === '45000') {
      return res.status(409).json({
        success: false,
        message: error.sqlMessage,
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

userAuth.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const [data] = await db.execute('CALL LoginUser(?, ?)', [email, password]);
    const result = data[0];

    if (!result['is_enabled']) {
      return res.status(500).json({
        success: false,
        message: 'User is not enabled',
      });
    }

    req.session[PRIMARY_KEY] = result['user_id'];
    req.session['is_admin'] = result['is_admin'];

    res.status(200).json({
      success: true,
      message: result['message'],
      data: {
        [PRIMARY_KEY]: result['id_user'],
        is_admin: result['is_admin'],
      },
    });
  } catch (error) {
    console.error('Error during login:', error);

    // Handle custom SIGNAL errors from stored procedure
    if (error.sqlState === '45000') {
      return res.status(401).json({
        success: false,
        message: error.sqlMessage,
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

userAuth.requireLogin = (req, res, next) => {
  if (!req.session[PRIMARY_KEY]) {
    return res.status(401).json({ success: false, message: 'No ha iniciado sesion' });
  }
  next();
};

userAuth.requireAdmin = (req, res, next) => {
  if (!req.session['is_admin']) {
    return res.status(401).json({ success: false, message: 'Acceso denegado' });
  }
  next();
};

userAuth.isLoggedIn = (req, res) => {
  if (req.session[PRIMARY_KEY]) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
};

userAuth.isAdmin = (req, res) => {
  if (req.session['is_admin']) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
};

userAuth.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
  });
};

module.exports = userAuth;
