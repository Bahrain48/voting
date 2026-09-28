const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const indexRoutes = require('./routes/index.routes');
const adminRoutes = require('./routes/admin.routes');
const panitiaRoutes = require('./routes/panitia.routes');
const voterRoutes = require('./routes/voter.routes');
const prisma = require('./config/db');
const { globalSessionData } = require('./middlewares/auth.middleware');

const app = express();
let currentPort = Number(process.env.PORT) || 3000;

// 1. View Engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// 2. Core Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 3. Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'evoting-osis-mpk-secret-fallback-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 4, // 4 jam
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
}));

// 4. Global Template Data Injector (user session, system setting, formatters)
app.use(globalSessionData);

// 5. Mount Routes
app.use('/', indexRoutes);
app.use('/admin', adminRoutes);
app.use('/panitia', panitiaRoutes);
app.use('/bilik-suara', voterRoutes);

// 6. 404 Route Handler
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: '404 - Halaman Tidak Ditemukan - E-Voting OSIS & MPK',
    path: req.originalUrl,
  });
});

// 7. Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled Error:', err);
  res.status(500).render('errors/500', {
    title: '500 - Terjadi Kesalahan Server',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Terjadi kesalahan internal.',
  });
});

// 8. Graceful Shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('\n🛑 Server E-Voting OSIS & MPK dimatikan dengan aman.');
  process.exit(0);
});

// 9. Auto Port Fallback Startup
function startServer(port) {
  const server = app.listen(port, () => {
    console.log('=======================================================');
    console.log('🗳️  SISTEM E-VOTING OSIS & MPK — SMK TELKOM LAMPUNG');
    console.log('📡  Tech Stack: Node.js + Express + EJS + Prisma + SQLite');
    console.log(`🌐  Akses Server: http://localhost:${port}`);
    console.log('-------------------------------------------------------');
    console.log('👤  Demo Login:');
    console.log('    Admin   → username: admin  / password: password123');
    console.log('    Panitia → username: panitia / password: password123');
    console.log('    Pemilih → username: pemilih / password: password123');
    console.log('    Bilik   → NISN: 20240001  / Token: TK-A9K2');
    console.log('=======================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} digunakan. Mencoba port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server error:', err);
    }
  });
}

startServer(currentPort);
