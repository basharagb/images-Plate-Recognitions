import OpenAI from 'openai';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export interface TrafficCameraDetectedCar {
  plate_number: string;
  color: string;
  type: string;
  timestamp?: string;
  camera_info?: string;
  confidence_score?: number;
}

export interface TrafficCameraRecognitionResult {
  success: boolean;
  cars: TrafficCameraDetectedCar[];
  totalDetected: number;
  timestamp?: string;
  camera_metadata?: string;
  error?: string;
  rawResponse?: string;
}

/**
 * Specialized AI Vision Service for Traffic Camera License Plate Recognition
 * 
 * Optimized for speed camera images with:
 * - Timestamp overlays (22/09/2025 15:55:54 format)
 * - Camera metadata (Vehicle:1576 NonVehicle:0 Person:0)
 * - Multiple vehicles in traffic scenes
 * - Various lighting conditions and angles
 * - High accuracy requirements for enforcement
 */
class TrafficCameraVisionService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for traffic camera vision service');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Detect cars from traffic camera images with specialized processing
   */
  public async detectCarsFromTrafficCamera(imagePath: string): Promise<TrafficCameraRecognitionResult> {
    try {
      // Read and encode image to base64
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Specialized prompt for traffic camera images
      const prompt = `You are an AI Vision model specialized in analyzing traffic camera images for speed enforcement.

TRAFFIC CAMERA IMAGE ANALYSIS:
This image is from a speed camera system. Analyze it carefully to extract:

1. LICENSE PLATE NUMBERS: Read the exact license plate numbers visible on vehicles
2. VEHICLE DETAILS: Color, type (Sedan, SUV, Pickup, Truck, Bus, Motorcycle)
3. TIMESTAMP: Extract the timestamp from the camera overlay (format: DD/MM/YYYY HH:MM:SS)
4. CAMERA METADATA: Extract any camera information displayed (Vehicle count, etc.)

CRITICAL ACCURACY REQUIREMENTS:
- Read license plates CHARACTER BY CHARACTER - do not guess or approximate
- Focus on the CLEAREST, most visible license plates only
- Ignore blurry, partially obscured, or unclear plates
- Pay special attention to the main vehicle in focus (usually center/foreground)
- Distinguish between actual license plates and camera overlay text/timestamps

LICENSE PLATE READING RULES:
- Read EXACTLY what you see - do not modify or normalize
- Common formats: "2224865", "22-24865", "AB-1234", "ABC-123"
- Ignore camera timestamps, metadata, and overlay text
- Only extract text that is clearly on a vehicle's license plate

VEHICLE CLASSIFICATION:
- Sedan: Regular passenger car
- SUV: Sport utility vehicle, crossover
- Pickup: Pickup truck
- Truck: Large commercial truck, lorry
- Bus: Public transport bus, coach
- Motorcycle: Two-wheeled vehicle

COLOR IDENTIFICATION:
Use standard colors: White, Black, Gray, Silver, Red, Blue, Green, Yellow, Brown, Orange

TIMESTAMP EXTRACTION:
- Look for timestamp in format: DD/MM/YYYY HH:MM:SS
- Usually displayed at top of image
- Example: "22/09/2025 15:55:54"

Return ONLY a JSON object in this exact format:
{
  "timestamp": "extracted_timestamp_or_null",
  "camera_metadata": "extracted_camera_info_or_null", 
  "vehicles": [
    {
      "plate_number": "exact_plate_as_seen",
      "color": "vehicle_color",
      "type": "vehicle_type",
      "confidence_score": confidence_0_to_100
    }
  ]
}

IMPORTANT: 
- Only include vehicles where you can clearly read the license plate
- If no clear plates are visible, return empty vehicles array: []
- Do not include uncertain or partially visible plates
- Focus on accuracy over quantity`;

      // Call OpenAI Vision API with high detail
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
                  detail: 'high', // High detail for maximum accuracy
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.0, // Zero temperature for maximum consistency
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

      // Parse and validate the traffic camera response
      const parsedResult = this.parseTrafficCameraResponse(content);
      
      return {
        success: parsedResult.cars.length > 0,
        cars: parsedResult.cars,
        totalDetected: parsedResult.cars.length,
        timestamp: parsedResult.timestamp,
        camera_metadata: parsedResult.camera_metadata,
        rawResponse: content,
      };

    } catch (error) {
      console.error('Traffic Camera Vision API error:', error);
      return {
        success: false,
        cars: [],
        totalDetected: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse the AI Vision response for traffic camera data
   */
  private parseTrafficCameraResponse(content: string): {
    cars: TrafficCameraDetectedCar[];
    timestamp?: string;
    camera_metadata?: string;
  } {
    try {
      // Clean the response (remove any markdown formatting)
      let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Handle case where response is wrapped in additional text
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      // Parse as JSON
      const parsed = JSON.parse(cleanContent);
      
      // Validate structure
      if (!parsed || typeof parsed !== 'object') {
        console.warn('Invalid response structure:', parsed);
        return { cars: [] };
      }

      // Extract vehicles array
      const vehicles = Array.isArray(parsed.vehicles) ? parsed.vehicles : [];
      
      // Validate and process each vehicle
      const validatedCars: TrafficCameraDetectedCar[] = [];
      
      for (const vehicle of vehicles) {
        const validatedCar = this.validateTrafficCameraCar(vehicle);
        if (validatedCar) {
          // Add timestamp and camera info to each car
          if (parsed.timestamp) {
            validatedCar.timestamp = parsed.timestamp;
          }
          if (parsed.camera_metadata) {
            validatedCar.camera_info = parsed.camera_metadata;
          }
          validatedCars.push(validatedCar);
        }
      }
      
      return {
        cars: validatedCars,
        timestamp: parsed.timestamp || undefined,
        camera_metadata: parsed.camera_metadata || undefined,
      };
      
    } catch (error) {
      console.error('Failed to parse traffic camera response:', error);
      console.log('Raw content:', content);
      return { cars: [] };
    }
  }

  /**
   * Validate individual vehicle data from traffic camera
   */
  private validateTrafficCameraCar(vehicle: any): TrafficCameraDetectedCar | null {
    try {
      // Validate required fields
      if (!vehicle.plate_number || !vehicle.color || !vehicle.type) {
        console.warn('Vehicle missing required fields:', vehicle);
        return null;
      }

      // Validate plate number (keep original format for traffic cameras)
      const plateNumber = this.validateTrafficCameraPlate(vehicle.plate_number);
      if (!plateNumber) {
        console.warn('Invalid plate number:', vehicle.plate_number);
        return null;
      }

      // Validate vehicle type
      const validType = this.validateVehicleType(vehicle.type);
      if (!validType) {
        console.warn('Invalid vehicle type:', vehicle.type);
        return null;
      }

      // Validate color
      const validColor = this.validateColor(vehicle.color);
      if (!validColor) {
        console.warn('Invalid color:', vehicle.color);
        return null;
      }

      // Validate confidence score
      const confidenceScore = typeof vehicle.confidence_score === 'number' 
        ? Math.max(0, Math.min(100, vehicle.confidence_score))
        : undefined;

      return {
        plate_number: plateNumber,
        color: validColor,
        type: validType,
        confidence_score: confidenceScore,
      };
    } catch (error) {
      console.warn('Error validating vehicle data:', error);
      return null;
    }
  }

  /**
   * Validate license plate for traffic camera (preserve original format)
   */
  private validateTrafficCameraPlate(plateText: string): string | null {
    if (!plateText || typeof plateText !== 'string') {
      return null;
    }
    
    // Clean the plate text but preserve original format
    let cleaned = plateText.trim().toUpperCase();
    
    // Remove only obvious non-plate characters
    cleaned = cleaned.replace(/[^\w\-]/g, ''); // Keep letters, numbers, and dashes
    
    // Validate length (2-15 characters is reasonable)
    if (cleaned.length < 2 || cleaned.length > 15) {
      return null;
    }
    
    // Must contain at least some alphanumeric characters
    if (!/[A-Z0-9]/.test(cleaned)) {
      return null;
    }
    
    // Reject common non-plate patterns
    const invalidPatterns = [
      /^(NOT|FOUND|NONE|NULL|UNDEFINED|UNKNOWN|NOTFOUND)$/i,
      /^\d{4}[-\/]\d{2}[-\/]\d{2}/, // Date patterns
      /^\d{2}:\d{2}/, // Time patterns
      /^CAM\d+/, // Camera IDs
      /^VEHICLE/i, // Camera metadata
      /^NONVEHICLE/i, // Camera metadata
      /^PERSON/i, // Camera metadata
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(cleaned)) {
        return null;
      }
    }
    
    return cleaned;
  }

  /**
   * Validate and normalize vehicle type
   */
  private validateVehicleType(type: string): string | null {
    if (!type || typeof type !== 'string') {
      return null;
    }
    
    const normalizedType = type.toLowerCase().trim();
    const validTypes = ['sedan', 'suv', 'pickup', 'truck', 'bus', 'motorcycle'];
    
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
      'bike': 'Motorcycle',
      'motorbike': 'Motorcycle',
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
   * Extract timestamp from traffic camera image
   */
  public extractTimestamp(cameraMetadata?: string): Date | null {
    if (!cameraMetadata) return null;
    
    // Look for timestamp pattern: DD/MM/YYYY HH:MM:SS
    const timestampMatch = cameraMetadata.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    
    if (timestampMatch) {
      const [, day, month, year, hour, minute, second] = timestampMatch;
      // Ensure all values are strings before parsing
      if (day && month && year && hour && minute && second) {
        return new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1, // Month is 0-indexed
          parseInt(day, 10),
          parseInt(hour, 10),
          parseInt(minute, 10),
          parseInt(second, 10)
        );
      }
    }
    
    return null;
  }

  /**
   * Process multiple traffic camera images
   */
  public async processMultipleTrafficCameraImages(imagePaths: string[]): Promise<TrafficCameraRecognitionResult[]> {
    const results: TrafficCameraRecognitionResult[] = [];
    
    for (const imagePath of imagePaths) {
      try {
        const result = await this.detectCarsFromTrafficCamera(imagePath);
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

  /**
   * Get traffic camera detection statistics
   */
  public getTrafficCameraStats(results: TrafficCameraRecognitionResult[]): {
    totalImages: number;
    successfulDetections: number;
    totalVehiclesDetected: number;
    averageConfidenceScore: number;
    timestampsExtracted: number;
  } {
    const totalImages = results.length;
    const successfulDetections = results.filter(r => r.success).length;
    const totalVehiclesDetected = results.reduce((sum, r) => sum + r.totalDetected, 0);
    const timestampsExtracted = results.filter(r => r.timestamp).length;
    
    // Calculate average confidence score
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    results.forEach(result => {
      result.cars.forEach(car => {
        if (car.confidence_score !== undefined) {
          totalConfidence += car.confidence_score;
          confidenceCount++;
        }
      });
    });
    
    const averageConfidenceScore = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
    
    return {
      totalImages,
      successfulDetections,
      totalVehiclesDetected,
      averageConfidenceScore: Math.round(averageConfidenceScore * 100) / 100,
      timestampsExtracted,
    };
  }
}

export default TrafficCameraVisionService;
