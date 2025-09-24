import { Router } from 'express';
import violationController from '../controllers/violationController';
import upload from '../middleware/upload';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Routes
router.post(
  '/process',
  upload.array('images', 10),
  asyncHandler(violationController.processImages.bind(violationController))
);

router.get(
  '/',
  asyncHandler(violationController.getViolations.bind(violationController))
);

router.get(
  '/statistics',
  asyncHandler(violationController.getStatistics.bind(violationController))
);

router.get(
  '/:id',
  asyncHandler(violationController.getViolation.bind(violationController))
);

router.put(
  '/:id',
  asyncHandler(violationController.updateViolation.bind(violationController))
);

router.delete(
  '/:id',
  asyncHandler(violationController.deleteViolation.bind(violationController))
);

router.patch(
  '/bulk-update',
  asyncHandler(violationController.bulkUpdate.bind(violationController))
);

export default router;
