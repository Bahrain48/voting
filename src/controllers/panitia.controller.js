const prisma = require('../config/db');
const crypto = require('crypto');
const { logActivity } = require('../middlewares/auth.middleware');

/** Dashboard Panitia TPS */
const showDashboard = async (req, res) => {
  try {
    const [totalVoters, presentVoters, hasVotedCount, tokenIssued, candidates, setting] = await Promise.all([
      prisma.voter.count(),
      prisma.voter.count({ where: { isPresent: true } }),
      prisma.voter.count({ where: { hasVoted: true } }),
      prisma.voter.count({ where: { token: { not: null } } }),
      prisma.candidate.findMany({ orderBy: { nomorUrut: 'asc' } }),
      prisma.systemSetting.findFirst(),
    ]);
    res.render('panitia/dashboard', {
      title: 'Dashboard Panitia TPS - E-Voting OSIS & MPK',
      totalVoters, presentVoters, hasVotedCount, tokenIssued,
      candidates, setting,
      currentPage: 'dashboard',
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (error) {
    console.error('Error panitia dashboard:', error);
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
};

/** Daftar DPT & Verifikasi Kehadiran */
const showDPT = async (req, res) => {
  try {
    const { search, status } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { nama: { contains: search } },
        { nisn: { contains: search } },
        { kelas: { contains: search } },
      ];
    }
    if (status === 'hadir') where.isPresent = true;
    else if (status === 'belum') where.isPresent = false;
    else if (status === 'sudah-pilih') where.hasVoted = true;
    else if (status === 'belum-pilih') { where.isPresent = true; where.hasVoted = false; }

    const [voters, total, presentCount, hasVotedCount, notPresentCount] = await Promise.all([
      prisma.voter.findMany({ where, orderBy: { nama: 'asc' } }),
      prisma.voter.count(),
      prisma.voter.count({ where: { isPresent: true } }),
      prisma.voter.count({ where: { hasVoted: true } }),
      prisma.voter.count({ where: { isPresent: false } }),
    ]);

    res.render('panitia/dpt', {
      title: 'Daftar Pemilih Tetap - E-Voting OSIS & MPK',
      voters, total, presentCount, hasVotedCount, notPresentCount,
      search: search || '',
      status: status || '',
      currentPage: 'dpt',
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (error) {
    console.error('Error showDPT:', error);
    res.redirect('/panitia/dashboard');
  }
};

/** Verifikasi Kehadiran Fisik Pemilih di TPS */
const verifyPresence = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const voter = await prisma.voter.findUnique({ where: { id } });
    if (!voter) return res.redirect('/panitia/dpt?error=Pemilih tidak ditemukan dalam DPT.');
    if (voter.isPresent) return res.redirect('/panitia/dpt?error=Pemilih ini sudah terverifikasi kehadirannya.');

    await prisma.voter.update({ where: { id }, data: { isPresent: true } });
    await logActivity(req.session.user.username, req.session.user.role, 'VERIFIKASI_KEHADIRAN',
      `Verifikasi kehadiran fisik: ${voter.nama} (NISN: ${voter.nisn}, Kelas: ${voter.kelas}) di meja TPS.`, req.ip);

    res.redirect(`/panitia/dpt?success=Kehadiran ${voter.nama} berhasil diverifikasi. Silakan generate token.`);
  } catch (error) {
    console.error('Error verifyPresence:', error);
    res.redirect('/panitia/dpt?error=Gagal memverifikasi kehadiran.');
  }
};

/** Generate Token Voting Sekali Pakai */
const generateToken = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const voter = await prisma.voter.findUnique({ where: { id } });

    if (!voter) return res.redirect('/panitia/dpt?error=Pemilih tidak ditemukan.');
    if (!voter.isPresent) return res.redirect('/panitia/dpt?error=Verifikasi kehadiran fisik terlebih dahulu sebelum generate token.');
    if (voter.hasVoted) return res.redirect('/panitia/dpt?error=Pemilih ini sudah menggunakan hak suaranya. Token tidak dapat digenerate ulang.');

    if (voter.token) {
      return res.redirect('/panitia/dpt?error=Token sudah diterbitkan. Token aktif tidak dapat diganti atau diterbitkan ulang.');
    }

    // Token acak kriptografis, tanpa NISN atau data identitas di dalamnya.
    let finalToken = `TK-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    // Pastikan token benar-benar unik
    let attempt = 0;
    while (await prisma.voter.findUnique({ where: { token: finalToken } })) {
      attempt++;
      finalToken = `TK-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      if (attempt > 10) throw new Error('Tidak dapat menghasilkan token unik.');
    }

    const issued = await prisma.voter.updateMany({
      where: { id, isPresent: true, hasVoted: false, token: null },
      data: { token: finalToken },
    });
    if (issued.count !== 1) {
      return res.redirect('/panitia/dpt?error=Status pemilih berubah atau token sudah diterbitkan. Muat ulang DPT.');
    }
    await logActivity(req.session.user.username, req.session.user.role, 'GENERATE_TOKEN',
      `Menerbitkan token sekali pakai untuk ${voter.nama} (NISN: ${voter.nisn}).`, req.ip);

    req.session.issuedToken = { voterId: id, token: finalToken };
    res.redirect(`/panitia/token-sukses/${id}`);
  } catch (error) {
    console.error('Error generateToken:', error);
    res.redirect('/panitia/dpt?error=Gagal generate token voting.');
  }
};

/** Halaman Sukses Token Diterbitkan */
const showTokenSukses = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const voter = await prisma.voter.findUnique({ where: { id } });
    const issuedToken = req.session.issuedToken;
    const token = issuedToken?.voterId === id ? issuedToken.token : null;
    if (issuedToken?.voterId === id) delete req.session.issuedToken;
    if (!voter || !token || voter.token !== token) return res.redirect('/panitia/dpt?error=Kartu token hanya tersedia sesaat setelah token diterbitkan.');
    res.render('panitia/token-sukses', {
      title: 'Token Berhasil Diterbitkan',
      voter, token,
      currentPage: 'dpt',
    });
  } catch (error) {
    res.redirect('/panitia/dpt');
  }
};

/** Quick Count (view Panitia) */
const showQuickCount = async (req, res) => {
  try {
    const [candidates, totalVoters, hasVotedCount, setting] = await Promise.all([
      prisma.candidate.findMany({ orderBy: { nomorUrut: 'asc' } }),
      prisma.voter.count(),
      prisma.voter.count({ where: { hasVoted: true } }),
      prisma.systemSetting.findFirst(),
    ]);
    const totalSuara = candidates.reduce((a, c) => a + c.suaraCount, 0);
    res.render('panitia/quick-count', {
      title: 'Monitoring Quick Count - E-Voting OSIS & MPK',
      candidates, totalVoters, hasVotedCount, totalSuara, setting,
      currentPage: 'quick-count',
    });
  } catch (error) {
    res.redirect('/panitia/dashboard');
  }
};

/** Cetak Berita Acara Rekapitulasi Suara (Print-friendly) */
const showBeritaAcara = async (req, res) => {
  try {
    const [candidates, voters, hasVotedCount, totalVoters, setting, auditLogs] = await Promise.all([
      prisma.candidate.findMany({ orderBy: { nomorUrut: 'asc' } }),
      prisma.voter.findMany({ orderBy: { nama: 'asc' } }),
      prisma.voter.count({ where: { hasVoted: true } }),
      prisma.voter.count(),
      prisma.systemSetting.findFirst(),
      prisma.voteAudit.findMany({ include: { candidate: true }, orderBy: { waktuCoblos: 'desc' } }),
    ]);
    const totalSuara = candidates.reduce((a, c) => a + c.suaraCount, 0);
    const winner = candidates.length > 0
      ? candidates.reduce((a, b) => (a.suaraCount > b.suaraCount ? a : b))
      : null;

    res.render('panitia/berita-acara', {
      title: 'Berita Acara Rekapitulasi Suara - E-Voting OSIS & MPK',
      candidates, voters, hasVotedCount, totalVoters,
      totalSuara, setting, auditLogs, winner,
      printedBy: req.session.user.nama,
      printedAt: new Date(),
      currentPage: 'berita-acara',
    });
  } catch (error) {
    console.error('Error showBeritaAcara:', error);
    res.redirect('/panitia/dashboard');
  }
};

module.exports = {
  showDashboard,
  showDPT,
  verifyPresence,
  generateToken,
  showTokenSukses,
  showQuickCount,
  showBeritaAcara,
};
