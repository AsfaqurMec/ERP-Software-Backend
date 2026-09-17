import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes.js';
import { errorHandler } from './lib/http.js';

export const app = express();

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Strict CORS origin filtering
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim())
  : process.env.NODE_ENV === 'production'
  ? []
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, internal health pings)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked request from origin: ${origin}`));
    },
    credentials: true,
  })
);

// Global body parsers (tight 1mb limit against DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging (skipping health pings in production to avoid log clutter)
app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    skip: (req) => req.url === '/health' || req.url === '/ping' || req.url === '/api/health',
  })
);

// Ultra-fast keep-alive ping endpoints (placed before rate limiter to ensure 0-overhead & no rate limiting)
app.get('/ping', (_req, res) => {
  res.status(200).send('pong');
});

const handleHealth = (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'stockpilot-api',
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

// Rate limiting for API traffic
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.url === '/health' || req.url === '/ping' || req.url === '/api/health',
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    error: { code: 'RATE_LIMIT_EXCEEDED', details: [] },
  },
});

app.use('/api', limiter, routes);

// Centralized error handler
app.use(errorHandler);
