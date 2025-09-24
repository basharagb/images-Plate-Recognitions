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

      // Enhanced prompt for multi-vehicle detection with alphanumeric plate support
      const prompt = `Analyze this traffic image carefully and detect vehicles with visible license plates. 

CRITICAL ANALYSIS STEPS:
1. Identify ALL vehicles in the image
2. For each vehicle, examine the license plate area closely
3. Extract the COMPLETE license plate text exactly as it appears
4. Prioritize vehicles that are:
   - Clearly visible and well-lit
   - Centered or prominent in the image
   - Have readable license plates

PLATE EXTRACTION RULES:
- Include ALL characters: letters, numbers, special symbols (•, -, spaces)
- Common formats: 22•24869, AB-1234, 123-ABC, XX•XXXXX
- Do NOT convert or modify the text - extract exactly as shown
- If you see "22•24869" write "22•24869", not "2224869"
- Pay attention to bullet points (•) and dashes (-)

VEHICLE INFORMATION:
- Color: Primary/dominant color of the vehicle body
- Type: sedan, SUV, truck, bus, pickup, van, hatchback, coupe
- Focus on the most prominent vehicles first

Return ONLY valid JSON in this format:
{
  "cars": [
    {
      "id": "car_1", 
      "plateNumber": "22•24869",
      "color": "white",
      "type": "sedan"
    }
  ]
}

If no clear license plates are visible, return: {"cars": []}
NO additional text, explanations, or markdown formatting.`;

      // Call ChatGPT Vision API
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
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
    
    // Try to find patterns in the text - updated for alphanumeric plates with more flexibility
    const platePattern = /plate.*?([A-Z0-9\s\-•\.]{2,15})/gi;
    const colorPattern = /color.*?(red|blue|green|yellow|black|white|gray|silver|brown|orange)/gi;
    const typePattern = /type.*?(sedan|suv|truck|bus|van|coupe|hatchback|pickup|motorcycle)/gi;
    
    const plateMatches = content.match(platePattern);
    const colorMatches = content.match(colorPattern);
    const typeMatches = content.match(typePattern);
    
    if (plateMatches && plateMatches.length > 0) {
      for (let i = 0; i < plateMatches.length; i++) {
        const plateMatch = plateMatches[i]?.match(/([A-Z0-9\s\-•\.]{2,15})/)?.[0] || '';
        const plateNumber = this.cleanPlateNumber(plateMatch);
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
   * Clean and validate alphanumeric plate number
   */
  private cleanPlateNumber(plateText: string): string {
    if (!plateText) return '';
    
    // Remove common prefixes/suffixes and extra whitespace
    let cleaned = plateText
      .replace(/^(license plate|plate number|number):\s*/i, '')
      .replace(/\s*(license plate|plate number)$/i, '')
      .trim();
    
    // Remove quotes if present
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    // Normalize special characters (convert various dash/bullet types to standard ones)
    cleaned = cleaned
      .replace(/[–—]/g, '-')  // Convert em/en dashes to regular dash
      .replace(/[•·]/g, '•')  // Normalize bullet points
      .replace(/\s+/g, ' ')   // Normalize whitespace
      .trim()
      .toUpperCase();
    
    // Validate format - allow letters, numbers, spaces, dashes, bullet points, and other common plate characters
    if (!/^[A-Z0-9\s\-•\.]{2,15}$/.test(cleaned)) {
      console.warn('Plate validation failed for:', cleaned);
      return '';
    }
    
    // Additional validation - ensure it contains at least some alphanumeric characters
    if (!/[A-Z0-9]/.test(cleaned)) {
      console.warn('Plate contains no alphanumeric characters:', cleaned);
      return '';
    }
    
    // Log successful plate cleaning
    console.log('Successfully cleaned plate:', plateText, '->', cleaned);
    
    return cleaned;
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
