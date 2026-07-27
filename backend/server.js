require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const helmet       = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB    = require('./config/db');
const routes       = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');
const { authLimiter, passwordResetLimiter } = require('./middleware/rateLimit');

// Fail fast on a mis-configured environment (missing JWT_SECRET/MONGO_URI, etc.)
require('./config/checkEnv')();

const app = express();
app.set('trust proxy', 1); // correct client IPs behind a proxy (for rate limiting)

// Connect MongoDB
connectDB();

// ── Security middleware ──────────────────────────────────────────────────────
// helmet sets safe HTTP headers. crossOriginResourcePolicy is relaxed so the
// SPA (a different origin) can still load /uploads images (logos, stamps).
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS allow-list is env-driven (CORS_ORIGINS="https://a.com,https://b.com").
// Falls back to the local dev ports when unset. Also allows any *.vercel.app
// origin by default (covers production + preview deploys) — set
// ALLOW_VERCEL=false to lock that off. Trailing slashes are tolerated.
const clean = (u) => String(u || '').trim().replace(/\/$/, '');
const staticOrigins = (process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(clean)
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000']);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;                       // same-origin / curl / server-to-server
  const o = clean(origin);
  if (staticOrigins.includes(o)) return true;
  if (process.env.ALLOW_VERCEL !== 'false' && /\.vercel\.app$/.test(o)) return true;
  return false;
};

app.use(cors({
  // Return false (never throw) so a disallowed preflight still gets a clean
  // response instead of a 500.
  origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize()); // strip $ / . operators from inputs → blocks NoSQL injection
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Brute-force protection on the login endpoints only. We deliberately do NOT
// add a global per-IP limiter: schools commonly share ONE public IP (NAT) and
// the app polls frequently, so a global cap would throttle whole schools.
// Production DoS protection belongs at the proxy/CDN layer.
app.use('/api/auth/login', authLimiter);
app.use('/api/superadmin/login', authLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);

// Health check
// Serve uploaded files
app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads')));

app.get('/', (req, res) => res.json({ message: '🏫 School Management API is running', version: '1.0.0' }));
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// API Routes
// NOTE: SuperAdmin MUST be mounted before the tenant '/api' router — the tenant
// router has a catch-all `protect, requireSchool` guard that would otherwise
// intercept every /api/superadmin/* request (including the open /login).
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api', routes);

// 404
app.use('*', (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
// Only start the HTTP listener when run directly (`node server.js`). When the
// app is imported (e.g. by the test suite via supertest) we skip listening so
// no real port is bound.
if (require.main === module) {
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}

module.exports = app;
