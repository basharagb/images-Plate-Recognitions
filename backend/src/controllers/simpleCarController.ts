import { Request, Response } from 'express';
import Car from '../models/Car';
import EnhancedVisionService from '../services/enhancedVisionService';
import { deleteFile } from '../utils/fileUtils';
import { v4 as uuidv4 } from 'uuid';

const visionService = new EnhancedVisionService();

export class SimpleCarController {
  /**
   * POST /api/cars - Upload image and get car recognition results
   * Accepts single or multiple images and returns all detected cars with details
   */
  public async uploadAndRecognize(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No images provided. Please upload at least one image.',
        });
        return;
      }

      console.log(`🚗 Processing ${files.length} image(s) for car recognition...`);

      const allDetectedCars: any[] = [];
      const processingResults: any[] = [];

      // Process each uploaded image
      for (const file of files) {
        try {
          console.log(`📸 Processing image: ${file.originalname}`);
          
          // Detect cars using Enhanced Vision Service
          const result = await visionService.detectCars(file.path);
          
          if (result.success && result.cars.length > 0) {
            // Save each detected car to database
            for (const detectedCar of result.cars) {
              try {
                const carData = {
                  plateNumber: detectedCar.plateNumber,
                  color: detectedCar.color,
                  type: detectedCar.type,
                  imageUrl: `/uploads/${file.filename}`,
                  imagePath: file.path,
                  confidence: detectedCar.confidence || 85,
                  cameraInfo: `Image: ${file.originalname}`,
                  detectionId: uuidv4(),
                  timestamp: new Date(),
                };

                const savedCar = await Car.create(carData);
                allDetectedCars.push({
                  id: savedCar.id,
                  plateNumber: savedCar.plateNumber,
                  color: savedCar.color,
                  type: savedCar.type,
                  imageUrl: savedCar.imageUrl,
                  confidence: savedCar.confidence,
                  cameraInfo: savedCar.cameraInfo,
                  timestamp: savedCar.timestamp,
                });

                console.log(`✅ Car saved: ${savedCar.plateNumber} (${savedCar.color} ${savedCar.type})`);
              } catch (dbError) {
                console.error(`❌ Database error for car ${detectedCar.plateNumber}:`, dbError);
              }
            }
          }

          processingResults.push({
            filename: file.originalname,
            success: result.success,
            carsDetected: result.cars.length,
            error: result.error || null,
          });

          // Clean up uploaded file after processing
          await deleteFile(file.path);
          
        } catch (error) {
          console.error(`❌ Error processing ${file.originalname}:`, error);
          processingResults.push({
            filename: file.originalname,
            success: false,
            carsDetected: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Clean up file even on error
          try {
            await deleteFile(file.path);
          } catch (cleanupError) {
            console.error('Error cleaning up file:', cleanupError);
          }
        }
      }

      // Return comprehensive response
      res.status(200).json({
        success: allDetectedCars.length > 0,
        message: `Processed ${files.length} image(s), detected ${allDetectedCars.length} car(s)`,
        totalImages: files.length,
        totalCarsDetected: allDetectedCars.length,
        cars: allDetectedCars,
        processingDetails: processingResults,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Upload and recognize error:', error);
      
      // Clean up any uploaded files on error
      const files = req.files as Express.Multer.File[];
      if (files) {
        for (const file of files) {
          try {
            await deleteFile(file.path);
          } catch (cleanupError) {
            console.error('Error cleaning up file:', cleanupError);
          }
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to process images',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/cars - Get all cars with complete details
   * Returns all detected cars from database with pagination and filtering options
   */
  public async getAllCars(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const sortBy = (req.query.sortBy as string) || 'timestamp';
      const sortOrder = (req.query.sortOrder as string) || 'DESC';
      const plateNumber = req.query.plateNumber as string;
      const color = req.query.color as string;
      const type = req.query.type as string;

      console.log(`📊 Fetching cars with filters:`, {
        limit,
        offset,
        sortBy,
        sortOrder,
        plateNumber,
        color,
        type,
      });

      // Build where clause for filtering
      const whereClause: any = {};
      if (plateNumber) {
        whereClause.plateNumber = { [require('sequelize').Op.like]: `%${plateNumber}%` };
      }
      if (color) {
        whereClause.color = { [require('sequelize').Op.like]: `%${color}%` };
      }
      if (type) {
        whereClause.type = { [require('sequelize').Op.like]: `%${type}%` };
      }

      // Get cars with pagination and filtering
      const { count, rows: cars } = await Car.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
      });

      // Get statistics
      const totalCars = await Car.count();
      const last24h = await Car.count({
        where: {
          timestamp: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      // Format response with complete car details
      const formattedCars = cars.map(car => ({
        id: car.id,
        plateNumber: car.plateNumber,
        color: car.color,
        type: car.type,
        imageUrl: car.imageUrl,
        imagePath: car.imagePath,
        confidence: car.confidence,
        cameraInfo: car.cameraInfo,
        detectionId: car.detectionId,
        timestamp: car.timestamp,
        createdAt: car.createdAt,
        updatedAt: car.updatedAt,
      }));

      console.log(`📊 Found ${cars.length} cars matching criteria`);

      res.status(200).json({
        success: true,
        message: `Retrieved ${cars.length} cars`,
        totalCars: count,
        totalInDatabase: totalCars,
        last24Hours: last24h,
        pagination: {
          limit,
          offset,
          totalPages: Math.ceil(count / limit),
          currentPage: Math.floor(offset / limit) + 1,
        },
        filters: {
          plateNumber,
          color,
          type,
          sortBy,
          sortOrder,
        },
        cars: formattedCars,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Get all cars error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve cars',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new SimpleCarController();
