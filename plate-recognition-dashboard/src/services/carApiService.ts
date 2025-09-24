import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

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
  timestamp: string;
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
  data: Car[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface CarResponse {
  success: boolean;
  data: Car;
}

export interface StatisticsResponse {
  success: boolean;
  data: {
    total: number;
    recent24h: number;
    today: number;
    byType: Array<{ type: string; count: number }>;
    byColor: Array<{ color: string; count: number }>;
    aiModel: string;
    lastUpdated: string;
  };
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
   * Upload images and recognize cars using ChatGPT Vision API
   */
  async recognizeCars(images: File[]): Promise<RecognitionResult> {
    const formData = new FormData();
    
    // Append all images to FormData
    images.forEach((image) => {
      formData.append('images', image);
    });

    const response = await apiClient.post<RecognitionResult>('/recognize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for multiple image processing
    });

    return response.data;
  }

  /**
   * Get all cars with optional filtering and pagination
   */
  async getCars(params?: {
    page?: number;
    limit?: number;
    plateNumber?: string;
    color?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<CarsResponse> {
    const response = await apiClient.get<CarsResponse>('/cars', { params });
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
   * Delete car by ID
   */
  async deleteCar(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/cars/${id}`);
    return response.data;
  }

  /**
   * Get comprehensive statistics
   */
  async getStatistics(): Promise<StatisticsResponse> {
    const response = await apiClient.get<StatisticsResponse>('/cars/statistics');
    return response.data;
  }

  /**
   * Get full image URL
   */
  getImageUrl(imageUrl: string): string {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    return `${API_BASE_URL.replace('/api', '')}${imageUrl}`;
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
    // Add dashes for better readability if needed
    if (plateNumber.length >= 6) {
      return plateNumber.replace(/(\d{3})(\d+)/, '$1-$2');
    }
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
