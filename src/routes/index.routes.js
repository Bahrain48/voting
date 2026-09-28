const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { isAuthenticated, requireRole } = require('../middlewares/auth.middleware');

// Redirect root ke login atau dashboard
router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === 'ADMIN') return res.redirect('/admin/dashboard');
    if (role === 'PANITIA_TPS') return res.redirect('/panitia/dashboard');
    return res.redirect('/bilik-suara');
  }
  res.redirect('/login');
});

// Auth Routes
router.get('/login', authController.showLogin);
router.post('/login', authController.handleLogin);
router.post('/login/bilik', authController.handleBilikLogin);
router.get('/logout', authController.handleLogout);

module.exports = router;
