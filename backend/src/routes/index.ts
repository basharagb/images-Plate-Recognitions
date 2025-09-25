import { Router, Request, Response } from 'express';
import simpleCarController from '../controllers/simpleCarController';
import upload from '../middleware/upload';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// ============================================================================
// SIMPLIFIED API - ONLY 2 ENDPOINTS
// ============================================================================

/**
 * POST /api/cars - Upload image(s) and get car recognition results
 * 
 * Description: Upload one or multiple car images and get complete car details
 * Method: POST
 * Content-Type: multipart/form-data
 * Body: images (file array, max 10 images)
 * 
 * Response: Complete car information including plate number, color, type, etc.
 */
router.post(
  '/cars',
  upload.array('images', 10),
  asyncHandler(simpleCarController.uploadAndRecognize.bind(simpleCarController))
);

/**
 * GET /api/cars - Get all cars with complete details
 * 
 * Description: Retrieve all detected cars from database with filtering and pagination
 * Method: GET
 * Query Parameters:
 *   - limit: Number of results (default: 50)
 *   - offset: Pagination offset (default: 0)
 *   - sortBy: Sort field (default: timestamp)
 *   - sortOrder: ASC or DESC (default: DESC)
 *   - plateNumber: Filter by plate number (partial match)
 *   - color: Filter by car color (partial match)
 *   - type: Filter by car type (partial match)
 * 
 * Response: Array of all cars with complete details and statistics
 */
router.get(
  '/cars',
  asyncHandler(simpleCarController.getAllCars.bind(simpleCarController))
);

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * GET /api/health - API Health Check
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Car Plate Recognition API is running',
    timestamp: new Date().toISOString(),
    version: '4.0.0 - Simplified',
    endpoints: [
      'POST /api/cars - Upload images and get car recognition',
      'GET /api/cars - Get all cars with details',
      'GET /api/health - Health check'
    ],
    features: [
      'Single endpoint car recognition',
      'Complete car details response',
      'Enhanced AI accuracy',
      'Pagination and filtering',
      'Image upload and processing'
    ],
    aiModel: 'gpt-4o-mini',
    chatgpt: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
    database: 'MySQL Cars table',
  });
});

export default router;
