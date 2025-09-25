import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Car from '../models/Car';
import StrictVisionService from '../services/strictVisionService';
import { deleteFile } from '../utils/fileUtils';

const strictVisionService = new StrictVisionService();

export class StrictCarController {
  /**
   * Recognize cars from uploaded images using Strict AI Vision API
   * POST /api/recognize/strict
   */
  public async recognizeCarsStrict(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No images uploaded',
        });
        return;
      }

      console.log(`Processing ${files.length} images with strict AI vision criteria`);

      const allDetectedCars = [];
      const processingResults = [];
      
      for (const file of files) {
        try {
          console.log(`Processing image with strict criteria: ${file.originalname}`);
          
          // Detect cars using Strict Vision API
          const result = await strictVisionService.detectCarsStrict(file.path);
          
          if (result.success && result.cars.length > 0) {
            // Save each detected car to database
            for (const detectedCar of result.cars) {
              try {
                const car = await Car.create({
                  plateNumber: detectedCar.plate_number,
                  color: detectedCar.color,
                  type: detectedCar.type,
                  imageUrl: `/uploads/${file.filename}`,
                  detectionId: `strict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  timestamp: new Date(),
                });

                allDetectedCars.push({
                  id: car.id,
                  plateNumber: car.plateNumber,
                  color: car.color,
                  type: car.type,
                  imageUrl: car.imageUrl,
                  timestamp: car.timestamp,
                  detectionId: car.detectionId,
                  createdAt: car.createdAt,
                  updatedAt: car.updatedAt,
                });
              } catch (dbError) {
                console.error('Database save error:', dbError);
                // Continue processing other cars even if one fails
              }
            }

            processingResults.push({
              filename: file.originalname,
              success: true,
              carsDetected: result.cars.length,
              cars: result.cars,
              message: `Detected ${result.cars.length} high-quality cars`,
              rawResponse: result.rawResponse,
            });

            console.log(`Detected ${result.cars.length} high-quality cars in ${file.originalname}`);
          } else {
            // Delete file if no cars detected or they don't meet strict criteria
            await deleteFile(file.path);
            
            processingResults.push({
              filename: file.originalname,
              success: false,
              carsDetected: 0,
              message: 'No cars meeting strict quality criteria detected',
              error: result.error,
            });
          }
        } catch (error) {
          console.error(`Error processing ${file.originalname}:`, error);
          
          // Delete file on error
          await deleteFile(file.path);
          
          processingResults.push({
            filename: file.originalname,
            success: false,
            carsDetected: 0,
            message: 'Processing failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Calculate statistics
      const totalCarsDetected = allDetectedCars.length;
      const successfulImages = processingResults.filter(r => r.success).length;
      const failedImages = processingResults.filter(r => !r.success).length;

      res.status(200).json({
        success: totalCarsDetected > 0,
        message: `Processed ${files.length} images with strict criteria, detected ${totalCarsDetected} high-quality cars`,
        cars: allDetectedCars,
        summary: {
          totalImages: files.length,
          successfulImages,
          failedImages,
          totalCarsDetected,
          aiModel: 'gpt-4o-mini-strict',
        },
        details: processingResults,
      });
    } catch (error) {
      console.error('Strict car recognition error:', error);
      
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
   * Get all recognized cars with filtering and pagination (enhanced for strict mode)
   * GET /api/cars/strict
   */
  public async getCarsStrict(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        plateNumber,
        color,
        type,
        startDate,
        endDate,
        sortBy = 'timestamp',
        sortOrder = 'DESC',
      } = req.query;

      // Build where clause - only include cars detected with strict criteria
      const whereClause: any = {
        detectionId: {
          [Op.like]: 'strict_%',
        },
      };
      
      if (plateNumber) {
        whereClause.plateNumber = {
          [Op.like]: `%${plateNumber}%`,
        };
      }
      
      if (color) {
        whereClause.color = {
          [Op.like]: `%${color}%`,
        };
      }
      
      if (type) {
        whereClause.type = {
          [Op.like]: `%${type}%`,
        };
      }
      
      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) {
          whereClause.timestamp[Op.gte] = new Date(startDate as string);
        }
        if (endDate) {
          whereClause.timestamp[Op.lte] = new Date(endDate as string);
        }
      }

      // Calculate pagination
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Fetch cars
      const { count, rows: cars } = await Car.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit as string),
        offset,
        order: [[sortBy as string, sortOrder as string]],
      });

      res.status(200).json({
        success: true,
        data: cars,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages: Math.ceil(count / parseInt(limit as string)),
          totalItems: count,
          itemsPerPage: parseInt(limit as string),
        },
      });
    } catch (error) {
      console.error('Get strict cars error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get comprehensive statistics for strict detection
   * GET /api/cars/strict/statistics
   */
  public async getStrictStatistics(req: Request, res: Response): Promise<void> {
    try {
      const [
        totalStrictCars,
        totalAllCars,
        carsByType,
        carsByColor,
        recentStrictCars,
        todayStrictCars,
      ] = await Promise.all([
        Car.count({
          where: {
            detectionId: {
              [Op.like]: 'strict_%',
            },
          },
        }),
        Car.count(),
        Car.findAll({
          attributes: [
            'type',
            [Car.sequelize!.fn('COUNT', Car.sequelize!.col('id')), 'count'],
          ],
          where: {
            detectionId: {
              [Op.like]: 'strict_%',
            },
          },
          group: ['type'],
          raw: true,
        }),
        Car.findAll({
          attributes: [
            'color',
            [Car.sequelize!.fn('COUNT', Car.sequelize!.col('id')), 'count'],
          ],
          where: {
            detectionId: {
              [Op.like]: 'strict_%',
            },
          },
          group: ['color'],
          raw: true,
        }),
        Car.count({
          where: {
            detectionId: {
              [Op.like]: 'strict_%',
            },
            timestamp: {
              [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        Car.count({
          where: {
            detectionId: {
              [Op.like]: 'strict_%',
            },
            timestamp: {
              [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
      ]);

      const qualityScore = totalAllCars > 0 ? (totalStrictCars / totalAllCars) * 100 : 0;

      res.status(200).json({
        success: true,
        data: {
          total: totalStrictCars,
          recent24h: recentStrictCars,
          today: todayStrictCars,
          byType: carsByType,
          byColor: carsByColor,
          aiModel: 'gpt-4o-mini-strict',
          lastUpdated: new Date().toISOString(),
          qualityMetrics: {
            totalAllDetections: totalAllCars,
            strictDetections: totalStrictCars,
            qualityScore: Math.round(qualityScore * 100) / 100,
            rejectionRate: Math.round((100 - qualityScore) * 100) / 100,
          },
        },
      });
    } catch (error) {
      console.error('Get strict statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Health check for strict vision service
   * GET /api/strict/health
   */
  public async getStrictHealth(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Strict AI Vision Service is operational',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        features: [
          'Strict vehicle detection (fully visible only)',
          'High-quality plate recognition',
          'Vehicle type classification (Sedan, SUV, Pickup, Truck, Bus)',
          'Plate format normalization',
          'Content filtering (no timestamps/overlays)',
          'Structured JSON output',
        ],
        aiModel: 'gpt-4o-mini-strict',
        chatgpt: 'Connected',
        database: 'Connected',
      });
    } catch (error) {
      console.error('Strict health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Strict service health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Compare detection quality between regular and strict modes
   * GET /api/cars/quality-comparison
   */
  public async getQualityComparison(req: Request, res: Response): Promise<void> {
    try {
      const [
        strictCars,
        regularCars,
        strictCarsByType,
        regularCarsByType,
      ] = await Promise.all([
        Car.count({
          where: {
            detectionId: {
              [Op.like]: 'strict_%',
            },
          },
        }),
        Car.count({
          where: {
            detectionId: {
              [Op.notLike]: 'strict_%',
            },
          },
        }),
        Car.findAll({
          attributes: [
            'type',
            [Car.sequelize!.fn('COUNT', Car.sequelize!.col('id')), 'count'],
          ],
          where: {
            detectionId: {
              [Op.like]: 'strict_%',
            },
          },
          group: ['type'],
          raw: true,
        }),
        Car.findAll({
          attributes: [
            'type',
            [Car.sequelize!.fn('COUNT', Car.sequelize!.col('id')), 'count'],
          ],
          where: {
            detectionId: {
              [Op.notLike]: 'strict_%',
            },
          },
          group: ['type'],
          raw: true,
        }),
      ]);

      const totalCars = strictCars + regularCars;
      const strictPercentage = totalCars > 0 ? (strictCars / totalCars) * 100 : 0;
      const regularPercentage = totalCars > 0 ? (regularCars / totalCars) * 100 : 0;

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalDetections: totalCars,
            strictDetections: strictCars,
            regularDetections: regularCars,
            strictPercentage: Math.round(strictPercentage * 100) / 100,
            regularPercentage: Math.round(regularPercentage * 100) / 100,
          },
          breakdown: {
            strict: {
              total: strictCars,
              byType: strictCarsByType,
            },
            regular: {
              total: regularCars,
              byType: regularCarsByType,
            },
          },
          recommendations: {
            useStrictMode: strictPercentage > 80 ? 'Recommended' : 'Consider for high-quality requirements',
            qualityImprovement: strictCars > 0 ? `${Math.round(((strictCars / (strictCars + regularCars)) * 100))}% of detections meet strict criteria` : 'No strict detections yet',
          },
        },
      });
    } catch (error) {
      console.error('Quality comparison error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new StrictCarController();
