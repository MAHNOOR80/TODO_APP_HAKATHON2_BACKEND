import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes/index';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { testDatabaseConnection } from './config/database.config';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env['PORT'] || 3000;

// --- CHANGED SECTION START ---
// Define allowed origins (Localhost + Your Vercel Production URL)
const allowedOrigins = [
  'http://localhost:5173', 
  'https://todo-app-hakathon-2-phase-2.vercel.app' // Your specific Vercel URL from config
];

// If an environment variable is set, add it to the allowed list
if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ORIGIN);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        return callback(new Error(msg), false);
      }
    },
    credentials: true, // Allow cookies for session-based auth
  })
);
// --- CHANGED SECTION END ---

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes (all under /api/v1/)
app.use('/api/v1', apiRoutes);

// Root health check
app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Todo API Server - Phase 2',
      version: '2.0.0',
      status: 'running',
    },
  });
});

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer(): Promise<void> {
  try {
    // Test database connection
    const dbConnected = await testDatabaseConnection();

    if (!dbConnected) {
      console.warn('Warning: Database connection failed. Server will start but database operations will fail.');
      console.warn('Please ensure DATABASE_URL is set in .env and Neon PostgreSQL is accessible.');
    }

    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📚 API base URL: http://localhost:${PORT}/api/v1`);
      console.log(`🌍 CORS enabled for: ${allowedOrigins.join(', ')}`); // Log all allowed origins
      console.log(`📊 Health check: http://localhost:${PORT}/api/v1/health`);

      if (dbConnected) {
        console.log('✅ Database connection: OK');
      } else {
        console.log('⚠️  Database connection: FAILED (see warning above)');
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

startServer();