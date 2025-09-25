import { Router, Request, Response } from 'express';
import optimizedCarController from '../controllers/optimizedCarController';
import strictCarController from '../controllers/strictCarController';
import trafficCameraRoutes from './trafficCameraRoutes';
import upload from '../middleware/upload';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Traffic Camera routes (specialized for speed cameras)
router.use('/traffic-camera', trafficCameraRoutes);

// Car Recognition routes
router.post(
  '/recognize',
  upload.array('images', 10),
  asyncHandler(optimizedCarController.recognizeCars.bind(optimizedCarController))
);

// Strict AI Vision routes
router.post(
  '/recognize/strict',
  upload.array('images', 10),
  asyncHandler(strictCarController.recognizeCarsStrict.bind(strictCarController))
);

// Cars routes
router.get(
  '/cars',
  asyncHandler(optimizedCarController.getCars.bind(optimizedCarController))
);

router.get(
  '/cars/statistics',
  asyncHandler(optimizedCarController.getStatistics.bind(optimizedCarController))
);

// Strict Cars routes
router.get(
  '/cars/strict',
  asyncHandler(strictCarController.getCarsStrict.bind(strictCarController))
);

router.get(
  '/cars/strict/statistics',
  asyncHandler(strictCarController.getStrictStatistics.bind(strictCarController))
);

router.get(
  '/cars/quality-comparison',
  asyncHandler(strictCarController.getQualityComparison.bind(strictCarController))
);

router.get(
  '/cars/:id',
  asyncHandler(optimizedCarController.getCar.bind(optimizedCarController))
);

router.delete(
  '/cars/:id',
  asyncHandler(optimizedCarController.deleteCar.bind(optimizedCarController))
);

// Health check routes
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Car Plate Recognition API is running',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    features: [
      'Multi-vehicle detection', 
      'ChatGPT Vision API', 
      'Strict AI Vision Mode',
      'Traffic Camera Recognition',
      'Alphanumeric plate extraction',
      'Vehicle type classification',
      'Plate format normalization',
      'Timestamp extraction'
    ],
    aiModel: 'gpt-4o-mini',
    chatgpt: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
    database: 'MySQL Cars table',
  });
});

router.get(
  '/strict/health',
  asyncHandler(strictCarController.getStrictHealth.bind(strictCarController))
);

export default router;
