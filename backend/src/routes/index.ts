import { Router, Request, Response } from 'express';
import optimizedCarController from '../controllers/optimizedCarController';
import upload from '../middleware/upload';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Car Recognition routes
router.post(
  '/recognize',
  upload.array('images', 10),
  asyncHandler(optimizedCarController.recognizeCars.bind(optimizedCarController))
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

router.get(
  '/cars/:id',
  asyncHandler(optimizedCarController.getCar.bind(optimizedCarController))
);

router.delete(
  '/cars/:id',
  asyncHandler(optimizedCarController.deleteCar.bind(optimizedCarController))
);

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Car Plate Recognition API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: ['Multi-vehicle detection', 'ChatGPT Vision API', 'Digits-only plate extraction'],
    aiModel: 'gpt-4o-mini',
    chatgpt: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
    database: 'MySQL Cars table',
  });
});

export default router;
