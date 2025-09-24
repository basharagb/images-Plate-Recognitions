import { Router } from 'express';
import violationRoutes from './violationRoutes';

const router = Router();

// API routes
router.use('/violations', violationRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'License Plate Recognition API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;
