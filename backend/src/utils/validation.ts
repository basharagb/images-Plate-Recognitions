import Joi from 'joi';

// Violation creation validation
export const validateViolation = (data: any) => {
  const schema = Joi.object({
    plateNumber: Joi.string().min(1).max(20).required(),
    imageUrl: Joi.string().uri().required(),
    originalFileName: Joi.string().required(),
    processingMethod: Joi.string().valid('AI', 'OCR').required(),
    confidence: Joi.number().min(0).max(100).required(),
    vehicleInfo: Joi.object({
      type: Joi.string().optional(),
      color: Joi.string().optional(),
      make: Joi.string().optional(),
    }).optional(),
    cameraId: Joi.string().max(50).optional(),
    location: Joi.string().max(255).optional(),
    speed: Joi.number().min(0).max(300).optional(),
    speedLimit: Joi.number().min(0).max(200).optional(),
    status: Joi.string().valid('pending', 'confirmed', 'rejected').default('pending'),
  });

  return schema.validate(data);
};

// Violation update validation
export const validateViolationUpdate = (data: any) => {
  const schema = Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'rejected').optional(),
    confirmedBy: Joi.string().max(100).optional(),
    notes: Joi.string().optional(),
    cameraId: Joi.string().max(50).optional(),
    location: Joi.string().max(255).optional(),
    speed: Joi.number().min(0).max(300).optional(),
    speedLimit: Joi.number().min(0).max(200).optional(),
  });

  return schema.validate(data);
};

// Image upload validation
export const validateImageUpload = (req: any, file: any, cb: any) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return cb(new Error('File too large. Maximum size is 10MB.'));
  }

  cb(null, true);
};

// Query parameters validation
export const validateQueryParams = (data: any) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('pending', 'confirmed', 'rejected').optional(),
    plateNumber: Joi.string().optional(),
    cameraId: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    sortBy: Joi.string().valid('createdAt', 'plateNumber', 'confidence', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
  });

  return schema.validate(data);
};

// Bulk update validation
export const validateBulkUpdate = (data: any) => {
  const schema = Joi.object({
    ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    action: Joi.string().valid('confirm', 'reject').required(),
    confirmedBy: Joi.string().max(100).when('action', {
      is: 'confirm',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    notes: Joi.string().optional(),
  });

  return schema.validate(data);
};
