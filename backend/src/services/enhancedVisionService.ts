import OpenAI from 'openai';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export interface DetectedCar {
  id: string;
  plateNumber: string;
  color: string;
  type: string;
  confidence?: number;
}

export interface CarRecognitionResult {
  success: boolean;
  cars: DetectedCar[];
  totalDetected: number;
  error?: string;
  rawResponse?: string;
}

class EnhancedVisionService {
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
   * Detect multiple vehicles and extract detailed information using ChatGPT Vision API
   */
  public async detectCars(imagePath: string): Promise<CarRecognitionResult> {
    try {
      // Read and encode image to base64
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Enhanced prompt for multi-vehicle detection
      const prompt = `Detect all vehicles in this image. For each vehicle, return:
- Plate number (digits only, no letters or spaces)
- Car color
- Car type (truck, bus, sedan, SUV, etc)
- Unique ID for the detection

Return result as structured JSON in this exact format:
{
  "cars": [
    {
      "id": "unique_id_1",
      "plateNumber": "123456",
      "color": "red",
      "type": "sedan"
    },
    {
      "id": "unique_id_2", 
      "plateNumber": "789012",
      "color": "blue",
      "type": "SUV"
    }
  ]
}

If no vehicles are detected, return: {"cars": []}
Only return valid JSON, no additional text.`;

      // Call ChatGPT Vision API
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
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
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1, // Low temperature for consistent results
      });

      const content = response.choices[0]?.message?.content?.trim();
      
      if (!content) {
        return {
          success: false,
          cars: [],
          totalDetected: 0,
          error: 'No response from ChatGPT Vision API',
        };
      }

      // Parse JSON response
      const parsedResult = this.parseVisionResponse(content);
      
      // Validate and clean the detected cars
      const validatedCars = this.validateAndCleanCars(parsedResult.cars || []);

      return {
        success: validatedCars.length > 0,
        cars: validatedCars,
        totalDetected: validatedCars.length,
        rawResponse: content,
      };

    } catch (error) {
      console.error('Enhanced Vision API error:', error);
      return {
        success: false,
        cars: [],
        totalDetected: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse the ChatGPT Vision API response
   */
  private parseVisionResponse(content: string): { cars: any[] } {
    try {
      // Clean the response (remove any markdown formatting)
      let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Try to parse as JSON
      const parsed = JSON.parse(cleanContent);
      
      return {
        cars: Array.isArray(parsed.cars) ? parsed.cars : [],
      };
    } catch (error) {
      console.error('Failed to parse vision response:', error);
      console.log('Raw content:', content);
      
      // Fallback: try to extract car data using regex
      return this.fallbackExtraction(content);
    }
  }

  /**
   * Fallback extraction method if JSON parsing fails
   */
  private fallbackExtraction(content: string): { cars: any[] } {
    const cars: any[] = [];
    
    // Try to find patterns in the text
    const platePattern = /plate.*?(\d{3,8})/gi;
    const colorPattern = /color.*?(red|blue|green|yellow|black|white|gray|silver|brown|orange)/gi;
    const typePattern = /type.*?(sedan|suv|truck|bus|van|coupe|hatchback|pickup|motorcycle)/gi;
    
    const plateMatches = content.match(platePattern);
    const colorMatches = content.match(colorPattern);
    const typeMatches = content.match(typePattern);
    
    if (plateMatches && plateMatches.length > 0) {
      for (let i = 0; i < plateMatches.length; i++) {
        const plateNumber = plateMatches[i]?.match(/\d{3,8}/)?.[0] || '';
        const color = colorMatches?.[i]?.split(/color.*?/i)?.[1]?.trim() || 'unknown';
        const type = typeMatches?.[i]?.split(/type.*?/i)?.[1]?.trim() || 'unknown';
        
        if (plateNumber) {
          cars.push({
            id: uuidv4(),
            plateNumber,
            color,
            type,
          });
        }
      }
    }
    
    return { cars };
  }

  /**
   * Validate and clean detected car data
   */
  private validateAndCleanCars(cars: any[]): DetectedCar[] {
    const validatedCars: DetectedCar[] = [];
    
    for (const car of cars) {
      try {
        // Validate required fields
        if (!car.plateNumber || !car.color || !car.type) {
          continue;
        }

        // Clean plate number (digits only)
        const cleanPlateNumber = this.cleanPlateNumber(car.plateNumber);
        if (!cleanPlateNumber || cleanPlateNumber === 'NOT_FOUND') {
          continue;
        }

        // Clean and validate other fields
        const cleanColor = this.cleanField(car.color, 'unknown');
        const cleanType = this.cleanField(car.type, 'unknown');
        const detectionId = car.id || uuidv4();

        validatedCars.push({
          id: detectionId,
          plateNumber: cleanPlateNumber,
          color: cleanColor,
          type: cleanType,
          confidence: car.confidence || 85, // Default confidence
        });
      } catch (error) {
        console.warn('Error validating car data:', error);
        continue;
      }
    }
    
    return validatedCars;
  }

  /**
   * Clean plate number to digits only
   */
  private cleanPlateNumber(plateText: string): string {
    if (!plateText) return '';
    
    // Extract only digits
    const digitsOnly = plateText.replace(/\D/g, '');
    
    // Validate length (typically 3-8 digits for most countries)
    if (digitsOnly.length < 3 || digitsOnly.length > 8) {
      return '';
    }
    
    return digitsOnly;
  }

  /**
   * Clean and validate text fields
   */
  private cleanField(field: string, defaultValue: string): string {
    if (!field || typeof field !== 'string') {
      return defaultValue;
    }
    
    return field.toLowerCase().trim().replace(/[^a-z0-9]/g, '') || defaultValue;
  }

  /**
   * Process multiple images in batch
   */
  public async detectCarsFromMultipleImages(imagePaths: string[]): Promise<CarRecognitionResult[]> {
    const results: CarRecognitionResult[] = [];
    
    for (const imagePath of imagePaths) {
      try {
        const result = await this.detectCars(imagePath);
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
   * Get detection statistics
   */
  public getDetectionStats(results: CarRecognitionResult[]): {
    totalImages: number;
    successfulDetections: number;
    totalCarsDetected: number;
    averageCarsPerImage: number;
  } {
    const totalImages = results.length;
    const successfulDetections = results.filter(r => r.success).length;
    const totalCarsDetected = results.reduce((sum, r) => sum + r.totalDetected, 0);
    const averageCarsPerImage = totalImages > 0 ? totalCarsDetected / totalImages : 0;
    
    return {
      totalImages,
      successfulDetections,
      totalCarsDetected,
      averageCarsPerImage: Math.round(averageCarsPerImage * 100) / 100,
    };
  }
}

export default EnhancedVisionService;
