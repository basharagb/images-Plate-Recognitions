import { Request, Response } from 'express';
import Violation from '../models/Violation';
import ChatGPTVisionService from '../services/chatgptVisionService';
import { deleteFile } from '../utils/fileUtils';

const chatgptService = new ChatGPTVisionService();

export class RecognitionController {
  /**
   * Process single image and extract license plate using ChatGPT Vision API
   * POST /api/recognize
   */
  public async recognizePlate(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file as Express.Multer.File;
      
      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No image uploaded',
        });
        return;
      }

      console.log(`Processing image: ${file.originalname}`);

      // Extract license plate using ChatGPT Vision API
      const result = await chatgptService.extractLicensePlate(file.path);

      if (result.success && result.plateNumber !== 'NOT_FOUND') {
        // Save to database
        const violation = await Violation.create({
          plateNumber: result.plateNumber,
          imageUrl: `/uploads/${file.filename}`,
          timestamp: new Date(),
          confirmed: false,
        });

        console.log(`License plate detected: ${result.plateNumber}`);

        res.status(200).json({
          success: true,
          message: 'License plate extracted successfully',
          data: {
            id: violation.id,
            plateNumber: result.plateNumber,
            imageUrl: violation.imageUrl,
            timestamp: violation.timestamp,
            confirmed: violation.confirmed,
          },
        });
      } else {
        // Delete file if no plate found
        await deleteFile(file.path);
        
        res.status(200).json({
          success: false,
          message: 'No license plate detected in the image',
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Recognition error:', error);
      
      // Clean up uploaded file on error
      if (req.file) {
        await deleteFile(req.file.path);
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Process multiple images in batch
   * POST /api/recognize/batch
   */
  public async recognizePlatesBatch(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No images uploaded',
        });
        return;
      }

      console.log(`Processing ${files.length} images`);

      const results = [];
      
      for (const file of files) {
        try {
          const result = await chatgptService.extractLicensePlate(file.path);

          if (result.success && result.plateNumber !== 'NOT_FOUND') {
            // Save to database
            const violation = await Violation.create({
              plateNumber: result.plateNumber,
              imageUrl: `/uploads/${file.filename}`,
              timestamp: new Date(),
              confirmed: false,
            });

            results.push({
              success: true,
              filename: file.originalname,
              plateNumber: result.plateNumber,
              violation: {
                id: violation.id,
                plateNumber: violation.plateNumber,
                imageUrl: violation.imageUrl,
                timestamp: violation.timestamp,
                confirmed: violation.confirmed,
              },
            });
          } else {
            // Delete file if no plate found
            await deleteFile(file.path);
            
            results.push({
              success: false,
              filename: file.originalname,
              message: 'No license plate detected',
              error: result.error,
            });
          }
        } catch (error) {
          await deleteFile(file.path);
          
          results.push({
            success: false,
            filename: file.originalname,
            message: 'Processing failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.status(200).json({
        success: true,
        message: `Processed ${files.length} images: ${successful} successful, ${failed} failed`,
        results,
        summary: {
          total: files.length,
          successful,
          failed,
        },
      });
    } catch (error) {
      console.error('Batch recognition error:', error);
      
      // Clean up uploaded files on error
      if (req.files) {
        const files = req.files as Express.Multer.File[];
        for (const file of files) {
          await deleteFile(file.path);
        }
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all violations
   * GET /api/violations
   */
  public async getViolations(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        confirmed,
        plateNumber,
      } = req.query;

      // Build where clause
      const whereClause: any = {};
      
      if (confirmed !== undefined) {
        whereClause.confirmed = confirmed === 'true';
      }
      
      if (plateNumber) {
        whereClause.plateNumber = {
          [require('sequelize').Op.like]: `%${plateNumber}%`,
        };
      }

      // Calculate pagination
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Fetch violations
      const { count, rows: violations } = await Violation.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit as string),
        offset,
        order: [['timestamp', 'DESC']],
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
   * GET /api/violations/:id
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
   * Confirm violation
   * PUT /api/violations/:id/confirm
   */
  public async confirmViolation(req: Request, res: Response): Promise<void> {
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

      await violation.update({ confirmed: true });

      res.status(200).json({
        success: true,
        message: 'Violation confirmed successfully',
        data: violation,
      });
    } catch (error) {
      console.error('Confirm violation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new RecognitionController();
