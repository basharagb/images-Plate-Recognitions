import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Car from '../models/Car';
import EnhancedVisionService from '../services/enhancedVisionService';
import { deleteFile } from '../utils/fileUtils';

const visionService = new EnhancedVisionService();

export class CarController {
  /**
   * Recognize cars from uploaded images using ChatGPT Vision API
   * POST /api/recognize
   */
  public async recognizeCars(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No images uploaded',
        });
        return;
      }

      console.log(`Processing ${files.length} images for car recognition`);

      const allDetectedCars = [];
      const processingResults = [];
      
      for (const file of files) {
        try {
          console.log(`Processing image: ${file.originalname}`);
          
          // Detect cars using ChatGPT Vision API
          const result = await visionService.detectCars(file.path);
          
          if (result.success && result.cars.length > 0) {
            // Save each detected car to database
            for (const detectedCar of result.cars) {
              try {
                const car = await Car.create({
                  plateNumber: detectedCar.plateNumber,
                  color: detectedCar.color,
                  type: detectedCar.type,
                  imageUrl: `/uploads/${file.filename}`,
                  detectionId: detectedCar.id,
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
            });

            console.log(`Detected ${result.cars.length} cars in ${file.originalname}`);
          } else {
            // Delete file if no cars detected
            await deleteFile(file.path);
            
            processingResults.push({
              filename: file.originalname,
              success: false,
              carsDetected: 0,
              message: 'No cars detected in image',
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
        message: `Processed ${files.length} images, detected ${totalCarsDetected} cars`,
        cars: allDetectedCars,
        summary: {
          totalImages: files.length,
          successfulImages,
          failedImages,
          totalCarsDetected,
        },
        details: processingResults,
      });
    } catch (error) {
      console.error('Car recognition error:', error);
      
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
   * Get all recognized cars with filtering and pagination
   * GET /api/cars
   */
  public async getCars(req: Request, res: Response): Promise<void> {
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

      // Build where clause
      const whereClause: any = {};
      
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
      console.error('Get cars error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get single car by ID
   * GET /api/cars/:id
   */
  public async getCar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const car = await Car.findByPk(id);
      
      if (!car) {
        res.status(404).json({
          success: false,
          message: 'Car not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: car,
      });
    } catch (error) {
      console.error('Get car error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete car by ID
   * DELETE /api/cars/:id
   */
  public async deleteCar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const car = await Car.findByPk(id);
      
      if (!car) {
        res.status(404).json({
          success: false,
          message: 'Car not found',
        });
        return;
      }

      // Delete associated image file
      if (car.imageUrl) {
        const imagePath = car.imageUrl.replace('/uploads/', '');
        await deleteFile(`uploads/${imagePath}`);
      }

      await car.destroy();

      res.status(200).json({
        success: true,
        message: 'Car deleted successfully',
      });
    } catch (error) {
      console.error('Delete car error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get car statistics
   * GET /api/cars/statistics
   */
  public async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const [
        totalCars,
        carsByType,
        carsByColor,
        recentCars,
      ] = await Promise.all([
        Car.count(),
        Car.findAll({
          attributes: [
            'type',
            [Car.sequelize!.fn('COUNT', Car.sequelize!.col('id')), 'count'],
          ],
          group: ['type'],
          raw: true,
        }),
        Car.findAll({
          attributes: [
            'color',
            [Car.sequelize!.fn('COUNT', Car.sequelize!.col('id')), 'count'],
          ],
          group: ['color'],
          raw: true,
        }),
        Car.count({
          where: {
            timestamp: {
              [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          total: totalCars,
          recent24h: recentCars,
          byType: carsByType,
          byColor: carsByColor,
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

export default new CarController();
