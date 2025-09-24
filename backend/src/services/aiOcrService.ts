import { createWorker } from 'tesseract.js';
import OpenAI from 'openai';
import AWS from 'aws-sdk';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// Types
export interface OCRResult {
  plateNumber: string;
  confidence: number;
  processingMethod: 'AI' | 'OCR';
  vehicleInfo?: {
    type?: string;
    color?: string;
    make?: string;
  };
  rawText?: string;
}

export interface ProcessingOptions {
  preferredMethod?: 'AI' | 'OCR' | 'AUTO';
  fallbackEnabled?: boolean;
  confidenceThreshold?: number;
}

class AILicensePlateService {
  private openai: OpenAI | null = null;
  private rekognition: AWS.Rekognition | null = null;
  private tesseractWorker: any = null;

  constructor() {
    this.initializeServices();
  }

  private async initializeServices() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    // Initialize AWS Rekognition
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
      });
      this.rekognition = new AWS.Rekognition();
    }

    // Initialize Tesseract worker
    this.tesseractWorker = await createWorker('eng');
    await this.tesseractWorker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
      tessedit_pageseg_mode: '8', // Single word
    });
  }

  /**
   * Process image with OpenAI Vision API
   */
  private async processWithOpenAI(imagePath: string): Promise<OCRResult> {
    if (!this.openai) {
      throw new Error('OpenAI API not configured');
    }

    try {
      // Read and encode image
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image of a car and extract the license plate number and vehicle information. 
                Return ONLY a JSON object with this exact structure:
                {
                  "plateNumber": "extracted plate number",
                  "confidence": confidence_score_0_to_100,
                  "vehicleInfo": {
                    "type": "car/truck/motorcycle/etc",
                    "color": "color of vehicle",
                    "make": "brand if identifiable"
                  }
                }
                If no license plate is visible, return plateNumber as "NOT_FOUND".`,
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
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse JSON response
      const result = JSON.parse(content);
      
      return {
        plateNumber: result.plateNumber || 'NOT_FOUND',
        confidence: result.confidence || 0,
        processingMethod: 'AI',
        vehicleInfo: result.vehicleInfo,
        rawText: content,
      };
    } catch (error) {
      console.error('OpenAI processing error:', error);
      throw new Error(`OpenAI processing failed: ${error}`);
    }
  }

  /**
   * Process image with AWS Rekognition
   */
  private async processWithAWS(imagePath: string): Promise<OCRResult> {
    if (!this.rekognition) {
      throw new Error('AWS Rekognition not configured');
    }

    try {
      const imageBuffer = await fs.readFile(imagePath);

      const params = {
        Image: {
          Bytes: imageBuffer,
        },
        Filters: {
          RegionsOfInterest: [
            {
              BoundingBox: {
                Width: 1,
                Height: 1,
                Left: 0,
                Top: 0,
              },
            },
          ],
        },
      };

      const result = await this.rekognition.detectText(params).promise();
      
      // Extract license plate patterns
      const textDetections = result.TextDetections || [];
      let bestMatch = '';
      let confidence = 0;

      for (const detection of textDetections) {
        const text = detection.DetectedText || '';
        const detectionConfidence = detection.Confidence || 0;
        
        // License plate pattern matching
        if (this.isLicensePlatePattern(text) && detectionConfidence > confidence) {
          bestMatch = text;
          confidence = detectionConfidence;
        }
      }

      return {
        plateNumber: bestMatch || 'NOT_FOUND',
        confidence: confidence,
        processingMethod: 'AI',
        rawText: textDetections.map(d => d.DetectedText).join(' '),
      };
    } catch (error) {
      console.error('AWS Rekognition processing error:', error);
      throw new Error(`AWS Rekognition processing failed: ${error}`);
    }
  }

  /**
   * Process image with Tesseract OCR
   */
  private async processWithTesseract(imagePath: string): Promise<OCRResult> {
    try {
      // Preprocess image for better OCR
      const processedImagePath = await this.preprocessImage(imagePath);
      
      const { data: { text, confidence } } = await this.tesseractWorker.recognize(processedImagePath);
      
      // Extract license plate from OCR text
      const plateNumber = this.extractLicensePlate(text);
      
      // Clean up processed image
      if (processedImagePath !== imagePath) {
        await fs.unlink(processedImagePath).catch(() => {});
      }

      return {
        plateNumber: plateNumber || 'NOT_FOUND',
        confidence: confidence || 0,
        processingMethod: 'OCR',
        rawText: text,
      };
    } catch (error) {
      console.error('Tesseract processing error:', error);
      throw new Error(`Tesseract processing failed: ${error}`);
    }
  }

  /**
   * Preprocess image for better OCR results
   */
  private async preprocessImage(imagePath: string): Promise<string> {
    try {
      const outputPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, '_processed.jpg');
      
      await sharp(imagePath)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .grayscale()
        .normalize()
        .sharpen()
        .jpeg({ quality: 90 })
        .toFile(outputPath);
        
      return outputPath;
    } catch (error) {
      console.error('Image preprocessing error:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  /**
   * Extract license plate from OCR text using regex patterns
   */
  private extractLicensePlate(text: string): string {
    const cleanText = text.replace(/[^A-Z0-9\s-]/g, '').trim();
    
    // Common license plate patterns
    const patterns = [
      /\b[A-Z]{2,3}[-\s]?\d{3,4}\b/g,      // XX-123, XXX-1234
      /\b\d{3,4}[-\s]?[A-Z]{2,3}\b/g,      // 123-XX, 1234-XXX
      /\b[A-Z]{1,2}\d{1,3}[A-Z]{1,3}\b/g,  // A123BC
      /\b\d{1,3}[A-Z]{2,4}\d{1,3}\b/g,     // 12ABC34
      /\b[A-Z0-9]{5,8}\b/g,                // General alphanumeric
    ];

    for (const pattern of patterns) {
      const matches = cleanText.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].replace(/\s+/g, '');
      }
    }

    return '';
  }

  /**
   * Check if text matches license plate patterns
   */
  private isLicensePlatePattern(text: string): boolean {
    const cleanText = text.replace(/[^A-Z0-9]/g, '');
    return cleanText.length >= 4 && cleanText.length <= 8 && /[A-Z]/.test(cleanText) && /\d/.test(cleanText);
  }

  /**
   * Main processing method with fallback support
   */
  public async processImage(imagePath: string, options: ProcessingOptions = {}): Promise<OCRResult> {
    const {
      preferredMethod = 'AUTO',
      fallbackEnabled = true,
      confidenceThreshold = 70,
    } = options;

    let result: OCRResult;
    let error: Error | null = null;

    try {
      // Determine processing method
      if (preferredMethod === 'AI' || (preferredMethod === 'AUTO' && this.openai)) {
        try {
          result = await this.processWithOpenAI(imagePath);
          if (result.confidence >= confidenceThreshold || !fallbackEnabled) {
            return result;
          }
        } catch (err) {
          error = err as Error;
          if (!fallbackEnabled) throw err;
        }
      }

      // Try AWS Rekognition as secondary AI option
      if (this.rekognition && (preferredMethod === 'AI' || preferredMethod === 'AUTO')) {
        try {
          result = await this.processWithAWS(imagePath);
          if (result.confidence >= confidenceThreshold || !fallbackEnabled) {
            return result;
          }
        } catch (err) {
          error = err as Error;
          if (!fallbackEnabled) throw err;
        }
      }

      // Fallback to Tesseract OCR
      result = await this.processWithTesseract(imagePath);
      return result;

    } catch (err) {
      console.error('All processing methods failed:', err);
      throw error || err;
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
    }
  }
}

export default AILicensePlateService;
