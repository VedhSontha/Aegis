import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './db';
import scanRoutes from './routes/scan.routes';
import reportRoutes from './routes/report.routes';
import generateRoutes from './routes/generate.routes';
import statsRoutes from './routes/stats.routes';
import aiRoutes from './routes/ai.routes';

// Load config
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Connect Database
connectDB();

// CORS Configuration
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching origin
      if (!origin || origin === allowedOrigin || allowedOrigin === '*') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy.'));
      }
    },
    credentials: true
  })
);

// Body Parser
app.use(express.json());

// Scan rate limiter (30 requests/minute per IP)
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Rate limit exceeded. Please try again after 60 seconds.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Health check endpoint (for Render/Uptime ping)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// App Routes
app.use('/api/scan', scanLimiter, scanRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/ai', aiRoutes);

// Fallback Route
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({ error: err.message || 'An unexpected server error occurred.' });
});

// Start Server
app.listen(port, () => {
  console.log(`AEGIS Backend Server listening on port ${port}`);
});
