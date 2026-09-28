const prisma = require('../config/db');

const isVotingAvailable = (setting, now = new Date()) => {
  if (setting && !setting.isVotingOpen) return false;
  if (setting?.startsAt && now < new Date(setting.startsAt)) return false;
  if (setting?.endsAt && now > new Date(setting.endsAt)) return false;
  return true;
};

/**
 * Middleware: Cek apakah user telah login
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login?error=Silakan login terlebih dahulu.');
};

/**
 * Middleware: RBAC (Role-Based Access Control)
 * Memeriksa apakah user memiliki peran yang diizinkan
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login?error=Sesi telah berakhir. Silakan login kembali.');
    }

    const userRole = req.session.user.role;
    if (roles.includes(userRole)) {
      return next();
    }

    // Jika peran tidak diizinkan, render halaman 403 Forbidden yang profesional
    return res.status(403).render('errors/403', {
      title: '403 Akses Ditolak - E-Voting OSIS & MPK',
      userRole,
      allowedRoles: roles,
      path: req.originalUrl,
    });
  };
};

/**
 * Helper: Catat Jejak Audit Aktivitas ke Database
 */
const logActivity = async (username, role, action, details, ipAddress = '127.0.0.1') => {
  try {
    await prisma.activityLog.create({
      data: {
        username: username || 'SYSTEM',
        role: role || 'UNKNOWN',
        action,
        details,
        ipAddress: ipAddress || '127.0.0.1',
      },
    });
  } catch (err) {
    console.error('⚠️ Gagal mencatat activity log:', err.message);
  }
};

/**
 * Middleware Global: Injeksi data sesi & konfigurasi ke res.locals
 */
const globalSessionData = async (req, res, next) => {
  try {
    // Sesi User
    res.locals.user = req.session ? req.session.user : null;
    res.locals.voterSession = req.session ? req.session.voterSession : null;

    // Ambil Pengaturan Sesi Voting (Cached / Single Row)
    let setting = await prisma.systemSetting.findFirst();
    if (!setting) {
      setting = await prisma.systemSetting.create({
        data: {
          sessionName: 'Pemilihan Ketua & Wakil Ketua OSIS/MPK SMK Telkom Masa Bakti 2026/2027',
          isVotingOpen: true,
        },
      });
    }
    res.locals.systemSetting = setting;
    res.locals.isVotingOpen = setting.isVotingOpen;
    res.locals.isVotingAvailable = isVotingAvailable(setting);

    // Formatters
    res.locals.formatDate = (date) => {
      if (!date) return '-';
      return new Date(date).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    next();
  } catch (error) {
    console.error('Error in globalSessionData:', error);
    next();
  }
};

module.exports = {
  isAuthenticated,
  requireRole,
  logActivity,
  globalSessionData,
  isVotingAvailable,
};
