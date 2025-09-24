import OpenAI from 'openai';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export interface CarDetails {
  id: string;
  plateNumber: string;
  color: string;
  type: string;
}

export interface CarRecognitionResponse {
  success: boolean;
  cars: CarDetails[];
  totalDetected: number;
  error?: string;
  rawResponse?: string;
}

class ChatGPTCarService {
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
   * Analyze car image using ChatGPT Vision API (gpt-4o-mini)
   */
  public async analyzeCars(imagePath: string): Promise<CarRecognitionResponse> {
    try {
      console.log(`Analyzing image: ${imagePath}`);

      // Read and encode image to base64
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Exact prompt as requested
      const prompt = `Analyze this image and detect all vehicles. For each vehicle found, extract:
1. Plate number (digits only, no letters or spaces)
2. Car color 
3. Car type (truck, bus, sedan, SUV, etc)
4. Assign a unique ID

Return the results in this exact JSON format:
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

      // Call ChatGPT Vision API with gpt-4o-mini
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
        temperature: 0, // For consistent results
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

      console.log('ChatGPT Raw Response:', content);

      // Parse the JSON response
      const parsedResult = this.parseResponse(content);
      
      // Validate and clean the car data
      const validatedCars = this.validateCars(parsedResult.cars || []);

      console.log(`Detected ${validatedCars.length} cars`);

      return {
        success: validatedCars.length > 0,
        cars: validatedCars,
        totalDetected: validatedCars.length,
        rawResponse: content,
      };

    } catch (error) {
      console.error('ChatGPT Vision API error:', error);
      return {
        success: false,
        cars: [],
        totalDetected: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse ChatGPT response and extract car data
   */
  private parseResponse(content: string): { cars: any[] } {
    try {
      // Clean the response (remove any markdown formatting)
      let cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^[^{]*/, '') // Remove any text before the first {
        .replace(/[^}]*$/, '') // Remove any text after the last }
        .trim();

      // Find the JSON object
      const jsonStart = cleanContent.indexOf('{');
      const jsonEnd = cleanContent.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanContent = cleanContent.substring(jsonStart, jsonEnd);
      }

      console.log('Cleaned JSON:', cleanContent);

      // Parse JSON
      const parsed = JSON.parse(cleanContent);
      
      return {
        cars: Array.isArray(parsed.cars) ? parsed.cars : [],
      };
    } catch (error) {
      console.error('Failed to parse ChatGPT response:', error);
      console.log('Original content:', content);
      
      // Fallback: try to extract data manually
      return this.extractDataManually(content);
    }
  }

  /**
   * Manual extraction fallback if JSON parsing fails
   */
  private extractDataManually(content: string): { cars: any[] } {
    const cars: any[] = [];
    
    try {
      // Look for patterns in the text
      const lines = content.split('\n');
      let currentCar: any = {};
      
      for (const line of lines) {
        const lowerLine = line.toLowerCase().trim();
        
        // Look for plate numbers (digits only)
        const plateMatch = line.match(/\b\d{3,8}\b/);
        if (plateMatch && lowerLine.includes('plate')) {
          currentCar.plateNumber = plateMatch[0];
        }
        
        // Look for colors
        const colorMatch = lowerLine.match(/\b(red|blue|green|yellow|black|white|gray|grey|silver|brown|orange|purple|pink)\b/);
        if (colorMatch && lowerLine.includes('color')) {
          currentCar.color = colorMatch[0];
        }
        
        // Look for vehicle types
        const typeMatch = lowerLine.match(/\b(sedan|suv|truck|bus|van|coupe|hatchback|pickup|motorcycle|car)\b/);
        if (typeMatch && lowerLine.includes('type')) {
          currentCar.type = typeMatch[0];
        }
        
        // If we have all required fields, add the car
        if (currentCar.plateNumber && currentCar.color && currentCar.type) {
          currentCar.id = uuidv4();
          cars.push({ ...currentCar });
          currentCar = {};
        }
      }
    } catch (error) {
      console.error('Manual extraction failed:', error);
    }
    
    return { cars };
  }

  /**
   * Validate and clean car data from ChatGPT
   */
  private validateCars(cars: any[]): CarDetails[] {
    const validatedCars: CarDetails[] = [];
    
    for (const car of cars) {
      try {
        // Validate required fields exist
        if (!car.plateNumber || !car.color || !car.type) {
          console.warn('Skipping car with missing fields:', car);
          continue;
        }

        // Clean plate number (digits only)
        const cleanPlateNumber = this.extractDigitsOnly(car.plateNumber);
        if (!cleanPlateNumber || cleanPlateNumber.length < 3) {
          console.warn('Invalid plate number:', car.plateNumber);
          continue;
        }

        // Clean and validate other fields
        const cleanColor = this.cleanTextField(car.color);
        const cleanType = this.cleanTextField(car.type);
        
        if (!cleanColor || !cleanType) {
          console.warn('Invalid color or type:', { color: car.color, type: car.type });
          continue;
        }

        // Generate unique ID if not provided
        const uniqueId = car.id || uuidv4();

        validatedCars.push({
          id: uniqueId,
          plateNumber: cleanPlateNumber,
          color: cleanColor,
          type: cleanType,
        });

        console.log('Validated car:', {
          id: uniqueId,
          plateNumber: cleanPlateNumber,
          color: cleanColor,
          type: cleanType,
        });
      } catch (error) {
        console.warn('Error validating car:', error);
        continue;
      }
    }
    
    return validatedCars;
  }

  /**
   * Extract digits only from plate number
   */
  private extractDigitsOnly(plateText: string): string {
    if (!plateText || typeof plateText !== 'string') {
      return '';
    }
    
    // Extract only digits
    const digitsOnly = plateText.replace(/\D/g, '');
    
    // Validate length (typically 3-8 digits)
    if (digitsOnly.length < 3 || digitsOnly.length > 8) {
      return '';
    }
    
    return digitsOnly;
  }

  /**
   * Clean text fields (color, type)
   */
  private cleanTextField(field: string): string {
    if (!field || typeof field !== 'string') {
      return '';
    }
    
    // Clean and normalize
    const cleaned = field
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');
    
    // Validate minimum length
    if (cleaned.length < 2) {
      return '';
    }
    
    return cleaned;
  }

  /**
   * Process multiple images
   */
  public async analyzeMultipleImages(imagePaths: string[]): Promise<CarRecognitionResponse[]> {
    const results: CarRecognitionResponse[] = [];
    
    for (const imagePath of imagePaths) {
      try {
        const result = await this.analyzeCars(imagePath);
        results.push(result);
        
        // Add delay to avoid rate limiting
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
}

export default ChatGPTCarService;
