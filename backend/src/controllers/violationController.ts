import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Violation from '../models/Violation';
import AILicensePlateService from '../services/aiOcrService';
import { uploadToLocal, deleteFile } from '../utils/fileUtils';
import { validateViolation, validateViolationUpdate } from '../utils/validation';

const aiService = new AILicensePlateService();

export class ViolationController {
  /**
   * Upload and process images for license plate recognition
   */
  public async processImages(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No images uploaded',
        });
        return;
      }

      const results = [];
      
      for (const file of files) {
        try {
          // Process image with AI OCR
          const ocrResult = await aiService.processImage(file.path, {
            preferredMethod: 'AUTO',
            fallbackEnabled: true,
            confidenceThreshold: 70,
          });

          // Save to database if plate number found
          if (ocrResult.plateNumber && ocrResult.plateNumber !== 'NOT_FOUND') {
            const violation = await Violation.create({
              plateNumber: ocrResult.plateNumber,
              imageUrl: `/uploads/${file.filename}`,
              originalFileName: file.originalname,
              processingMethod: ocrResult.processingMethod,
              confidence: ocrResult.confidence,
              vehicleInfo: ocrResult.vehicleInfo ? JSON.stringify(ocrResult.vehicleInfo) : undefined,
              cameraId: req.body.cameraId,
              location: req.body.location,
              speed: req.body.speed ? parseInt(req.body.speed) : undefined,
              speedLimit: req.body.speedLimit ? parseInt(req.body.speedLimit) : undefined,
              status: 'pending',
            });

            results.push({
              success: true,
              violation: violation.toJSON(),
              ocrResult,
            });
          } else {
            // Delete file if no plate found
            await deleteFile(file.path);
            
            results.push({
              success: false,
              filename: file.originalname,
              message: 'No license plate detected',
              ocrResult,
            });
          }
        } catch (error) {
          console.error(`Error processing ${file.originalname}:`, error);
          
          // Delete file on error
          await deleteFile(file.path);
          
          results.push({
            success: false,
            filename: file.originalname,
            message: 'Processing failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `Processed ${files.length} images`,
        results,
        summary: {
          total: files.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      });
    } catch (error) {
      console.error('Process images error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all violations with filtering and pagination
   */
  public async getViolations(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        plateNumber,
        cameraId,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = req.query;

      // Build where clause
      const whereClause: any = {};
      
      if (status) {
        whereClause.status = status;
      }
      
      if (plateNumber) {
        whereClause.plateNumber = {
          [Op.like]: `%${plateNumber}%`,
        };
      }
      
      if (cameraId) {
        whereClause.cameraId = cameraId;
      }
      
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt[Op.gte] = new Date(startDate as string);
        }
        if (endDate) {
          whereClause.createdAt[Op.lte] = new Date(endDate as string);
        }
      }

      // Calculate pagination
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Fetch violations
      const { count, rows: violations } = await Violation.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit as string),
        offset,
        order: [[sortBy as string, sortOrder as string]],
      });

      res.status(200).json({
        success: true,
        data: violations,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages: Math.ceil(count / parseInt(limit as string)),
          totalItems: count,
          itemsPerPage: parseInt(limit as string),
        },
      });
    } catch (error) {
      console.error('Get violations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get single violation by ID
   */
  public async getViolation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const violation = await Violation.findByPk(id);
      
      if (!violation) {
        res.status(404).json({
          success: false,
          message: 'Violation not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: violation,
      });
    } catch (error) {
      console.error('Get violation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update violation (confirm, reject, add notes)
   */
  public async updateViolation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate input
      const { error } = validateViolationUpdate(updateData);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message),
        });
        return;
      }

      const violation = await Violation.findByPk(id);
      
      if (!violation) {
        res.status(404).json({
          success: false,
          message: 'Violation not found',
        });
        return;
      }

      // Add confirmation timestamp if status is being changed to confirmed
      if (updateData.status === 'confirmed' && violation.status !== 'confirmed') {
        updateData.confirmedAt = new Date();
      }

      await violation.update(updateData);

      res.status(200).json({
        success: true,
        message: 'Violation updated successfully',
        data: violation,
      });
    } catch (error) {
      console.error('Update violation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete violation
   */
  public async deleteViolation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const violation = await Violation.findByPk(id);
      
      if (!violation) {
        res.status(404).json({
          success: false,
          message: 'Violation not found',
        });
        return;
      }

      // Delete associated image file
      if (violation.imageUrl) {
        const imagePath = violation.imageUrl.replace('/uploads/', '');
        await deleteFile(`uploads/${imagePath}`);
      }

      await violation.destroy();

      res.status(200).json({
        success: true,
        message: 'Violation deleted successfully',
      });
    } catch (error) {
      console.error('Delete violation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Bulk operations (confirm/reject multiple violations)
   */
  public async bulkUpdate(req: Request, res: Response): Promise<void> {
    try {
      const { ids, action, confirmedBy, notes } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid or empty IDs array',
        });
        return;
      }

      if (!['confirm', 'reject'].includes(action)) {
        res.status(400).json({
          success: false,
          message: 'Invalid action. Must be "confirm" or "reject"',
        });
        return;
      }

      const updateData: any = {
        status: action === 'confirm' ? 'confirmed' : 'rejected',
      };

      if (action === 'confirm') {
        updateData.confirmedAt = new Date();
        updateData.confirmedBy = confirmedBy;
      }

      if (notes) {
        updateData.notes = notes;
      }

      const [affectedRows] = await Violation.update(updateData, {
        where: {
          id: {
            [Op.in]: ids,
          },
        },
      });

      res.status(200).json({
        success: true,
        message: `${affectedRows} violations updated successfully`,
        affectedRows,
      });
    } catch (error) {
      console.error('Bulk update error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get violation statistics
   */
  public async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const [
        totalViolations,
        pendingViolations,
        confirmedViolations,
        rejectedViolations,
      ] = await Promise.all([
        Violation.count(),
        Violation.count({ where: { status: 'pending' } }),
        Violation.count({ where: { status: 'confirmed' } }),
        Violation.count({ where: { status: 'rejected' } }),
      ]);

      // Get violations by camera
      const violationsByCamera = await Violation.findAll({
        attributes: [
          'cameraId',
          [Violation.sequelize!.fn('COUNT', Violation.sequelize!.col('id')), 'count'],
        ],
        group: ['cameraId'],
        raw: true,
      });

      // Get recent violations (last 24 hours)
      const recentViolations = await Violation.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          total: totalViolations,
          pending: pendingViolations,
          confirmed: confirmedViolations,
          rejected: rejectedViolations,
          recent24h: recentViolations,
          byCamera: violationsByCamera,
        },
      });
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new ViolationController();
