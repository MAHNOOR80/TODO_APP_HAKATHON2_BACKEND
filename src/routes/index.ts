import { Router } from 'express';
import authRoutes from './auth.routes';
import tasksRoutes from './tasks.routes';
import aiRoutes from './ai.routes';

/**
 * API Route Aggregation
 * Combines all route modules under /api/v1/ prefix
 */

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
    },
  });
});

// Register route modules
router.use('/auth', authRoutes);
router.use('/tasks', tasksRoutes);
router.use('/ai', aiRoutes);

export default router;
