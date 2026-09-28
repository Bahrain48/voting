const prisma = require('../config/db');
const { logActivity } = require('../middlewares/auth.middleware');

/** Dashboard Admin: Statistik utama & quick count */
const showDashboard = async (req, res) => {
  try {
    const [candidates, totalVoters, presentVoters, hasVotedCount, setting, recentLogs] = await Promise.all([
      prisma.candidate.findMany({ orderBy: { nomorUrut: 'asc' } }),
      prisma.voter.count(),
      prisma.voter.count({ where: { isPresent: true } }),
      prisma.voter.count({ where: { hasVoted: true } }),
      prisma.systemSetting.findFirst(),
      prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);

    const totalSuara = candidates.reduce((a, c) => a + c.suaraCount, 0);
    const participationRate = totalVoters > 0 ? Math.round((hasVotedCount / totalVoters) * 100) : 0;

    res.render('admin/dashboard', {
      title: 'Dashboard Admin - E-Voting OSIS & MPK',
      candidates,
      totalVoters,
      presentVoters,
      hasVotedCount,
      totalSuara,
      participationRate,
      setting,
      recentLogs,
      success: req.query.success || null,
      error: req.query.error || null,
      currentPage: 'dashboard',
    });
  } catch (error) {
    console.error('Error dashboard admin:', error);
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
};

/** Daftar Paslon Kandidat */
const showCandidates = async (req, res) => {
  try {
    const candidates = await prisma.candidate.findMany({ orderBy: { nomorUrut: 'asc' } });
    res.render('admin/candidates/index', {
      title: 'Manajemen Paslon - E-Voting OSIS & MPK',
      candidates,
      currentPage: 'candidates',
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (error) {
    console.error('Error showCandidates:', error);
    res.redirect('/admin/dashboard');
  }
};

/** Form Tambah Kandidat */
const showAddCandidate = (req, res) => {
  res.render('admin/candidates/form', {
    title: 'Tambah Paslon - E-Voting OSIS & MPK',
    candidate: null,
    currentPage: 'candidates',
    error: null,
  });
};

/** Simpan Kandidat Baru */
const createCandidate = async (req, res) => {
  try {
    const { nomorUrut, namaKetua, namaWakil, visi, misi, fotoUrl } = req.body;
    if (!nomorUrut || !namaKetua || !namaWakil || !visi || !misi) {
      return res.render('admin/candidates/form', {
        title: 'Tambah Paslon',
        candidate: req.body,
        currentPage: 'candidates',
        error: 'Semua field wajib diisi.',
      });
    }
    const exists = await prisma.candidate.findUnique({ where: { nomorUrut: Number(nomorUrut) } });
    if (exists) {
      return res.render('admin/candidates/form', {
        title: 'Tambah Paslon',
        candidate: req.body,
        currentPage: 'candidates',
        error: `Nomor urut ${nomorUrut} sudah digunakan paslon lain.`,
      });
    }
    const candidate = await prisma.candidate.create({
      data: {
        nomorUrut: Number(nomorUrut),
        namaKetua: namaKetua.trim(),
        namaWakil: namaWakil.trim(),
        visi: visi.trim(),
        misi: misi.trim(),
        fotoUrl: fotoUrl?.trim() || `/images/paslon${nomorUrut}.svg`,
        suaraCount: 0,
      },
    });
    await logActivity(req.session.user.username, req.session.user.role, 'CREATE_CANDIDATE',
      `Menambahkan Paslon Nomor Urut ${candidate.nomorUrut}: ${candidate.namaKetua} & ${candidate.namaWakil}.`, req.ip);
    res.redirect('/admin/candidates?success=Paslon baru berhasil ditambahkan.');
  } catch (error) {
    console.error('Error createCandidate:', error);
    res.redirect('/admin/candidates?error=Gagal menambahkan paslon.');
  }
};

/** Form Edit Kandidat */
const showEditCandidate = async (req, res) => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { id: Number(req.params.id) } });
    if (!candidate) return res.redirect('/admin/candidates?error=Paslon tidak ditemukan.');
    res.render('admin/candidates/form', {
      title: 'Edit Paslon - E-Voting OSIS & MPK',
      candidate,
      currentPage: 'candidates',
      error: null,
    });
  } catch (error) {
    res.redirect('/admin/candidates');
  }
};

/** Update Kandidat */
const updateCandidate = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nomorUrut, namaKetua, namaWakil, visi, misi, fotoUrl } = req.body;
    await prisma.candidate.update({
      where: { id },
      data: {
        nomorUrut: Number(nomorUrut),
        namaKetua: namaKetua.trim(),
        namaWakil: namaWakil.trim(),
        visi: visi.trim(),
        misi: misi.trim(),
        fotoUrl: fotoUrl?.trim() || `/images/paslon${nomorUrut}.svg`,
      },
    });
    await logActivity(req.session.user.username, req.session.user.role, 'UPDATE_CANDIDATE',
      `Memperbarui data Paslon Nomor Urut ${nomorUrut}: ${namaKetua} & ${namaWakil}.`, req.ip);
    res.redirect('/admin/candidates?success=Data paslon berhasil diperbarui.');
  } catch (error) {
    console.error('Error updateCandidate:', error);
    res.redirect('/admin/candidates?error=Gagal memperbarui data paslon.');
  }
};

/** Hapus Kandidat */
const deleteCandidate = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) return res.redirect('/admin/candidates?error=Paslon tidak ditemukan.');
    const recordedVotes = await prisma.voteAudit.count({ where: { candidateId: id } });
    if (recordedVotes > 0 || candidate.suaraCount > 0) {
      return res.redirect('/admin/candidates?error=Paslon memiliki suara tercatat dan tidak dapat dihapus demi menjaga integritas rekapitulasi.');
    }
    await prisma.candidate.delete({ where: { id } });
    await logActivity(req.session.user.username, req.session.user.role, 'DELETE_CANDIDATE',
      `Menghapus Paslon Nomor Urut ${candidate.nomorUrut}: ${candidate.namaKetua}.`, req.ip);
    res.redirect('/admin/candidates?success=Paslon berhasil dihapus dari sistem.');
  } catch (error) {
    console.error('Error deleteCandidate:', error);
    res.redirect('/admin/candidates?error=Gagal menghapus paslon.');
  }
};

/** Simpan nama pemilihan dan jadwal operasional sesi */
const configureSession = async (req, res) => {
  try {
    const sessionName = String(req.body.sessionName || '').trim();
    const startsAt = req.body.startsAt ? new Date(req.body.startsAt) : null;
    const endsAt = req.body.endsAt ? new Date(req.body.endsAt) : null;

    if (!sessionName || sessionName.length > 180) {
      return res.redirect('/admin/dashboard?error=Nama pemilihan wajib diisi dan maksimal 180 karakter.');
    }
    if ((startsAt && Number.isNaN(startsAt.getTime())) || (endsAt && Number.isNaN(endsAt.getTime()))) {
      return res.redirect('/admin/dashboard?error=Format jadwal tidak valid.');
    }
    if (startsAt && endsAt && startsAt >= endsAt) {
      return res.redirect('/admin/dashboard?error=Waktu mulai harus lebih awal daripada waktu selesai.');
    }

    const current = await prisma.systemSetting.findFirst();
    const data = { sessionName, startsAt, endsAt };
    const setting = current
      ? await prisma.systemSetting.update({ where: { id: current.id }, data })
      : await prisma.systemSetting.create({ data });

    await logActivity(req.session.user.username, req.session.user.role, 'KONFIGURASI_JADWAL',
      `Memperbarui nama dan jadwal pemilihan: ${setting.sessionName}.`, req.ip);
    return res.redirect('/admin/dashboard?success=Konfigurasi nama dan jadwal berhasil disimpan.');
  } catch (error) {
    console.error('Error configureSession:', error);
    return res.redirect('/admin/dashboard?error=Gagal menyimpan konfigurasi sesi.');
  }
};

/** Toggle Buka / Kunci Sesi Pemungutan Suara */
const toggleVotingSession = async (req, res) => {
  try {
    const setting = await prisma.systemSetting.findFirst();
    const newStatus = !setting.isVotingOpen;
    const { lockReason } = req.body;
    await prisma.systemSetting.update({
      where: { id: setting.id },
      data: {
        isVotingOpen: newStatus,
        lockReason: lockReason?.trim() || 'Sesi pemungutan suara telah ditutup oleh Pembina OSIS.',
      },
    });
    const action = newStatus ? 'BUKA_SESI_VOTING' : 'KUNCI_SESI_VOTING';
    const desc = newStatus
      ? 'Sesi pemungutan suara DIBUKA oleh Admin.'
      : `Sesi pemungutan suara DIKUNCI. Alasan: ${lockReason || '-'}`;
    await logActivity(req.session.user.username, req.session.user.role, action, desc, req.ip);
    res.redirect('/admin/dashboard?success=' + encodeURIComponent(desc));
  } catch (error) {
    console.error('Error toggleVoting:', error);
    res.redirect('/admin/dashboard?error=Gagal mengubah status sesi.');
  }
};

/** Audit Log Sistem */
const showAuditLog = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.activityLog.count(),
    ]);
    const totalPages = Math.ceil(total / limit);
    res.render('admin/audit-log', {
      title: 'Audit Log - E-Voting OSIS & MPK',
      logs, page, totalPages, total,
      currentPage: 'audit-log',
      success: req.query.success || null,
    });
  } catch (error) {
    console.error('Error showAuditLog:', error);
    res.redirect('/admin/dashboard');
  }
};

/** Quick Count Real-Time */
const showQuickCount = async (req, res) => {
  try {
    const [candidates, totalVoters, hasVotedCount, setting] = await Promise.all([
      prisma.candidate.findMany({ orderBy: { nomorUrut: 'asc' } }),
      prisma.voter.count(),
      prisma.voter.count({ where: { hasVoted: true } }),
      prisma.systemSetting.findFirst(),
    ]);
    const totalSuara = candidates.reduce((a, c) => a + c.suaraCount, 0);
    res.render('admin/quick-count', {
      title: 'Quick Count Real-Time - E-Voting OSIS & MPK',
      candidates, totalVoters, hasVotedCount, totalSuara, setting,
      currentPage: 'quick-count',
    });
  } catch (error) {
    console.error('Error showQuickCount:', error);
    res.redirect('/admin/dashboard');
  }
};

/** API JSON Quick Count (untuk polling AJAX) */
const apiQuickCount = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const [candidates, hasVotedCount, totalVoters] = await Promise.all([
      prisma.candidate.findMany({ orderBy: { nomorUrut: 'asc' } }),
      prisma.voter.count({ where: { hasVoted: true } }),
      prisma.voter.count(),
    ]);
    const totalSuara = candidates.reduce((a, c) => a + c.suaraCount, 0);
    res.json({ success: true, candidates, totalSuara, hasVotedCount, totalVoters, timestamp: new Date() });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
};

module.exports = {
  showDashboard,
  showCandidates,
  showAddCandidate,
  createCandidate,
  showEditCandidate,
  updateCandidate,
  deleteCandidate,
  toggleVotingSession,
  configureSession,
  showAuditLog,
  showQuickCount,
  apiQuickCount,
};
