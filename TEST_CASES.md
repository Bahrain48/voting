# Test Cases — Sistem E-Voting OSIS & MPK

## Persiapan

1. Jalankan `npm run db:setup`, kemudian `npm start`.
2. Akun demo: Admin `admin/password123`, Panitia `panitia/password123`, Pemilih `pemilih/password123`.
3. Reset seed menghapus semua perubahan pada database lokal. Jangan jalankan pada data pemilihan sebenarnya.
4. TC-01 s.d. TC-05 sudah dijalankan sebagai smoke test browser pada 28 September 2026 menggunakan DPT demo `20240013`. Setelah verifikasi, database dikembalikan ke kondisi seed awal.

## TC-01 — Panitia verifikasi kehadiran dan menerbitkan token

**Prasyarat:** login sebagai `panitia`; DPT `20240013` belum hadir dan token kosong.

1. Buka DPT, cari `Putri Ayu Wandira`.
2. Tekan **Verifikasi**, konfirmasi, dan pastikan status berubah menjadi **Hadir**.
3. Tekan **Generate Token**.
4. Pastikan kartu token menampilkan token acak 64-bit berformat `TK-` diikuti 16 digit heksadesimal dan identitas pemilih.
5. Muat ulang URL kartu token: token tidak boleh terlihat kembali.
6. Kembali ke DPT: token plaintext tidak tampil; tombol generate tidak tersedia lagi.

**Ekspektasi:** event kehadiran dan penerbitan tercatat pada ActivityLog tanpa menyimpan nilai token. Token kedua tidak dapat diterbitkan untuk DPT yang sama.

**Status:** PASS — kehadiran dan token acak berhasil; halaman sukses menampilkan token satu kali.

## TC-02 — Pemilih masuk dengan NISN + token

**Prasyarat:** sesi terbuka dan DPT demo `20240001` belum memilih, hadir, serta memiliki token `TK-A9K2`.

1. Buka `/login`, pilih tab **Bilik Suara**.
2. Masukkan NISN `20240001` dan token `TK-A9K2` (atau gunakan pengisian demo).
3. Kirim formulir.

**Ekspektasi:** dialihkan ke `/bilik-suara`, identitas DPT yang sesuai tampil, dan kartu kandidat beserta visi-misi tersedia. Login akun `pemilih/password123` sendiri tidak boleh melewati validasi token.

**Status:** PASS — NISN/token valid mengakses kartu kandidat; pemilih tanpa token tidak dapat memasuki bilik.

## TC-03 — Pilih Paslon nomor urut 01

**Prasyarat:** sesi bilik suara valid dari TC-02.

1. Pilih kartu Paslon 01.
2. Baca visi dan misi, lalu tekan **Coblos Sekarang**.
3. Setujui dialog konfirmasi.

**Ekspektasi:** form mengirim satu `candidateId` yang valid. Menyegarkan halaman atau mengubah parameter browser tidak dapat mengganti suara setelah dikirim.

**Status:** PASS — Paslon 01 dipilih, form konfirmasi terkirim, dan layar selesai mengonfirmasi suara.

## TC-04 — Suara tercatat satu kali dan token hangus

**Prasyarat:** proses TC-03 berhasil; catat hitungan Paslon 01 sebelum memilih sebagai N.

1. Verifikasi DPT menunjukkan `hasVoted = true` dan `votedAt` terisi.
2. Verifikasi Paslon 01 bertambah tepat satu menjadi N+1.
3. Verifikasi satu baris VoteAudit baru menyimpan `candidateId`, waktu, dan kode verifikasi; model VoteAudit tidak menyimpan identitas pemilih.
4. Pastikan layar selesai menampilkan bukti kode dan token berstatus hangus.
5. Buka quick count sebagai Admin dan Panitia; angka suara/partisipasi harus diperbarui paling lambat setelah polling 5 detik.

**Ekspektasi:** claim token, penambahan suara, dan VoteAudit atomik; jika satu bagian gagal, tidak ada perubahan parsial.

**Status:** PASS — halaman sukses menampilkan Paslon 01 dan kode bukti; status pemilih menjadi sudah memilih. Quick count konsisten diperiksa pada dashboard.

## TC-05 — Pemilihan ulang ditolak

**Prasyarat:** pemilih pada TC-04 sudah `hasVoted = true`.

1. Logout dan coba login bilik sekali lagi dengan NISN/token yang sama.
2. Coba POST coblos ulang menggunakan sesi lama bila masih tersedia.
3. Pastikan hitungan Paslon dan jumlah VoteAudit tetap sama.

**Ekspektasi:** login kedua ditolak karena token hangus; submit bersamaan/replay tidak menambah suara. Quick count tetap akurat.

**Status:** PASS — login kedua memakai NISN/token yang sama ditolak dengan pesan token hangus.

## TC-06 — RBAC dan endpoint quick count

| Permintaan | Hasil yang diharapkan |
|---|---|
| Tanpa login membuka `/admin/dashboard` atau `/panitia/dpt` | Redirect ke login |
| Panitia membuka `/admin/candidates` | HTTP 403 |
| Pemilih membuka `/panitia/dpt` atau `/admin/audit-log` | HTTP 403 |
| Admin membuka route kandidat, sesi, audit, dan quick count | Diizinkan |
| Panitia membuka `/panitia/api/quick-count` | JSON quick count diizinkan |
| Pemilih atau tanpa login meminta endpoint quick count Admin/Panitia | HTTP 403 atau redirect login |

**Status:** PASS sebagian — role Panitia menerima JSON quick count dan membuka `/admin/candidates` menerima HTTP 403. Skenario role Pemilih belum diuji langsung.

## TC-07 — Jadwal dan penguncian sesi

1. Sebagai Admin, set waktu mulai pada masa mendatang; masuk bilik dengan token valid harus ditolak.
2. Set waktu selesai pada masa lampau; masuk dan POST coblos harus ditolak.
3. Hapus waktu mulai/selesai, lalu gunakan tombol **Kunci Sesi**; token tidak dapat dipakai.
4. Buka sesi kembali tanpa jadwal; alur pemilih valid dapat diteruskan.

**Status:** Belum dijalankan.

## TC-08 — Berita acara cetak

1. Login sebagai Panitia dan buka **Cetak Berita Acara**.
2. Pastikan hasil, persentase, total suara, partisipasi, dan waktu cetak sesuai quick count.
3. Gunakan tombol cetak browser dan pastikan navigasi/tombol aplikasi tidak tercetak.

**Status:** Belum dijalankan.

## Hasil eksekusi

Catat tanggal, browser/versi, akun role, hasil aktual, dan bukti setiap skenario saat pengujian dilakukan. Jangan mengubah status menjadi lulus hanya berdasarkan inspeksi kode.
