const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Memulai Seeding Database E-Voting OSIS & MPK...');

  // 1. Bersihkan Data Lama
  await prisma.voteAudit.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.voter.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash Password Demo
  const defaultPassword = await bcrypt.hash('password123', 10);

  // 3. Buat Akun Demo Multi-Role (ADMIN, PANITIA_TPS, PEMILIH)
  const users = [
    {
      username: 'admin',
      password: defaultPassword,
      nama: 'Drs. H. Hendra Wijaya, M.Pd (Pembina OSIS)',
      role: 'ADMIN',
    },
    {
      username: 'panitia',
      password: defaultPassword,
      nama: 'Siti Rahmawati, S.Kom (Operator TPS 01)',
      role: 'PANITIA_TPS',
    },
    {
      username: 'pemilih',
      password: defaultPassword,
      nama: 'Ahmad Rizky Pratama (Siswa DPT)',
      role: 'PEMILIH',
    },
  ];

  for (const user of users) {
    await prisma.user.create({ data: user });
  }
  console.log('✅ Akun User (Admin, Panitia, Pemilih) berhasil dibuat.');

  // 4. Konfigurasi Sistem Voting
  await prisma.systemSetting.create({
    data: {
      sessionName: 'Pemilihan Ketua & Wakil Ketua OSIS/MPK SMK Telkom Lampung Masa Bakti 2026/2027',
      isVotingOpen: true,
      lockReason: 'Sesi pemungutan suara telah ditutup resmi oleh Komisi Pemilihan OSIS.',
    },
  });
  console.log('✅ Pengaturan Sesi Pemilihan Aktif.');

  // 5. Data Pasangan Calon (Kandidat)
  const candidatesData = [
    {
      nomorUrut: 1,
      namaKetua: 'Muhammad Fadhil Ramadhan',
      namaWakil: 'Aisyah Putri Azzahra',
      visi: 'Mewujudkan OSIS SMK Telkom yang Inovatif, Berkarakter Digital, dan Berwawasan Global berlandaskan Akhlak Mulia.',
      misi: '1. Mengoptimalkan kegiatan siswa berbasis riset teknologi informasi dan coding hub.\n2. Mengadakan festival tahunan Telkom Tech & Creative Fest.\n3. Memfasilitasi aspirasi siswa melalui platform digital responsif.\n4. Menguatkan kepedulian sosial dan solidaritas antar jurusan.',
      fotoUrl: '/images/paslon1.svg',
      suaraCount: 4,
    },
    {
      nomorUrut: 2,
      namaKetua: 'Bagas Satria Wibowo',
      namaWakil: 'Nabila Zahra Maharani',
      visi: 'Mewujudkan OSIS yang Bersinergi, Progresif, Mandiri, dan Aktif Mengembangkan Potensi Kreatif Pelajar.',
      misi: '1. Menumbuhkan jiwa kepemimpinan dan wirausaha digital (Digital Technopreneur).\n2. Membina prestasi ekstrakurikuler akademik, olahraga, dan seni hingga tingkat nasional.\n3. Menciptakan lingkungan sekolah ramah lingkungan (Zero Waste & Green School).\n4. Meningkatkan kolaborasi aktif dengan alumni dan industri mitra.',
      fotoUrl: '/images/paslon2.svg',
      suaraCount: 3,
    },
    {
      nomorUrut: 3,
      namaKetua: 'Dimas Arya Pangestu',
      namaWakil: 'Clarissa Aurelia Chandra',
      visi: 'Membentuk Pelajar SMK Telkom yang Unggul dalam Prestasi, Berintegritas Tinggi, dan Berdaya Saing Industri 5.0.',
      misi: '1. Menggelar workshop bootcamp persiapan sertifikasi industri internasional.\n2. Menyelenggarakan pekan olahraga dan E-Sport Championship bergengsi antar kelas.\n3. Meningkatkan kedisiplinan dan budaya 5S (Senyum, Sapa, Salam, Sopan, Santun).\n4. Membangun sinergi harmonis antara OSIS dan MPK dalam pengawasan program.',
      fotoUrl: '/images/paslon3.svg',
      suaraCount: 2,
    },
  ];

  const createdCandidates = [];
  for (const c of candidatesData) {
    const candidate = await prisma.candidate.create({ data: c });
    createdCandidates.push(candidate);
  }
  console.log('✅ Data Paslon Kandidat (01, 02, 03) berhasil diisi.');

  // 6. Data DPT (Daftar Pemilih Tetap)
  const votersData = [
    // Pemilih Demo yang terhubung dengan akun demo (hadir dan memiliki token aktif)
    {
      nisn: '20240001',
      nama: 'Ahmad Rizky Pratama',
      kelas: 'XII RPL 1',
      token: 'TK-A9K2',
      isPresent: true,
      hasVoted: false,
      votedAt: null,
    },
    // Pemilih yang sudah menggunakan hak suara
    {
      nisn: '20240002',
      nama: 'Dewi Lestari Anggraeni',
      kelas: 'XII RPL 1',
      token: 'TK-B7R4',
      isPresent: true,
      hasVoted: true,
      votedAt: new Date(Date.now() - 3600000 * 2),
    },
    {
      nisn: '20240003',
      nama: 'Fauzan Maulana Ihsan',
      kelas: 'XII TKJ 2',
      token: 'TK-C3M9',
      isPresent: true,
      hasVoted: true,
      votedAt: new Date(Date.now() - 3600000 * 1.8),
    },
    {
      nisn: '20240004',
      nama: 'Gita Maharani Putri',
      kelas: 'XII TKJ 1',
      token: 'TK-D2F8',
      isPresent: true,
      hasVoted: true,
      votedAt: new Date(Date.now() - 3600000 * 1.5),
    },
    {
      nisn: '20240005',
      nama: 'Hafiz Danendra Syah',
      kelas: 'XI RPL 1',
      token: 'TK-E5W1',
      isPresent: true,
      hasVoted: true,
      votedAt: new Date(Date.now() - 3600000 * 1.2),
    },
    {
      nisn: '20240006',
      nama: 'Indah Kusuma Wardani',
      kelas: 'XI RPL 2',
      token: 'TK-F8K3',
      isPresent: true,
      hasVoted: true,
      votedAt: new Date(Date.now() - 3600000 * 1.0),
    },
    {
      nisn: '20240007',
      nama: 'Joko Tri Wahyudi',
      kelas: 'XI TKJ 1',
      token: 'TK-G4N6',
      isPresent: true,
      hasVoted: true,
      votedAt: new Date(Date.now() - 3600000 * 0.8),
    },
    {
      nisn: '20240008',
      nama: 'Kevin Aditya Pratama',
      kelas: 'XI TKJ 2',
      token: 'TK-H9V2',
      isPresent: true,
      hasVoted: true,
      votedAt: new Date(Date.now() - 3600000 * 0.6),
    },
    {
      nisn: '20240009',
      nama: 'Larasati Dian Pertiwi',
      kelas: 'X TEL 1',
      token: 'TK-J1X7',
      isPresent: true,
      hasVoted: true,
      votedAt: new Date(Date.now() - 3600000 * 0.4),
    },
    {
      nisn: '20240010',
      nama: 'Muhammad Alif Nugroho',
      kelas: 'X TEL 2',
      token: 'TK-K6P5',
      isPresent: true,
      hasVoted: true,
      votedAt: new Date(Date.now() - 3600000 * 0.2),
    },
    // Pemilih yang sudah hadir di TPS & memegang token, tapi belum mencoblos (Ready to vote)
    {
      nisn: '20240011',
      nama: 'Nabila Syahrani',
      kelas: 'X RPL 1',
      token: 'TK-L3Y8',
      isPresent: true,
      hasVoted: false,
      votedAt: null,
    },
    {
      nisn: '20240012',
      nama: 'Oki Setiawan',
      kelas: 'X RPL 2',
      token: 'TK-M5Z1',
      isPresent: true,
      hasVoted: false,
      votedAt: null,
    },
    // Pemilih yang belum hadir di TPS (token belum dibuat)
    {
      nisn: '20240013',
      nama: 'Putri Ayu Wandira',
      kelas: 'X TKJ 1',
      token: null,
      isPresent: false,
      hasVoted: false,
      votedAt: null,
    },
    {
      nisn: '20240014',
      nama: 'Rian Hidayatullah',
      kelas: 'X TKJ 2',
      token: null,
      isPresent: false,
      hasVoted: false,
      votedAt: null,
    },
    {
      nisn: '20240015',
      nama: 'Salsabila Firdaus',
      kelas: 'XI TEL 1',
      token: null,
      isPresent: false,
      hasVoted: false,
      votedAt: null,
    },
    {
      nisn: '20240016',
      nama: 'Taufik Qurrahman',
      kelas: 'XI TEL 2',
      token: null,
      isPresent: false,
      hasVoted: false,
      votedAt: null,
    },
    {
      nisn: '20240017',
      nama: 'Vina Anggita Sari',
      kelas: 'XII RPL 2',
      token: null,
      isPresent: false,
      hasVoted: false,
      votedAt: null,
    },
    {
      nisn: '20240018',
      nama: 'Wahyu Hidayat',
      kelas: 'XII TKJ 1',
      token: null,
      isPresent: false,
      hasVoted: false,
      votedAt: null,
    },
  ];

  for (const voter of votersData) {
    await prisma.voter.create({ data: voter });
  }
  console.log(`✅ Data DPT Pemilih (${votersData.length} siswa) berhasil diisi.`);

  // 7. Data VoteAudit (Suara anonim yang masuk ke paslon untuk LUBER-JURDIL)
  // Paslon 1 (4 suara), Paslon 2 (3 suara), Paslon 3 (2 suara) -> Total 9 suara
  const auditEntries = [
    { candidateId: createdCandidates[0].id, kodeVerifikasi: 'AUDIT-P1-8F71E2A' },
    { candidateId: createdCandidates[0].id, kodeVerifikasi: 'AUDIT-P1-3C99B0D' },
    { candidateId: createdCandidates[0].id, kodeVerifikasi: 'AUDIT-P1-7E12A4F' },
    { candidateId: createdCandidates[0].id, kodeVerifikasi: 'AUDIT-P1-1A44C8E' },
    { candidateId: createdCandidates[1].id, kodeVerifikasi: 'AUDIT-P2-9B55F3C' },
    { candidateId: createdCandidates[1].id, kodeVerifikasi: 'AUDIT-P2-2D88E1A' },
    { candidateId: createdCandidates[1].id, kodeVerifikasi: 'AUDIT-P2-6F33A9D' },
    { candidateId: createdCandidates[2].id, kodeVerifikasi: 'AUDIT-P3-4E66C2B' },
    { candidateId: createdCandidates[2].id, kodeVerifikasi: 'AUDIT-P3-5A77D1F' },
  ];

  for (const audit of auditEntries) {
    await prisma.voteAudit.create({ data: audit });
  }
  console.log(`✅ Data Audit Suara Sah (${auditEntries.length} suara anonim) berhasil diisi.`);

  // 8. Activity Log Awal
  const sampleLogs = [
    {
      username: 'admin',
      role: 'ADMIN',
      action: 'INISIALISASI_SISTEM',
      details: 'Inisialisasi sistem pemilihan E-Voting OSIS & MPK masa bakti 2026/2027.',
    },
    {
      username: 'admin',
      role: 'ADMIN',
      action: 'BUKA_SESI',
      details: 'Membuka gerbang sesi bilik e-voting untuk TPS 01 SMK Telkom Lampung.',
    },
    {
      username: 'panitia',
      role: 'PANITIA_TPS',
      action: 'VERIFIKASI_KEHADIRAN',
      details: 'Verifikasi kehadiran fisik DPT NISN 20240001 (Ahmad Rizky Pratama) di meja registrasi.',
    },
    {
      username: 'panitia',
      role: 'PANITIA_TPS',
      action: 'GENERATE_TOKEN',
      details: 'Menerbitkan token sekali pakai untuk pemilih Ahmad Rizky Pratama.',
    },
  ];

  for (const log of sampleLogs) {
    await prisma.activityLog.create({ data: log });
  }
  console.log('✅ Audit Log Aktivitas Awal tersimpan.');

  console.log('🎉 SEEDING SELESAI DENGAN SUKSES!');
}

main()
  .catch((e) => {
    console.error('❌ Gagal Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
