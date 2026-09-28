const express = require('express');
const router = express.Router();
const panitiaController = require('../controllers/panitia.controller');
const adminController = require('../controllers/admin.controller');
const { isAuthenticated, requireRole } = require('../middlewares/auth.middleware');

// Middleware: Rute panitia harus login + role PANITIA_TPS atau ADMIN
router.use(isAuthenticated, requireRole('PANITIA_TPS', 'ADMIN'));

// Dashboard Panitia
router.get('/dashboard', panitiaController.showDashboard);

// DPT & Verifikasi Kehadiran
router.get('/dpt', panitiaController.showDPT);
router.post('/dpt/:id/verify', panitiaController.verifyPresence);

// Generate Token Sekali Pakai
router.post('/dpt/:id/token', panitiaController.generateToken);
router.get('/token-sukses/:id', panitiaController.showTokenSukses);

// Quick Count Monitoring
router.get('/quick-count', panitiaController.showQuickCount);
router.get('/api/quick-count', adminController.apiQuickCount);

// Berita Acara Rekapitulasi
router.get('/berita-acara', panitiaController.showBeritaAcara);

module.exports = router;
