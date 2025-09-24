import OpenAI from 'openai';

export interface AILicensePlateResult {
  plateNumber: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  vehicleInfo?: {
    type: string;
    color: string;
    make?: string;
  };
}

class AILicensePlateService {
  private openai: OpenAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    // Check for API key in environment variables
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || null;
    if (this.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
      });
    }
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  isConfigured(): boolean {
    return this.openai !== null && this.apiKey !== null;
  }

  async analyzeLicensePlate(imageFile: File): Promise<AILicensePlateResult> {
    if (!this.openai) {
      throw new Error('OpenAI API not configured. Please set your API key.');
    }

    try {
      // Convert file to base64
      const base64Image = await this.fileToBase64(imageFile);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this traffic camera image and extract license plate information. Please provide:
1. The exact license plate number (including dashes, letters, and numbers)
2. Confidence level (0-100)
3. Vehicle information if visible (type, color, make if identifiable)

Focus on accuracy for license plate recognition. If multiple vehicles are present, identify the most prominent one or the one that appears to be speeding/violating traffic rules.

Return the response in JSON format like this:
{
  "plateNumber": "XX-XXXXX",
  "confidence": 95,
  "vehicleInfo": {
    "type": "sedan",
    "color": "white",
    "make": "Toyota"
  }
}`
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI service');
      }

      // Try to parse JSON response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return {
            plateNumber: result.plateNumber || 'No plate detected',
            confidence: result.confidence || 0,
            vehicleInfo: result.vehicleInfo
          };
        }
      } catch (parseError) {
        console.warn('Could not parse JSON response, extracting manually');
      }

      // Fallback: extract license plate from text response
      const plateMatch = content.match(/[A-Z0-9]{2,3}[-\s]?[A-Z0-9]{3,5}/gi);
      const plateNumber = plateMatch ? plateMatch[0] : 'No plate detected';
      
      // Extract confidence if mentioned
      const confidenceMatch = content.match(/confidence[:\s]*(\d+)/i);
      const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 85;

      return {
        plateNumber,
        confidence,
        vehicleInfo: {
          type: 'vehicle',
          color: 'unknown'
        }
      };

    } catch (error) {
      console.error('AI License Plate Analysis Error:', error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Alternative: Use Google Vision API (if preferred)
  async analyzeWithGoogleVision(imageFile: File): Promise<AILicensePlateResult> {
    // This would require Google Cloud Vision API setup
    // Implementation would go here if Google Vision is preferred
    throw new Error('Google Vision API not implemented yet');
  }

  // Fallback to enhanced OCR if AI fails
  async fallbackToEnhancedOCR(imageFile: File): Promise<AILicensePlateResult> {
    // This would use the existing Tesseract.js with better preprocessing
    // Could include image enhancement, contrast adjustment, etc.
    throw new Error('Enhanced OCR fallback not implemented yet');
  }
}

const aiLicensePlateServiceInstance = new AILicensePlateService();
export default aiLicensePlateServiceInstance;
