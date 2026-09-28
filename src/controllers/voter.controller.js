const prisma = require('../config/db');
const crypto = require('crypto');
const { isVotingAvailable } = require('../middlewares/auth.middleware');

const resolveVoter = async (req) => {
  const sessionVoter = req.session.voterSession;
  if (!sessionVoter) return null;
  const voter = await prisma.voter.findUnique({ where: { id: sessionVoter.id } });
  if (!voter || !sessionVoter.token || voter.token !== sessionVoter.token) return null;
  return voter;
};

/** Halaman Bilik Suara - Tampilkan Paslon & Form Pemilihan */
const showBilikSuara = async (req, res) => {
  try {
    const voter = await resolveVoter(req);

    if (!voter) {
      return res.redirect('/login?error=Sesi bilik suara tidak valid. Silakan masuk kembali.');
    }

    // Cek apakah sudah memilih
    if (voter.hasVoted) {
      return res.redirect('/bilik-suara/selesai?alreadyVoted=true');
    }

    // Cek status sesi voting
    const setting = await prisma.systemSetting.findFirst();
    if (!isVotingAvailable(setting)) {
      return res.render('voter/bilik-terkunci', {
        title: 'Sesi Voting Dikunci - E-Voting OSIS & MPK',
        lockReason: setting.lockReason,
        voter,
      });
    }

    const candidates = await prisma.candidate.findMany({ orderBy: { nomorUrut: 'asc' } });

    res.render('voter/bilik-suara', {
      title: 'Bilik Suara Digital - E-Voting OSIS & MPK',
      voter,
      candidates,
      error: req.query.error || null,
    });
  } catch (error) {
    console.error('Error showBilikSuara:', error);
    res.redirect('/login?error=Terjadi kesalahan pada bilik suara.');
  }
};

/** Proses Pemungutan Suara (Coblos 1 Suara Sah) */
const doVote = async (req, res) => {
  try {
    const candidateId = Number.parseInt(req.body.candidateId, 10);
    const voterSession = req.session.voterSession;

    if (!Number.isSafeInteger(candidateId) || candidateId < 1) {
      return res.redirect('/bilik-suara?error=Pilihan paslon tidak boleh kosong. Silakan pilih salah satu paslon.');
    }

    const voter = await resolveVoter(req);

    if (!voter) {
      return res.redirect('/login?error=Sesi pemilih tidak valid. Silakan masuk kembali.');
    }

    // GUARD: Cegah double voting (Token Hangus Otomatis)
    if (voter.hasVoted) {
      return res.redirect('/bilik-suara?error=PERINGATAN: Hak suara sudah digunakan. Token Anda telah hangus!');
    }

    // Cek sesi voting masih terbuka
    const setting = await prisma.systemSetting.findFirst();
    if (!isVotingAvailable(setting)) {
      return res.redirect('/bilik-suara?error=Sesi pemungutan suara telah dikunci. Hubungi panitia.');
    }

    // Pastikan candidate valid
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) {
      return res.redirect('/bilik-suara?error=Pilihan tidak valid. Paslon tidak ditemukan.');
    }

    // Generate kode verifikasi audit unik (tanpa menghubungkan identitas pemilih)
    const kodeVerifikasi = `AUDIT-P${candidate.nomorUrut}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Klaim pemilih secara kondisional agar dua POST bersamaan tidak bisa
    // menambah dua suara. Pilihan tidak ditulis ke ActivityLog yang beridentitas.
    const committed = await prisma.$transaction(async (tx) => {
      const currentSetting = await tx.systemSetting.findFirst();
      if (!isVotingAvailable(currentSetting)) return 'closed';

      const claim = await tx.voter.updateMany({
        where: {
          id: voter.id,
          token: voterSession.token,
          isPresent: true,
          hasVoted: false,
        },
        data: { hasVoted: true, votedAt: new Date() },
      });
      if (claim.count !== 1) return false;

      await tx.candidate.update({
        where: { id: candidate.id },
        data: { suaraCount: { increment: 1 } },
      });
      await tx.voteAudit.create({
        data: { candidateId: candidate.id, kodeVerifikasi },
      });
      return true;
    });

    if (committed === 'closed') {
      return res.redirect('/bilik-suara?error=Sesi pemungutan suara telah dikunci atau jadwal telah berakhir.');
    }
    if (!committed) {
      return res.redirect('/bilik-suara/selesai?alreadyVoted=true');
    }

    // Hanya bukti generik disimpan di sesi; VoteAudit tidak menyimpan voterId.
    req.session.voteReceipt = {
      voterId: voter.id,
      kodeVerifikasi,
      nomorPaslon: candidate.nomorUrut,
    };
    return res.redirect('/bilik-suara/selesai');
  } catch (error) {
    console.error('Error doVote:', error);
    return res.redirect('/bilik-suara?error=Terjadi kesalahan saat memproses suara. Coba lagi atau hubungi panitia.');
  }
};

/** Halaman Konfirmasi Sukses Memilih */
const showSelesai = async (req, res) => {
  try {
    const voterSession = req.session.voterSession;
    const voter = voterSession
      ? await prisma.voter.findUnique({ where: { id: voterSession.id } })
      : null;
    const receipt = req.session.voteReceipt;
    const validReceipt = Boolean(receipt && voter && receipt.voterId === voter.id && voter.hasVoted);
    const alreadyVoted = req.query.alreadyVoted === 'true' || Boolean(voter?.hasVoted && !validReceipt);

    if (!validReceipt && !alreadyVoted) return res.redirect('/login?error=Sesi bukti pemilihan tidak valid. Masuk kembali dengan NISN dan token.');

    res.render('voter/selesai', {
      title: 'Pemungutan Suara Selesai - E-Voting OSIS & MPK',
      kodeVerifikasi: validReceipt ? receipt.kodeVerifikasi : '-',
      nomorPaslon: validReceipt ? receipt.nomorPaslon : '-',
      voter,
      alreadyVoted,
    });
  } catch (error) {
    console.error('Error showSelesai:', error);
    res.render('voter/selesai', {
      title: 'Pemungutan Suara Selesai',
      kodeVerifikasi: '-',
      nomorPaslon: '-',
      voter: null,
      alreadyVoted: false,
    });
  }
};

module.exports = {
  showBilikSuara,
  doVote,
  showSelesai,
};
