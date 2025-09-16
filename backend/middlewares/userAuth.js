const session = require('express-session');
const pool = require('../database/db');

const COOKIE_NAME = "my-user-cookie-name.sid";
const SECRET = "my-user-secret-key";
const PRIMARY_KEY = "id_user";

const userAuth = {
};

/// NOTE: Usar 'req.session.variable' para guardar una 'variable' en la session
/// NOTE: en este caso, usaremos 'req.session.id_user'

/// Permite que router use express-session
userAuth.init = (router) => {
    router.use(session({
        name: COOKIE_NAME,
        secret: SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // set to true in production with HTTPS
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 // 1 hour
        }
    }));
};


/// METODOS
userAuth.register = async (req, res) => {
    // TODO: implementear sql calls
    // req.session[PRIMARY_KEY] = 69;
};

userAuth.login = async (req, res) => {
    // TODO: implementar sql calls
};


userAuth.requireLogin = (req, res, next) => {
    if (!req.session[PRIMARY_KEY]) {
        // return res.status(401).json({ error: 'No ha iniciado sesión.' });
        return res.json({ error: 'No ha iniciado sesión.' });
    }
    next();
};

userAuth.isLoggedIn = (req, res) => {
    if (req.session[PRIMARY_KEY]) {
        res.json({ loggedIn: true, [primary_key]: req.session[PRIMARY_KEY] });
    } else {
        res.json({ loggedIn: false });
    }
};

userAuth.logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie(COOKIE_NAME);
        res.json({ success: true });
    });
};

module.exports = userAuth;

