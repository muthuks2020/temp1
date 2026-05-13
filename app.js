// app.js — Express application setup
'use strict';

require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const passport   = require('passport');
const cookieParser = require('cookie-parser');

const logger              = require('./config/logger');
const { configurePassport } = require('./config/passport');
const { globalLimiter }   = require('./middleware/rateLimiter');
const { requestLogger }   = require('./middleware/requestLogger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes  = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// ─── Validate required environment variables ──────────────────────────────────
const REQUIRED_ENV = [
  'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
  'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID', 'AZURE_REDIRECT_URI',
  'JWT_SECRET', 'SESSION_SECRET',
];

const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  logger.error('Missing required environment variables', { missing: missingEnv });
  process.exit(1);
}

// ─── Create Express app ───────────────────────────────────────────────────────
const app = express();

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      logger.warn('CORS blocked request', { origin });
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Trust proxy for correct IP extraction behind load balancers / nginx
app.set('trust proxy', 1);

// ─── Global rate limiter ──────────────────────────────────────────────────────
app.use(globalLimiter);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// ─── Passport ─────────────────────────────────────────────────────────────────
configurePassport();
app.use(passport.initialize());

// ─── HTTP request logger ──────────────────────────────────────────────────────
app.use(requestLogger);

// ─── Health check (no auth) ───────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const { db } = require('./config/database');
  let dbStatus = 'ok';
  try {
    await db.raw('SELECT 1');
  } catch {
    dbStatus = 'error';
  }

  const status = dbStatus === 'ok' ? 'ok' : 'degraded';
  const httpStatus = status === 'ok' ? 200 : 503;

  return res.status(httpStatus).json({
    status,
    db:        dbStatus,
    uptime:    Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth',         authRoutes);
app.use('/api/v1/admin', adminRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use(notFound);

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
