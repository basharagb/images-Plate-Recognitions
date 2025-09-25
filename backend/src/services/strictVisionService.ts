import OpenAI from 'openai';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export interface StrictDetectedCar {
  plate_number: string;
  color: string;
  type: string;
}

export interface StrictCarRecognitionResult {
  success: boolean;
  cars: StrictDetectedCar[];
  totalDetected: number;
  error?: string;
  rawResponse?: string;
}

/**
 * Strict AI Vision Service for License Plate Recognition
 * 
 * This service implements strict detection criteria:
 * - Only fully visible and closed cars in frame
 * - Extract plates ONLY if clear and readable
 * - Detect car color and type (Sedan, SUV, Pickup, Truck, Bus)
 * - Normalize plate format: digits/letters only, replace dots/bullets with "-"
 * - Exclude timestamps, text overlays, or non-plate numbers
 * - Return structured JSON array format
 */
class StrictVisionService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Detect cars with strict criteria using AI Vision
   */
  public async detectCarsStrict(imagePath: string): Promise<StrictCarRecognitionResult> {
    try {
      // Read and encode image to base64
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Strict detection prompt based on user specifications
      const prompt = `You are an AI Vision model for license plate recognition.

STRICT DETECTION CRITERIA:
1. Detect ONLY cars that are fully visible and closed in the frame
2. Extract license plate numbers ONLY if the plate is clear and readable
3. IGNORE vehicles with blurry, cropped, or unreadable plates
4. For each valid vehicle, detect car color and type (Sedan, SUV, Pickup, Truck, Bus)
5. Normalize plate format: digits and letters only, replace any dots or bullets with "-"
6. Exclude any timestamps, text overlays, or non-plate numbers

VEHICLE ANALYSIS REQUIREMENTS:
- Only process vehicles that are COMPLETELY visible in the frame
- Plates must be CLEARLY readable without guessing
- Vehicle types: Sedan, SUV, Pickup, Truck, Bus (use these exact terms)
- Colors: Use standard color names (red, blue, green, yellow, black, white, gray, silver, brown, orange)

PLATE NORMALIZATION RULES:
- Convert "22•24869" to "22-24869"
- Convert "AB.123" to "AB-123"
- Remove any spaces: "AB 123" becomes "AB-123"
- Keep only letters, numbers, and single dashes
- Reject plates with timestamps, camera IDs, or overlay text

QUALITY FILTERS:
- Reject blurry or out-of-focus plates
- Reject partially cropped vehicles
- Reject plates with poor lighting or shadows
- Reject plates at extreme angles
- Only accept plates with high confidence readability

Return output strictly in JSON array format:
[
  {
    "plate_number": "<normalized_plate>",
    "color": "<standard_color>",
    "type": "<vehicle_type>"
  }
]

If no vehicles meet the strict criteria, return: []
NO additional text, explanations, or markdown formatting.`;

      // Call OpenAI Vision API
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high', // High detail for better plate recognition
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.1, // Very low temperature for consistent results
      });

      const content = response.choices[0]?.message?.content?.trim();
      
      if (!content) {
        return {
          success: false,
          cars: [],
          totalDetected: 0,
          error: 'No response from AI Vision API',
        };
      }

      // Parse and validate the strict response
      const parsedResult = this.parseStrictResponse(content);
      
      // Apply additional validation and normalization
      const validatedCars = this.validateStrictCars(parsedResult);

      return {
        success: validatedCars.length > 0,
        cars: validatedCars,
        totalDetected: validatedCars.length,
        rawResponse: content,
      };

    } catch (error) {
      console.error('Strict Vision API error:', error);
      return {
        success: false,
        cars: [],
        totalDetected: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse the AI Vision response with strict validation
   */
  private parseStrictResponse(content: string): StrictDetectedCar[] {
    try {
      // Clean the response (remove any markdown formatting)
      let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Handle case where response is wrapped in additional text
      const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      // Parse as JSON array
      const parsed = JSON.parse(cleanContent);
      
      // Ensure it's an array
      if (!Array.isArray(parsed)) {
        console.warn('Response is not an array:', parsed);
        return [];
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse strict vision response:', error);
      console.log('Raw content:', content);
      
      // No fallback for strict mode - if parsing fails, return empty array
      return [];
    }
  }

  /**
   * Validate cars with strict criteria
   */
  private validateStrictCars(cars: any[]): StrictDetectedCar[] {
    const validatedCars: StrictDetectedCar[] = [];
    
    for (const car of cars) {
      try {
        // Validate required fields exist
        if (!car.plate_number || !car.color || !car.type) {
          console.warn('Car missing required fields:', car);
          continue;
        }

        // Normalize and validate plate number
        const normalizedPlate = this.normalizePlateNumber(car.plate_number);
        if (!normalizedPlate || !this.isValidPlateFormat(normalizedPlate)) {
          console.warn('Invalid plate format:', car.plate_number, '->', normalizedPlate);
          continue;
        }

        // Validate vehicle type (must be one of the specified types)
        const validType = this.validateVehicleType(car.type);
        if (!validType) {
          console.warn('Invalid vehicle type:', car.type);
          continue;
        }

        // Validate color
        const validColor = this.validateColor(car.color);
        if (!validColor) {
          console.warn('Invalid color:', car.color);
          continue;
        }

        validatedCars.push({
          plate_number: normalizedPlate,
          color: validColor,
          type: validType,
        });
      } catch (error) {
        console.warn('Error validating car data:', error);
        continue;
      }
    }
    
    return validatedCars;
  }

  /**
   * Normalize plate number according to specifications
   */
  private normalizePlateNumber(plateText: string): string {
    if (!plateText || typeof plateText !== 'string') {
      return '';
    }
    
    let normalized = plateText.trim().toUpperCase();
    
    // Replace dots and bullets with dashes
    normalized = normalized
      .replace(/[•·]/g, '-')  // Replace bullets with dashes
      .replace(/\./g, '-')    // Replace dots with dashes
      .replace(/\s+/g, '-')   // Replace spaces with dashes
      .replace(/[–—]/g, '-')  // Replace em/en dashes with regular dashes
      .replace(/-+/g, '-')    // Replace multiple dashes with single dash
      .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
    
    // Keep only letters, numbers, and single dashes
    normalized = normalized.replace(/[^A-Z0-9-]/g, '');
    
    return normalized;
  }

  /**
   * Validate plate format (letters, numbers, and dashes only)
   */
  private isValidPlateFormat(plate: string): boolean {
    // Must contain at least some alphanumeric characters
    if (!/[A-Z0-9]/.test(plate)) {
      return false;
    }
    
    // Must be reasonable length (2-15 characters)
    if (plate.length < 2 || plate.length > 15) {
      return false;
    }
    
    // Must not be common non-plate text
    const invalidPatterns = [
      /^(NOT|FOUND|NONE|NULL|UNDEFINED|UNKNOWN|NOTFOUND)$/i,
      /^\d{4}-\d{2}-\d{2}/, // Date patterns
      /^\d{2}:\d{2}/, // Time patterns
      /^CAM\d+/, // Camera IDs
      /^[0-9-]+$/, // Only numbers and dashes (likely timestamp)
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(plate)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate and normalize vehicle type
   */
  private validateVehicleType(type: string): string | null {
    if (!type || typeof type !== 'string') {
      return null;
    }
    
    const normalizedType = type.toLowerCase().trim();
    const validTypes = ['sedan', 'suv', 'pickup', 'truck', 'bus'];
    
    // Direct match
    if (validTypes.includes(normalizedType)) {
      return this.capitalizeFirst(normalizedType);
    }
    
    // Handle common variations
    const typeMap: Record<string, string> = {
      'car': 'Sedan',
      'automobile': 'Sedan',
      'vehicle': 'Sedan',
      'suv': 'SUV',
      'sport utility vehicle': 'SUV',
      'pickup truck': 'Pickup',
      'pick-up': 'Pickup',
      'lorry': 'Truck',
      'semi': 'Truck',
      'trailer': 'Truck',
      'coach': 'Bus',
      'minibus': 'Bus',
    };
    
    return typeMap[normalizedType] || null;
  }

  /**
   * Validate and normalize color
   */
  private validateColor(color: string): string | null {
    if (!color || typeof color !== 'string') {
      return null;
    }
    
    const normalizedColor = color.toLowerCase().trim();
    const validColors = [
      'red', 'blue', 'green', 'yellow', 'black', 'white', 
      'gray', 'silver', 'brown', 'orange'
    ];
    
    // Direct match
    if (validColors.includes(normalizedColor)) {
      return this.capitalizeFirst(normalizedColor);
    }
    
    // Handle common variations
    const colorMap: Record<string, string> = {
      'grey': 'Gray',
      'dark blue': 'Blue',
      'light blue': 'Blue',
      'navy': 'Blue',
      'maroon': 'Red',
      'burgundy': 'Red',
      'crimson': 'Red',
      'lime': 'Green',
      'forest green': 'Green',
      'beige': 'Brown',
      'tan': 'Brown',
      'cream': 'White',
      'off-white': 'White',
      'charcoal': 'Black',
      'gold': 'Yellow',
    };
    
    return colorMap[normalizedColor] || null;
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Process multiple images with strict criteria
   */
  public async detectCarsFromMultipleImagesStrict(imagePaths: string[]): Promise<StrictCarRecognitionResult[]> {
    const results: StrictCarRecognitionResult[] = [];
    
    for (const imagePath of imagePaths) {
      try {
        const result = await this.detectCarsStrict(imagePath);
        results.push(result);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          success: false,
          cars: [],
          totalDetected: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return results;
  }

  /**
   * Get strict detection statistics
   */
  public getStrictDetectionStats(results: StrictCarRecognitionResult[]): {
    totalImages: number;
    successfulDetections: number;
    totalCarsDetected: number;
    averageCarsPerImage: number;
    qualityScore: number;
  } {
    const totalImages = results.length;
    const successfulDetections = results.filter(r => r.success).length;
    const totalCarsDetected = results.reduce((sum, r) => sum + r.totalDetected, 0);
    const averageCarsPerImage = totalImages > 0 ? totalCarsDetected / totalImages : 0;
    const qualityScore = totalImages > 0 ? (successfulDetections / totalImages) * 100 : 0;
    
    return {
      totalImages,
      successfulDetections,
      totalCarsDetected,
      averageCarsPerImage: Math.round(averageCarsPerImage * 100) / 100,
      qualityScore: Math.round(qualityScore * 100) / 100,
    };
  }
}

export default StrictVisionService;
