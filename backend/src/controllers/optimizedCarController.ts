import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Car from '../models/Car';
import ChatGPTCarService from '../services/chatgptCarService';
import { deleteFile } from '../utils/fileUtils';

const chatgptService = new ChatGPTCarService();

export class OptimizedCarController {
  /**
   * Recognize cars from uploaded images using ChatGPT Vision API (gpt-4o-mini)
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

      console.log(`🚗 Processing ${files.length} images for car recognition using ChatGPT Vision API`);

      const allRecognizedCars = [];
      const processingResults = [];
      
      for (const file of files) {
        try {
          console.log(`📸 Analyzing image: ${file.originalname}`);
          
          // Analyze cars using ChatGPT Vision API (gpt-4o-mini)
          const result = await chatgptService.analyzeCars(file.path);
          
          if (result.success && result.cars.length > 0) {
            console.log(`✅ Found ${result.cars.length} cars in ${file.originalname}`);
            
            // Check if this is a demo response
            if ((result as any).isDemo) {
              console.log('🎭 Demo mode: Not saving to database');
              // For demo mode, just add to response without saving to database
              for (const detectedCar of result.cars) {
                allRecognizedCars.push({
                  id: `demo_${Date.now()}`,
                  plateNumber: detectedCar.plateNumber,
                  color: detectedCar.color,
                  type: detectedCar.type,
                  imageUrl: `/uploads/${file.filename}`,
                  timestamp: new Date(),
                });
              }
            } else {
              // Save each detected car to MySQL database (real detection)
              for (const detectedCar of result.cars) {
                try {
                  const car = await Car.create({
                    plateNumber: detectedCar.plateNumber,
                    color: detectedCar.color,
                    type: detectedCar.type,
                    imageUrl: `/uploads/${file.filename}`,
                    timestamp: new Date(),
                  });

                  allRecognizedCars.push({
                    id: car.id,
                    plateNumber: car.plateNumber,
                    color: car.color,
                    type: car.type,
                    imageUrl: car.imageUrl,
                    timestamp: car.timestamp,
                  });

                  console.log(`💾 Saved car to database: Plate ${car.plateNumber}, ${car.color} ${car.type}`);
                } catch (dbError) {
                  console.error('❌ Database save error:', dbError);
                  // Continue processing other cars even if one fails
                }
              }
            }

            processingResults.push({
              filename: file.originalname,
              success: true,
              carsDetected: result.cars.length,
              cars: result.cars,
              rawResponse: result.rawResponse,
            });
          } else {
            // Delete file if no cars detected
            await deleteFile(file.path);
            
            processingResults.push({
              filename: file.originalname,
              success: false,
              carsDetected: 0,
              message: result.error || 'No cars detected in image',
              rawResponse: result.rawResponse,
            });

            console.log(`❌ No cars detected in ${file.originalname}`);
          }
        } catch (error) {
          console.error(`❌ Error processing ${file.originalname}:`, error);
          
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
      const totalCarsDetected = allRecognizedCars.length;
      const successfulImages = processingResults.filter(r => r.success).length;
      const failedImages = processingResults.filter(r => !r.success).length;

      console.log(`📊 Processing complete: ${totalCarsDetected} cars detected from ${files.length} images`);

      res.status(200).json({
        success: totalCarsDetected > 0,
        message: `Processed ${files.length} images using ChatGPT Vision API, detected ${totalCarsDetected} cars`,
        cars: allRecognizedCars,
        summary: {
          totalImages: files.length,
          successfulImages,
          failedImages,
          totalCarsDetected,
          aiModel: 'gpt-4o-mini',
        },
        details: processingResults,
      });
    } catch (error) {
      console.error('❌ Car recognition error:', error);
      
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
   * Get all cars with filtering and pagination
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

      console.log(`📋 Fetching cars with filters:`, { plateNumber, color, type, startDate, endDate });

      // Build where clause for filtering
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

      // Fetch cars from database
      const { count, rows: cars } = await Car.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit as string),
        offset,
        order: [[sortBy as string, sortOrder as string]],
      });

      console.log(`📊 Found ${count} cars matching criteria`);

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
      console.error('❌ Get cars error:', error);
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
      
      console.log(`🔍 Fetching car with ID: ${id}`);
      
      const car = await Car.findByPk(id);
      
      if (!car) {
        res.status(404).json({
          success: false,
          message: 'Car not found',
        });
        return;
      }

      console.log(`✅ Found car: Plate ${car.plateNumber}, ${car.color} ${car.type}`);

      res.status(200).json({
        success: true,
        data: car,
      });
    } catch (error) {
      console.error('❌ Get car error:', error);
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
      
      console.log(`🗑️ Deleting car with ID: ${id}`);
      
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
        console.log(`🗑️ Deleted image file: ${imagePath}`);
      }

      await car.destroy();
      console.log(`✅ Car deleted successfully: Plate ${car.plateNumber}`);

      res.status(200).json({
        success: true,
        message: 'Car deleted successfully',
      });
    } catch (error) {
      console.error('❌ Delete car error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get comprehensive car statistics
   * GET /api/cars/statistics
   */
  public async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      console.log('📊 Generating car statistics...');

      const [
        totalCars,
        carsByType,
        carsByColor,
        recentCars,
        todayCars,
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
        Car.count({
          where: {
            timestamp: {
              [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
      ]);

      const statistics = {
        total: totalCars,
        recent24h: recentCars,
        today: todayCars,
        byType: carsByType,
        byColor: carsByColor,
        aiModel: 'gpt-4o-mini',
        lastUpdated: new Date().toISOString(),
      };

      console.log(`📊 Statistics generated: ${totalCars} total cars, ${recentCars} in last 24h`);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error('❌ Get statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new OptimizedCarController();
