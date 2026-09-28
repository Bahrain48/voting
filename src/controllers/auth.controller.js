const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { logActivity, isVotingAvailable } = require('../middlewares/auth.middleware');

const regenerateSession = (req) => new Promise((resolve, reject) => {
  req.session.regenerate((error) => error ? reject(error) : resolve());
});

/**
 * Tampilkan Halaman Login (Dilengkapi Quick Demo Switcher)
 */
const showLogin = async (req, res) => {
  // Jika sudah login, arahkan langsung ke dashboard sesuai role
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === 'ADMIN') return res.redirect('/admin/dashboard');
    if (role === 'PANITIA_TPS') return res.redirect('/panitia/dashboard');
    if (role === 'PEMILIH' && req.session.voterSession) return res.redirect('/bilik-suara');
  }

  // Dapatkan sample token aktif untuk kemudahan demo penguji
  const sampleVoter = await prisma.voter.findFirst({
    where: { isPresent: true, hasVoted: false, token: { not: null } },
  });

  res.render('auth/login', {
    title: 'Login Sistem E-Voting OSIS & MPK - SMK Telkom',
    error: req.query.error || null,
    success: req.query.success || null,
    sampleVoter: sampleVoter || { nisn: '20240001', token: 'TK-A9K2' },
  });
};

/**
 * Proses Autentikasi Pengguna Multi-Role (Admin, Panitia, Pemilih)
 */
const handleLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.redirect('/login?error=Username dan password wajib diisi.');
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user) {
      return res.redirect('/login?error=Akun tidak ditemukan. Periksa kembali username Anda.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.redirect('/login?error=Password salah. Silakan coba kembali.');
    }

    // Rotasi ID sesi setelah autentikasi untuk mencegah session fixation.
    await regenerateSession(req);

    // Akun demo pemilih hanya mengautentikasi role; bilik tetap wajib NISN + token.
    req.session.user = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
    };

    await logActivity(
      user.username,
      user.role,
      'LOGIN',
      `Pengguna ${user.nama} (${user.role}) berhasil masuk ke sistem.`,
      req.ip
    );

    // Redirect berdasarkan Role Matrix
    if (user.role === 'ADMIN') {
      return res.redirect('/admin/dashboard');
    } else if (user.role === 'PANITIA_TPS') {
      return res.redirect('/panitia/dashboard');
    } else {
      return res.redirect('/login?success=Login demo pemilih berhasil. Gunakan tab Bilik Suara dengan NISN dan token dari panitia.');
    }
  } catch (error) {
    console.error('Error saat login:', error);
    return res.redirect('/login?error=Terjadi kesalahan pada server saat autentikasi.');
  }
};

/**
 * Autentikasi Khusus Bilik Suara: Masuk Menggunakan NISN & Token Sekali Pakai
 */
const handleBilikLogin = async (req, res) => {
  try {
    const { nisn, token } = req.body;

    if (!nisn || !token) {
      return res.redirect('/login?error=NISN dan Token Voting wajib diisi untuk masuk bilik suara.');
    }

    const cleanNisn = nisn.trim();
    const cleanToken = token.trim().toUpperCase();

    // 1. Cek apakah sesi pemungutan suara sedang dibuka oleh Admin
    const setting = await prisma.systemSetting.findFirst();
    if (!isVotingAvailable(setting)) {
      return res.redirect(
        `/login?error=Sesi pemungutan suara belum dibuka atau berada di luar jadwal. ${setting?.lockReason || 'Hubungi panitia.'}`
      );
    }

    // 2. Cek apakah DPT valid
    const voter = await prisma.voter.findUnique({
      where: { nisn: cleanNisn },
    });

    if (!voter) {
      return res.redirect('/login?error=NISN tidak terdaftar dalam Daftar Pemilih Tetap (DPT).');
    }

    // 3. Cek kehadiran fisik di TPS
    if (!voter.isPresent) {
      return res.redirect(
        '/login?error=Anda belum tercatat hadir di meja TPS. Silakan lapor ke panitia untuk verifikasi fisik.'
      );
    }

    // 4. Cek apakah sudah pernah memilih (Token Hangus)
    if (voter.hasVoted) {
      return res.redirect(
        '/login?error=Hak suara untuk NISN ini SUDAH DIGUNAKAN! Token Anda telah hangus secara otomatis.'
      );
    }

    // 5. Cek token kesesuaian
    if (!voter.token || voter.token.toUpperCase() !== cleanToken) {
      return res.redirect(
        '/login?error=Token voting tidak cocok atau belum diterbitkan. Minta token baru kepada Panitia TPS.'
      );
    }

    // Sukses: rotasi sesi dan ikat sesi bilik ke satu token DPT tertentu.
    await regenerateSession(req);
    req.session.user = {
      id: voter.id,
      username: voter.nisn,
      nama: voter.nama,
      role: 'PEMILIH',
    };

    req.session.voterSession = {
      id: voter.id,
      nisn: voter.nisn,
      nama: voter.nama,
      kelas: voter.kelas,
      token: voter.token,
    };

    return res.redirect('/bilik-suara');
  } catch (error) {
    console.error('Error saat login bilik:', error);
    return res.redirect('/login?error=Terjadi kendala saat memvalidasi token bilik suara.');
  }
};

/**
 * Logout Pengguna
 */
const handleLogout = async (req, res) => {
  try {
    if (req.session && req.session.user) {
      await logActivity(
        req.session.user.username,
        req.session.user.role,
        'LOGOUT',
        `Pengguna ${req.session.user.nama} telah keluar dari sistem.`,
        req.ip
      );
    }
    req.session.destroy((err) => {
      if (err) console.error('Gagal destroy session:', err);
      res.redirect('/login?success=Anda telah berhasil keluar dari sistem E-Voting.');
    });
  } catch (error) {
    console.error('Error saat logout:', error);
    res.redirect('/login');
  }
};

module.exports = {
  showLogin,
  handleLogin,
  handleBilikLogin,
  handleLogout,
};
