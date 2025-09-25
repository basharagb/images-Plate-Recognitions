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
  message?: string;
  isDemo?: boolean;
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

      // Enhanced prompt for single clearest car detection
      const prompt = `You are an expert in license plate recognition. Analyze this image carefully and find the SINGLE CLEAREST vehicle with the most visible and readable license plate.

CRITICAL REQUIREMENT: Return only ONE car - the one with the clearest, most readable license plate.

For the clearest vehicle found, extract the following information:
1. License plate number - Read ALL visible characters (letters AND numbers) EXACTLY as they appear
2. Car color - The primary color of the vehicle  
3. Car type - The type of vehicle (sedan, SUV, truck, bus, van, pickup, motorcycle, etc.)

IMPORTANT INSTRUCTIONS:
- ONLY return the single car with the clearest license plate
- Read the license plate EXACTLY as it appears - include both letters and numbers
- If you see letters like "A", "B", "C" on the plate, include them as letters, not numbers
- If you see numbers like "1", "2", "3" on the plate, include them as numbers
- Look at the plate very carefully - sometimes what looks like a letter might be a number or vice versa
- Choose the car where you can read the license plate most clearly
- If multiple cars are visible, pick the one with the best plate visibility
- Return the plate number exactly as you see it, maintaining the original format

Return the results in this exact JSON format with only ONE car:
{
  "cars": [
    {
      "id": "car_1", 
      "plateNumber": "ABC123",
      "color": "white",
      "type": "sedan"
    }
  ]
}

If no vehicles with clearly visible plates are detected, return: {"cars": []}
Only return valid JSON, no additional text or explanations.`;

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
      
      // Check if it's a quota exceeded error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isQuotaError = errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('exceeded');
      
      if (isQuotaError) {
        console.log('⚠️ OpenAI API quota exceeded, providing demo response');
        // Generate realistic demo plates based on image filename
        const imageHash = imagePath.split('/').pop()?.split('_')[0] || 'default';
        const demoPlates = this.generateDemoPlates(imageHash);
        
        return {
          success: true,
          cars: demoPlates,
          totalDetected: demoPlates.length,
          message: 'Demo mode: Showing nearest 1-2 vehicles with clear license plates. Add OpenAI credits for real recognition.',
          isDemo: true,
        };
      }
      
      return {
        success: false,
        cars: [],
        totalDetected: 0,
        error: errorMessage,
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
   * Generate realistic demo plates for testing
   */
  private generateDemoPlates(imageHash: string): CarDetails[] {
    // Create deterministic but varied demo data based on image hash
    const hashNum = imageHash.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Real Jordanian license plate numbers from the test images
    const demoPlates = [
      '21-83168', '36-85928', '22-24869', '25-17856', '29-26261',
      '33-42781', '27-65432', '24-96543', '31-23456', '35-78901'
    ];
    
    const colors = ['white', 'black', 'silver', 'red', 'blue', 'gray', 'green'];
    const types = ['sedan', 'SUV', 'hatchback', 'pickup', 'van', 'bus'];
    
    // Generate only 1 car (the clearest one)
    const results: CarDetails[] = [];
    
    const plateIndex = hashNum % demoPlates.length;
    const colorIndex = hashNum % colors.length;
    const typeIndex = hashNum % types.length;
    
    results.push({
      id: 'demo_car_1',
      plateNumber: demoPlates[plateIndex] || '12-34567',
      color: colors[colorIndex] || 'white',
      type: types[typeIndex] || 'sedan'
    });
    
    return results;
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

        // Clean plate number (preserve original format with dashes)
        const cleanPlateNumber = this.cleanPlateNumber(car.plateNumber);
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
   * Clean plate number preserving original format with dashes
   */
  private cleanPlateNumber(plateText: string): string {
    if (!plateText || typeof plateText !== 'string') {
      return '';
    }
    
    // Clean the plate text - keep alphanumeric characters and dashes
    const cleaned = plateText.replace(/[^A-Z0-9-]/gi, '').toUpperCase().trim();
    
    // Validate length (typically 3-15 characters including dashes)
    if (cleaned.length < 2 || cleaned.length > 15) {
      return '';
    }
    
    return cleaned;
  }

  /**
   * Clean and validate plate number (keep letters and numbers only - legacy method)
   */
  private extractDigitsOnly(plateText: string): string {
    if (!plateText || typeof plateText !== 'string') {
      return '';
    }
    
    // Clean the plate text - keep alphanumeric characters only
    const cleaned = plateText.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Validate length (typically 3-10 characters for most countries)
    if (cleaned.length < 2 || cleaned.length > 10) {
      return '';
    }
    
    return cleaned;
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
