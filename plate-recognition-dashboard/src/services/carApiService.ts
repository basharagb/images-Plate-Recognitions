import axios from 'axios';

const API_BASE_URL = 'http://localhost:3002/api';

// Configure axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for image processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Car {
  id: number;
  plateNumber: string;
  color: string;
  type: string;
  imageUrl: string;
  imagePath?: string;
  timestamp: string;
  confidence?: number;
  cameraInfo?: string;
  detectionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecognitionResult {
  success: boolean;
  message: string;
  cars: Car[];
  summary: {
    totalImages: number;
    successfulImages: number;
    failedImages: number;
    totalCarsDetected: number;
    aiModel: string;
  };
  details: Array<{
    filename: string;
    success: boolean;
    carsDetected: number;
    cars?: any[];
    message?: string;
    error?: string;
    rawResponse?: string;
  }>;
}

export interface CarsResponse {
  success: boolean;
  message: string;
  totalCars: number;
  totalInDatabase: number;
  last24Hours: number;
  pagination: {
    limit: number;
    offset: number;
    totalPages: number;
    currentPage: number;
  };
  filters: {
    plateNumber?: string;
    color?: string;
    type?: string;
    sortBy: string;
    sortOrder: string;
  };
  cars: Car[];
  timestamp: string;
}

export interface CarResponse {
  success: boolean;
  data: Car;
}

export interface StatisticsResponse {
  success: boolean;
  message: string;
  totalCars: number;
  totalInDatabase: number;
  last24Hours: number;
  timestamp: string;
}

export interface HealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
  version: string;
  features: string[];
  aiModel: string;
  chatgpt: string;
  database: string;
}

class CarApiService {
  /**
   * Check API health status
   */
  async checkHealth(): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  }

  /**
   * Upload images and recognize cars using simplified AI Vision API
   */
  async recognizeCars(images: File[]): Promise<RecognitionResult> {
    console.log('API Service: Starting recognition with', images.length, 'images');
    
    const formData = new FormData();
    
    // Append all images to FormData
    images.forEach((image, index) => {
      console.log(`API Service: Adding image ${index + 1}:`, { name: image.name, size: image.size, type: image.type });
      formData.append('images', image);
    });

    console.log('API Service: Sending POST request to /cars (simplified API)');
    try {
      const response = await apiClient.post('/cars', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for multiple image processing
      });

      console.log('API Service: Recognition response:', response.data);
      
      // Transform the simplified API response to match the expected RecognitionResult interface
      const transformedResponse: RecognitionResult = {
        success: response.data.success,
        message: response.data.message,
        cars: response.data.cars || [],
        summary: {
          totalImages: response.data.totalImages || images.length,
          successfulImages: response.data.success ? response.data.totalImages || images.length : 0,
          failedImages: response.data.success ? 0 : response.data.totalImages || images.length,
          totalCarsDetected: response.data.totalCarsDetected || 0,
          aiModel: 'gpt-4o-mini (Enhanced Accuracy)',
        },
        details: response.data.processingDetails || []
      };
      
      return transformedResponse;
    } catch (error) {
      console.error('API Service: Recognition error:', error);
      throw error;
    }
  }

  /**
   * Upload traffic camera images and recognize cars using specialized AI Vision API
   */
  async recognizeTrafficCameraCars(images: File[]): Promise<RecognitionResult> {
    console.log('API Service: Starting traffic camera recognition with', images.length, 'images');
    
    if (images.length === 1) {
      // Single image processing
      const formData = new FormData();
      formData.append('image', images[0]);

      console.log('API Service: Sending POST request to /traffic-camera/process');
      try {
        const response = await apiClient.post('/traffic-camera/process', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
        });

        console.log('API Service: Traffic camera response:', response.data);
        
        // Transform response to match RecognitionResult interface
        return {
          success: response.data.success,
          message: response.data.message,
          cars: response.data.cars || [],
          summary: {
            totalImages: 1,
            successfulImages: response.data.success ? 1 : 0,
            failedImages: response.data.success ? 0 : 1,
            totalCarsDetected: response.data.data?.totalDetected || 0,
            aiModel: 'gpt-4o-mini (Traffic Camera Optimized)',
          },
          details: [{
            filename: images[0].name,
            success: response.data.success,
            carsDetected: response.data.data?.totalDetected || 0,
            cars: response.data.cars || [],
            message: response.data.message,
          }]
        };
      } catch (error) {
        console.error('API Service: Traffic camera recognition error:', error);
        throw error;
      }
    } else {
      // Multiple images processing
      const formData = new FormData();
      images.forEach((image) => {
        formData.append('images', image);
      });

      console.log('API Service: Sending POST request to /traffic-camera/process-multiple');
      try {
        const response = await apiClient.post('/traffic-camera/process-multiple', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000, // 2 minutes for multiple images
        });

        console.log('API Service: Multiple traffic camera response:', response.data);
        
        // Transform response to match RecognitionResult interface
        return {
          success: response.data.success,
          message: response.data.message,
          cars: response.data.cars || [],
          summary: {
            totalImages: images.length,
            successfulImages: response.data.data?.imagesProcessed || 0,
            failedImages: images.length - (response.data.data?.imagesProcessed || 0),
            totalCarsDetected: response.data.data?.totalDetected || 0,
            aiModel: 'gpt-4o-mini (Traffic Camera Optimized)',
          },
          details: response.data.data?.results?.map((result: any, index: number) => ({
            filename: images[index]?.name || `image_${index + 1}`,
            success: result.success,
            carsDetected: result.detectedVehicles || 0,
            cars: [],
            message: result.success ? 'Success' : result.error,
          })) || []
        };
      } catch (error) {
        console.error('API Service: Multiple traffic camera recognition error:', error);
        throw error;
      }
    }
  }

  /**
   * Get all cars with optional filtering and pagination (simplified API)
   */
  async getCars(params?: {
    limit?: number;
    offset?: number;
    plateNumber?: string;
    color?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<CarsResponse> {
    console.log('API Service: Getting cars with params:', params);
    const response = await apiClient.get<CarsResponse>('/cars', { params });
    console.log('API Service: Cars response:', response.data);
    return response.data;
  }

  /**
   * Get single car by ID
   */
  async getCar(id: number): Promise<CarResponse> {
    const response = await apiClient.get<CarResponse>(`/cars/${id}`);
    return response.data;
  }

  /**
   * Get statistics from the cars endpoint (simplified API)
   * Note: Statistics are now included in the getCars response
   */
  async getStatistics(): Promise<StatisticsResponse> {
    console.log('API Service: Getting statistics from cars endpoint');
    // Get cars with limit 0 to just get statistics
    const response = await this.getCars({ limit: 0 });
    
    // Transform the cars response to statistics format
    const statsResponse: StatisticsResponse = {
      success: response.success,
      message: `Statistics: ${response.totalInDatabase} total cars, ${response.last24Hours} in last 24h`,
      totalCars: response.totalCars,
      totalInDatabase: response.totalInDatabase,
      last24Hours: response.last24Hours,
      timestamp: response.timestamp,
    };
    
    console.log('API Service: Statistics response:', statsResponse);
    return statsResponse;
  }

  /**
   * Get full image URL
   */
  getImageUrl(imageUrl: string): string {
    if (imageUrl.startsWith('http')) {
      console.log('Image URL already absolute:', imageUrl);
      return imageUrl;
    }
    const fullUrl = `${API_BASE_URL.replace('/api', '')}${imageUrl}`;
    console.log('Constructed image URL:', {
      originalUrl: imageUrl,
      apiBaseUrl: API_BASE_URL,
      baseWithoutApi: API_BASE_URL.replace('/api', ''),
      fullUrl: fullUrl
    });
    return fullUrl;
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Format plate number for display
   */
  formatPlateNumber(plateNumber: string): string {
    // Return the plate number as-is since it may contain letters, numbers, and special characters
    // The backend should already provide properly formatted plates
    return plateNumber;
  }

  /**
   * Capitalize text
   */
  capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Get color badge class for UI
   */
  getColorBadgeClass(color: string): string {
    const colorMap: Record<string, string> = {
      red: 'bg-red-100 text-red-800',
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      black: 'bg-gray-100 text-gray-800',
      white: 'bg-gray-50 text-gray-600 border border-gray-200',
      silver: 'bg-gray-100 text-gray-700',
      gray: 'bg-gray-100 text-gray-700',
      brown: 'bg-amber-100 text-amber-800',
      orange: 'bg-orange-100 text-orange-800',
    };
    
    return colorMap[color.toLowerCase()] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Get vehicle type icon
   */
  getVehicleTypeIcon(type: string): string {
    const iconMap: Record<string, string> = {
      sedan: '🚗',
      suv: '🚙',
      truck: '🚚',
      bus: '🚌',
      van: '🚐',
      motorcycle: '🏍️',
      pickup: '🛻',
      coupe: '🚗',
      hatchback: '🚗',
    };
    
    return iconMap[type.toLowerCase()] || '🚗';
  }
}

// Create and export singleton instance
const carApiService = new CarApiService();
export default carApiService;
