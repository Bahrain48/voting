const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { isAuthenticated, requireRole } = require('../middlewares/auth.middleware');

// Middleware: Semua rute admin harus login + role ADMIN
router.use(isAuthenticated, requireRole('ADMIN'));

// Dashboard
router.get('/dashboard', adminController.showDashboard);

// Manajemen Paslon
router.get('/candidates', adminController.showCandidates);
router.get('/candidates/add', adminController.showAddCandidate);
router.post('/candidates/add', adminController.createCandidate);
router.get('/candidates/:id/edit', adminController.showEditCandidate);
router.post('/candidates/:id/edit', adminController.updateCandidate);
router.post('/candidates/:id/delete', adminController.deleteCandidate);

// Buka / Kunci Sesi Voting
router.post('/session/toggle', adminController.toggleVotingSession);
router.post('/session/configure', adminController.configureSession);

// Quick Count Real-Time
router.get('/quick-count', adminController.showQuickCount);
router.get('/api/quick-count', adminController.apiQuickCount);

// Audit Log
router.get('/audit-log', adminController.showAuditLog);

module.exports = router;
