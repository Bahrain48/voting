const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voter.controller');
const { isAuthenticated, requireRole } = require('../middlewares/auth.middleware');

// Middleware: Rute bilik suara harus login dengan role PEMILIH
router.use(isAuthenticated, requireRole('PEMILIH'));

// Bilik Suara
router.get('/', voterController.showBilikSuara);
router.post('/coblos', voterController.doVote);
router.get('/selesai', voterController.showSelesai);

module.exports = router;
