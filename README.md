# Sistem E-Voting Pemilihan OSIS & MPK

Aplikasi pemungutan suara digital berbasis token sekali pakai untuk pemilihan Ketua/Wakil Ketua OSIS dan MPK. Dibangun dengan Node.js, Express, Prisma ORM, SQLite, EJS, dan antarmuka dashboard light yang responsif.

## Fitur

- RBAC tiga role: `ADMIN`, `PANITIA_TPS`, dan `PEMILIH`; endpoint sensitif memberi HTTP 403 untuk role yang tidak berhak.
- Admin mengelola paslon, membuka/mengunci sesi, mengatur waktu mulai/selesai, memantau quick count, dan meninjau audit aktivitas.
- Panitia memverifikasi kehadiran DPT, menerbitkan token sekali pakai, memantau quick count, dan mencetak berita acara melalui browser/PDF.
- Pemilih masuk menggunakan NISN dan token, membandingkan visi-misi, memberikan satu suara, lalu menerima bukti sukses.
- Klaim suara, penandaan `hasVoted`, penambahan perolehan paslon, dan catatan VoteAudit disimpan dalam transaksi database. Pilihan tidak dicatat bersama identitas pada ActivityLog.
- Quick count diperbarui otomatis setiap 5 detik.

## Persyaratan

- Node.js 18 atau lebih baru
- npm

## Instalasi dan menjalankan

1. Instal dependensi: `npm install`
2. Pastikan `.env` tersedia. Contoh:

   ```dotenv
   PORT=3000
   DATABASE_URL="file:./dev.db"
   SESSION_SECRET="ganti-dengan-rahasia-acak-yang-panjang"
   ```

3. Siapkan database, generate Prisma Client, dan isi data demo: `npm run db:setup`
4. Jalankan aplikasi: `npm run dev` (atau `npm start`)
5. Buka alamat yang tercetak di terminal. Jika port 3000 sedang dipakai, server mencoba port berikutnya.

`npm run db:setup` menjalankan `prisma generate`, `prisma db push`, dan seed. **Seed menghapus lalu membuat ulang data demo**, jadi jangan jalankan pada database berisi data pemilihan nyata. Untuk hanya menjalankan seed: `npm run seed`. Prisma Studio: `npm run prisma:studio`.

## Akun demo

| Role | Login staf | Kredensial |
|---|---|---|
| Admin | `admin` | `password123` |
| Panitia TPS | `panitia` | `password123` |
| Pemilih demo | `pemilih` | `password123` |

Login akun demo `pemilih` hanya memverifikasi role. Untuk benar-benar menggunakan bilik, tetap harus login melalui tab **Bilik Suara** dengan NISN dan token. Setelah seed awal, tersedia pemilih demo `20240001` dengan token `TK-A9K2`; token tersebut akan hangus setelah digunakan. Penguji dapat memakai pemilih DPT belum hadir untuk mencoba alur verifikasi dan penerbitan token sebagai Panitia.

## Struktur utama

- `src/controllers/`: logika alur aplikasi
- `src/routes/`: pemetaan endpoint dan pembatasan role
- `src/middlewares/`: autentikasi, pemeriksaan role, data sesi, dan jadwal
- `src/config/db.js`: singleton Prisma Client
- `prisma/schema.prisma`: model User, Candidate, Voter, VoteAudit, SystemSetting, ActivityLog
- `prisma/seed.js`: data akun, kandidat, DPT, audit, dan aktivitas demo
- `views/`: halaman EJS untuk tiap role
- `public/`: CSS, JavaScript, dan aset statis

## Data dan kerahasiaan suara

`VoteAudit` menyimpan pasangan calon, waktu, dan kode verifikasi unik tanpa FK ke pemilih. `Voter` hanya menyimpan status penggunaan token (`hasVoted`/`votedAt`), tidak menyimpan kandidat pilihan. ActivityLog tidak merekam pilihan kandidat ataupun token plaintext. Quick count ditampilkan untuk Admin dan Panitia saja.

Ini merupakan aplikasi praktik/demo; sebelum pemilihan resmi, ganti seluruh kredensial demo, gunakan `SESSION_SECRET` acak dan HTTPS, tambahkan kebijakan backup/retensi, uji beban serta audit keamanan independen, dan siapkan prosedur manual bila jaringan/database bermasalah.

## Pengujian

Skenario uji fungsional, RBAC, dan keamanan tercatat di [TEST_CASES.md](TEST_CASES.md). Jalankan `npm test` untuk pengujian otomatis yang tersedia.
