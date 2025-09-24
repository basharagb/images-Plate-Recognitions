import EnhancedVisionService from '../services/enhancedVisionService';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

// Mock environment variable
process.env.OPENAI_API_KEY = 'test-key';

describe('EnhancedVisionService', () => {
  let service: EnhancedVisionService;

  beforeEach(() => {
    service = new EnhancedVisionService();
  });

  describe('cleanPlateNumber', () => {
    it('should handle alphanumeric plates with bullet points', () => {
      // Access private method through any cast for testing
      const cleanPlateNumber = (service as any).cleanPlateNumber;
      
      expect(cleanPlateNumber('22•24869')).toBe('22•24869');
      expect(cleanPlateNumber('22-24869')).toBe('22-24869');
      expect(cleanPlateNumber('AB•1234')).toBe('AB•1234');
      expect(cleanPlateNumber('123-ABC')).toBe('123-ABC');
    });

    it('should normalize special characters', () => {
      const cleanPlateNumber = (service as any).cleanPlateNumber;
      
      expect(cleanPlateNumber('22–24869')).toBe('22-24869'); // em dash to regular dash
      expect(cleanPlateNumber('22·24869')).toBe('22•24869'); // middle dot to bullet
    });

    it('should handle quoted plate numbers', () => {
      const cleanPlateNumber = (service as any).cleanPlateNumber;
      
      expect(cleanPlateNumber('"22•24869"')).toBe('22•24869');
      expect(cleanPlateNumber("'AB-1234'")).toBe('AB-1234');
    });

    it('should remove common prefixes', () => {
      const cleanPlateNumber = (service as any).cleanPlateNumber;
      
      expect(cleanPlateNumber('License plate: 22•24869')).toBe('22•24869');
      expect(cleanPlateNumber('Plate number: AB-1234')).toBe('AB-1234');
    });

    it('should reject invalid formats', () => {
      const cleanPlateNumber = (service as any).cleanPlateNumber;
      
      expect(cleanPlateNumber('')).toBe('');
      expect(cleanPlateNumber('X')).toBe(''); // too short
      expect(cleanPlateNumber('ABCDEFGHIJKLMNOP')).toBe(''); // too long
      expect(cleanPlateNumber('!@#$%')).toBe(''); // no alphanumeric
    });
  });

  describe('parseVisionResponse', () => {
    it('should parse valid JSON response', () => {
      const parseVisionResponse = (service as any).parseVisionResponse;
      
      const validJson = JSON.stringify({
        cars: [
          {
            id: 'car_1',
            plateNumber: '22•24869',
            color: 'white',
            type: 'sedan'
          }
        ]
      });

      const result = parseVisionResponse(validJson);
      expect(result.cars).toHaveLength(1);
      expect(result.cars[0].plateNumber).toBe('22•24869');
    });

    it('should handle JSON with markdown formatting', () => {
      const parseVisionResponse = (service as any).parseVisionResponse;
      
      const jsonWithMarkdown = '```json\n{"cars": [{"id": "car_1", "plateNumber": "22•24869", "color": "white", "type": "sedan"}]}\n```';

      const result = parseVisionResponse(jsonWithMarkdown);
      expect(result.cars).toHaveLength(1);
      expect(result.cars[0].plateNumber).toBe('22•24869');
    });

    it('should fallback to extraction on invalid JSON', () => {
      const parseVisionResponse = (service as any).parseVisionResponse;
      
      const invalidJson = 'The car has plate number 22•24869 and is white in color, type sedan';

      const result = parseVisionResponse(invalidJson);
      // Should fallback to text extraction
      expect(result.cars).toBeDefined();
    });
  });

  describe('validateAndCleanCars', () => {
    it('should validate and clean car data', () => {
      const validateAndCleanCars = (service as any).validateAndCleanCars;
      
      const rawCars = [
        {
          id: 'car_1',
          plateNumber: '22•24869',
          color: 'white',
          type: 'sedan'
        },
        {
          // Missing required fields
          plateNumber: '',
          color: 'blue'
        },
        {
          id: 'car_2',
          plateNumber: 'AB-1234',
          color: 'red',
          type: 'SUV'
        }
      ];

      const result = validateAndCleanCars(rawCars);
      expect(result).toHaveLength(2); // Should filter out invalid car
      expect(result[0].plateNumber).toBe('22•24869');
      expect(result[1].plateNumber).toBe('AB-1234');
    });
  });
});
