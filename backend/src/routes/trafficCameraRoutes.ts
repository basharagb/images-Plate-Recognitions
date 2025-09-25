import { Router } from 'express';
import TrafficCameraController from '../controllers/trafficCameraController';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const trafficCameraController = new TrafficCameraController();

// Traffic Camera Recognition Routes

/**
 * POST /api/traffic-camera/process
 * Process single traffic camera image for license plate recognition
 */
router.post(
  '/process',
  trafficCameraController.getUploadMiddleware(),
  asyncHandler(trafficCameraController.processTrafficCameraImage)
);

/**
 * POST /api/traffic-camera/process-multiple
 * Process multiple traffic camera images for license plate recognition
 */
router.post(
  '/process-multiple',
  trafficCameraController.getMultipleUploadMiddleware(),
  asyncHandler(trafficCameraController.processMultipleTrafficCameraImages)
);

/**
 * GET /api/traffic-camera/statistics
 * Get traffic camera detection statistics
 */
router.get(
  '/statistics',
  asyncHandler(trafficCameraController.getTrafficCameraStatistics)
);

/**
 * GET /api/traffic-camera/health
 * Get traffic camera service health status
 */
router.get(
  '/health',
  asyncHandler(trafficCameraController.getTrafficCameraHealth)
);

export default router;
