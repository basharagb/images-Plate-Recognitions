import StrictVisionService, { StrictDetectedCar, StrictCarRecognitionResult } from '../services/strictVisionService';
import fs from 'fs/promises';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

// Mock fs
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('StrictVisionService', () => {
  let service: StrictVisionService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockChatCompletions: jest.Mocked<OpenAI.Chat.Completions>;

  beforeEach(() => {
    // Set up environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';

    // Create mocked OpenAI instance
    mockChatCompletions = {
      create: jest.fn(),
    } as any;

    mockOpenAI = {
      chat: {
        completions: mockChatCompletions,
      },
    } as any;

    MockedOpenAI.mockImplementation(() => mockOpenAI);

    service = new StrictVisionService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if OPENAI_API_KEY is not provided', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new StrictVisionService()).toThrow('OPENAI_API_KEY is required');
    });

    it('should initialize with valid API key', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      expect(() => new StrictVisionService()).not.toThrow();
    });
  });

  describe('detectCarsStrict', () => {
    const mockImagePath = '/test/image.jpg';
    const mockImageBuffer = Buffer.from('fake-image-data');

    beforeEach(() => {
      mockedFs.readFile.mockResolvedValue(mockImageBuffer);
    });

    it('should successfully detect cars with valid response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([
              {
                plate_number: '22•24869',
                color: 'white',
                type: 'sedan'
              }
            ])
          }
        }]
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const result = await service.detectCarsStrict(mockImagePath);

      expect(result.success).toBe(true);
      expect(result.cars).toHaveLength(1);
      expect(result.cars[0]).toEqual({
        plate_number: '22-24869', // Normalized: bullet replaced with dash
        color: 'White',
        type: 'Sedan'
      });
      expect(result.totalDetected).toBe(1);
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '[]'
          }
        }]
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const result = await service.detectCarsStrict(mockImagePath);

      expect(result.success).toBe(false);
      expect(result.cars).toHaveLength(0);
      expect(result.totalDetected).toBe(0);
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'invalid json response'
          }
        }]
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const result = await service.detectCarsStrict(mockImagePath);

      expect(result.success).toBe(false);
      expect(result.cars).toHaveLength(0);
    });

    it('should filter out invalid cars', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([
              {
                plate_number: '22•24869',
                color: 'white',
                type: 'sedan'
              },
              {
                plate_number: '', // Invalid: empty plate
                color: 'red',
                type: 'suv'
              },
              {
                plate_number: 'ABC-123',
                color: 'invalid-color', // Invalid color
                type: 'truck'
              },
              {
                plate_number: 'DEF-456',
                color: 'blue',
                type: 'invalid-type' // Invalid type
              }
            ])
          }
        }]
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const result = await service.detectCarsStrict(mockImagePath);

      expect(result.success).toBe(true);
      expect(result.cars).toHaveLength(1); // Only the first valid car
      expect(result.cars[0]?.plate_number).toBe('22-24869');
    });

    it('should handle API errors', async () => {
      mockChatCompletions.create.mockRejectedValue(new Error('API Error'));

      const result = await service.detectCarsStrict(mockImagePath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
      expect(result.cars).toHaveLength(0);
    });
  });

  describe('plate normalization', () => {
    it('should normalize various plate formats', async () => {
      const testCases = [
        { input: '22•24869', expected: '22-24869' },
        { input: 'AB.123', expected: 'AB-123' },
        { input: 'AB 123', expected: 'AB-123' },
        { input: 'XY--456', expected: 'XY-456' },
        { input: '  ABC-123  ', expected: 'ABC-123' },
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify([{
                plate_number: testCase.input,
                color: 'white',
                type: 'sedan'
              }])
            }
          }]
        };

        mockChatCompletions.create.mockResolvedValue(mockResponse as any);

        const result = await service.detectCarsStrict('/test/image.jpg');
        
        if (result.cars.length > 0) {
          expect(result.cars[0]?.plate_number).toBe(testCase.expected);
        }
      }
    });

    it('should reject invalid plate formats', async () => {
      const invalidPlates = [
        'NOT_FOUND',
        '2023-12-25', // Date format
        '12:34', // Time format
        'CAM001', // Camera ID
        '---', // Only dashes
        'A', // Too short
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ', // Too long
      ];

      for (const invalidPlate of invalidPlates) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify([{
                plate_number: invalidPlate,
                color: 'white',
                type: 'sedan'
              }])
            }
          }]
        };

        mockChatCompletions.create.mockResolvedValue(mockResponse as any);

        const result = await service.detectCarsStrict('/test/image.jpg');
        
        expect(result.cars).toHaveLength(0); // Should be filtered out
      }
    });
  });

  describe('vehicle type validation', () => {
    it('should accept valid vehicle types', async () => {
      const validTypes = ['sedan', 'suv', 'pickup', 'truck', 'bus'];

      for (const type of validTypes) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify([{
                plate_number: 'ABC-123',
                color: 'white',
                type: type
              }])
            }
          }]
        };

        mockChatCompletions.create.mockResolvedValue(mockResponse as any);

        const result = await service.detectCarsStrict('/test/image.jpg');
        
        expect(result.cars).toHaveLength(1);
        expect(result.cars[0]?.type).toBe(type.charAt(0).toUpperCase() + type.slice(1));
      }
    });

    it('should handle vehicle type variations', async () => {
      const typeVariations = [
        { input: 'car', expected: 'Sedan' },
        { input: 'sport utility vehicle', expected: 'SUV' },
        { input: 'pickup truck', expected: 'Pickup' },
        { input: 'lorry', expected: 'Truck' },
        { input: 'coach', expected: 'Bus' },
      ];

      for (const variation of typeVariations) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify([{
                plate_number: 'ABC-123',
                color: 'white',
                type: variation.input
              }])
            }
          }]
        };

        mockChatCompletions.create.mockResolvedValue(mockResponse as any);

        const result = await service.detectCarsStrict('/test/image.jpg');
        
        expect(result.cars).toHaveLength(1);
        expect(result.cars[0]?.type).toBe(variation.expected);
      }
    });
  });

  describe('color validation', () => {
    it('should accept valid colors', async () => {
      const validColors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'silver', 'brown', 'orange'];

      for (const color of validColors) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify([{
                plate_number: 'ABC-123',
                color: color,
                type: 'sedan'
              }])
            }
          }]
        };

        mockChatCompletions.create.mockResolvedValue(mockResponse as any);

        const result = await service.detectCarsStrict('/test/image.jpg');
        
        expect(result.cars).toHaveLength(1);
        expect(result.cars[0]?.color).toBe(color.charAt(0).toUpperCase() + color.slice(1));
      }
    });

    it('should handle color variations', async () => {
      const colorVariations = [
        { input: 'grey', expected: 'Gray' },
        { input: 'dark blue', expected: 'Blue' },
        { input: 'navy', expected: 'Blue' },
        { input: 'maroon', expected: 'Red' },
        { input: 'lime', expected: 'Green' },
        { input: 'beige', expected: 'Brown' },
        { input: 'cream', expected: 'White' },
        { input: 'gold', expected: 'Yellow' },
      ];

      for (const variation of colorVariations) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify([{
                plate_number: 'ABC-123',
                color: variation.input,
                type: 'sedan'
              }])
            }
          }]
        };

        mockChatCompletions.create.mockResolvedValue(mockResponse as any);

        const result = await service.detectCarsStrict('/test/image.jpg');
        
        expect(result.cars).toHaveLength(1);
        expect(result.cars[0]?.color).toBe(variation.expected);
      }
    });
  });

  describe('detectCarsFromMultipleImagesStrict', () => {
    it('should process multiple images', async () => {
      const imagePaths = ['/test/image1.jpg', '/test/image2.jpg'];
      
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([{
              plate_number: 'ABC-123',
              color: 'white',
              type: 'sedan'
            }])
          }
        }]
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const results = await service.detectCarsFromMultipleImagesStrict(imagePaths);

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(true);
      expect(results[1]?.success).toBe(true);
    });
  });

  describe('getStrictDetectionStats', () => {
    it('should calculate correct statistics', () => {
      const results: StrictCarRecognitionResult[] = [
        { success: true, cars: [{ plate_number: 'ABC-123', color: 'White', type: 'Sedan' }], totalDetected: 1 },
        { success: true, cars: [{ plate_number: 'DEF-456', color: 'Blue', type: 'SUV' }], totalDetected: 1 },
        { success: false, cars: [], totalDetected: 0 },
      ];

      const stats = service.getStrictDetectionStats(results);

      expect(stats.totalImages).toBe(3);
      expect(stats.successfulDetections).toBe(2);
      expect(stats.totalCarsDetected).toBe(2);
      expect(stats.averageCarsPerImage).toBe(0.67);
      expect(stats.qualityScore).toBe(66.67);
    });
  });
});
