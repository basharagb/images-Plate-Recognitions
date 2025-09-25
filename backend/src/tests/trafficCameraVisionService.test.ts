import TrafficCameraVisionService from '../services/trafficCameraVisionService';
import fs from 'fs/promises';
import path from 'path';

// Mock OpenAI for testing
jest.mock('openai');

describe('TrafficCameraVisionService', () => {
  let service: TrafficCameraVisionService;
  
  beforeEach(() => {
    // Mock environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';
    service = new TrafficCameraVisionService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Traffic Camera Image Processing', () => {
    it('should process traffic camera image with correct format', async () => {
      // Mock OpenAI response for traffic camera image
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    timestamp: '22/09/2025 15:55:54',
                    camera_metadata: 'Vehicle:1576 NonVehicle:0 Person:0',
                    vehicles: [{
                      plate_number: '2224865',
                      color: 'White',
                      type: 'Sedan',
                      confidence_score: 95
                    }]
                  })
                }
              }]
            })
          }
        }
      }));

      // Mock file reading
      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('mock-image-data'));

      const result = await service.detectCarsFromTrafficCamera('/mock/path/image.jpg');

      expect(result.success).toBe(true);
      expect(result.cars).toHaveLength(1);
      expect(result.cars[0]?.plate_number).toBe('2224865');
      expect(result.cars[0]?.color).toBe('White');
      expect(result.cars[0]?.type).toBe('Sedan');
      expect(result.timestamp).toBe('22/09/2025 15:55:54');
      expect(result.camera_metadata).toBe('Vehicle:1576 NonVehicle:0 Person:0');
    });

    it('should handle multiple vehicles in traffic camera image', async () => {
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    timestamp: '22/09/2025 15:55:54',
                    camera_metadata: 'Vehicle:1576 NonVehicle:0 Person:0',
                    vehicles: [
                      {
                        plate_number: '2224865',
                        color: 'White',
                        type: 'Sedan',
                        confidence_score: 95
                      },
                      {
                        plate_number: 'ABC-123',
                        color: 'Blue',
                        type: 'SUV',
                        confidence_score: 88
                      }
                    ]
                  })
                }
              }]
            })
          }
        }
      }));

      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('mock-image-data'));

      const result = await service.detectCarsFromTrafficCamera('/mock/path/image.jpg');

      expect(result.success).toBe(true);
      expect(result.cars).toHaveLength(2);
      expect(result.totalDetected).toBe(2);
    });

    it('should handle no vehicles detected', async () => {
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    timestamp: '22/09/2025 15:55:54',
                    camera_metadata: 'Vehicle:1576 NonVehicle:0 Person:0',
                    vehicles: []
                  })
                }
              }]
            })
          }
        }
      }));

      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('mock-image-data'));

      const result = await service.detectCarsFromTrafficCamera('/mock/path/image.jpg');

      expect(result.success).toBe(false);
      expect(result.cars).toHaveLength(0);
      expect(result.totalDetected).toBe(0);
    });
  });

  describe('Plate Number Validation', () => {
    it('should validate correct traffic camera plate formats', () => {
      const validPlates = ['2224865', 'ABC-123', 'AB-1234', '22-24865'];
      
      validPlates.forEach(plate => {
        // @ts-ignore - accessing private method for testing
        const result = service.validateTrafficCameraPlate(plate);
        expect(result).toBe(plate);
      });
    });

    it('should reject invalid plate formats', () => {
      const invalidPlates = [
        'VEHICLE:1576', // Camera metadata
        '22/09/2025', // Date format
        '15:55:54', // Time format
        'CAM01', // Camera ID
        '', // Empty string
        'A', // Too short
        'ABCDEFGHIJKLMNOP' // Too long
      ];
      
      invalidPlates.forEach(plate => {
        // @ts-ignore - accessing private method for testing
        const result = service.validateTrafficCameraPlate(plate);
        expect(result).toBeNull();
      });
    });
  });

  describe('Vehicle Type Validation', () => {
    it('should validate correct vehicle types', () => {
      const validTypes = ['Sedan', 'SUV', 'Pickup', 'Truck', 'Bus', 'Motorcycle'];
      
      validTypes.forEach(type => {
        // @ts-ignore - accessing private method for testing
        const result = service.validateVehicleType(type.toLowerCase());
        expect(result).toBe(type);
      });
    });

    it('should handle vehicle type variations', () => {
      const typeVariations = {
        'car': 'Sedan',
        'pickup truck': 'Pickup',
        'lorry': 'Truck',
        'motorbike': 'Motorcycle'
      };
      
      Object.entries(typeVariations).forEach(([input, expected]) => {
        // @ts-ignore - accessing private method for testing
        const result = service.validateVehicleType(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Color Validation', () => {
    it('should validate correct colors', () => {
      const validColors = ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Gray', 'Silver'];
      
      validColors.forEach(color => {
        // @ts-ignore - accessing private method for testing
        const result = service.validateColor(color.toLowerCase());
        expect(result).toBe(color);
      });
    });

    it('should handle color variations', () => {
      const colorVariations = {
        'grey': 'Gray',
        'navy': 'Blue',
        'cream': 'White',
        'gold': 'Yellow'
      };
      
      Object.entries(colorVariations).forEach(([input, expected]) => {
        // @ts-ignore - accessing private method for testing
        const result = service.validateColor(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Timestamp Extraction', () => {
    it('should extract timestamp from camera metadata', () => {
      const metadata = 'Vehicle:1576 NonVehicle:0 Person:0 22/09/2025 15:55:54';
      
      const result = service.extractTimestamp(metadata);
      
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(8); // September (0-indexed)
      expect(result?.getDate()).toBe(22);
      expect(result?.getHours()).toBe(15);
      expect(result?.getMinutes()).toBe(55);
      expect(result?.getSeconds()).toBe(54);
    });

    it('should return null for invalid timestamp format', () => {
      const invalidMetadata = 'No timestamp here';
      
      const result = service.extractTimestamp(invalidMetadata);
      
      expect(result).toBeNull();
    });

    it('should return null for undefined metadata', () => {
      const result = service.extractTimestamp(undefined);
      
      expect(result).toBeNull();
    });
  });

  describe('Multiple Images Processing', () => {
    it('should process multiple traffic camera images', async () => {
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn()
              .mockResolvedValueOnce({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      timestamp: '22/09/2025 15:55:54',
                      vehicles: [{
                        plate_number: '2224865',
                        color: 'White',
                        type: 'Sedan',
                        confidence_score: 95
                      }]
                    })
                  }
                }]
              })
              .mockResolvedValueOnce({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      timestamp: '22/09/2025 15:56:10',
                      vehicles: [{
                        plate_number: 'ABC-123',
                        color: 'Blue',
                        type: 'SUV',
                        confidence_score: 88
                      }]
                    })
                  }
                }]
              })
          }
        }
      }));

      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('mock-image-data'));

      const imagePaths = ['/mock/path/image1.jpg', '/mock/path/image2.jpg'];
      const results = await service.processMultipleTrafficCameraImages(imagePaths);

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.cars[0]?.plate_number).toBe('2224865');
      expect(results[1]?.success).toBe(true);
      expect(results[1]?.cars[0]?.plate_number).toBe('ABC-123');
    });
  });

  describe('Statistics Generation', () => {
    it('should generate correct statistics for traffic camera results', () => {
      const mockResults = [
        {
          success: true,
          cars: [
            { plate_number: '2224865', color: 'White', type: 'Sedan', confidence_score: 95 },
            { plate_number: 'ABC-123', color: 'Blue', type: 'SUV', confidence_score: 88 }
          ],
          totalDetected: 2,
          timestamp: '22/09/2025 15:55:54'
        },
        {
          success: true,
          cars: [
            { plate_number: 'XYZ-789', color: 'Red', type: 'Pickup', confidence_score: 92 }
          ],
          totalDetected: 1,
          timestamp: '22/09/2025 15:56:10'
        },
        {
          success: false,
          cars: [],
          totalDetected: 0,
          error: 'No vehicles detected'
        }
      ];

      const stats = service.getTrafficCameraStats(mockResults);

      expect(stats.totalImages).toBe(3);
      expect(stats.successfulDetections).toBe(2);
      expect(stats.totalVehiclesDetected).toBe(3);
      expect(stats.averageConfidenceScore).toBe(91.67); // (95 + 88 + 92) / 3
      expect(stats.timestampsExtracted).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      }));

      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('mock-image-data'));

      const result = await service.detectCarsFromTrafficCamera('/mock/path/image.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
      expect(result.cars).toHaveLength(0);
    });

    it('should handle file reading errors', async () => {
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn()
          }
        }
      }));

      jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('File not found'));

      const result = await service.detectCarsFromTrafficCamera('/invalid/path/image.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });

    it('should handle malformed JSON responses', async () => {
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: 'Invalid JSON response'
                }
              }]
            })
          }
        }
      }));

      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('mock-image-data'));

      const result = await service.detectCarsFromTrafficCamera('/mock/path/image.jpg');

      expect(result.success).toBe(false);
      expect(result.cars).toHaveLength(0);
    });
  });
});
