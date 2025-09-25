# Simple Car Recognition API - Postman Collection

This directory contains a simplified Postman collection for testing the Car Recognition API with only 2 main endpoints.

## Files

- `Simple_Car_Recognition_API.postman_collection.json` - Simplified API collection (2 endpoints)
- `Car_Plate_Recognition_Environment.postman_environment.json` - Environment variables
- `README.md` - This documentation file

## Quick Start

1. **Import Collection**: Import `Simple_Car_Recognition_API.postman_collection.json` into Postman
2. **Import Environment**: Import `Car_Plate_Recognition_Environment.postman_environment.json` into Postman
3. **Select Environment**: Choose "Car Plate Recognition Environment" in Postman
4. **Start Testing**: Run the requests in the collection

## Environment Variables

The environment includes the following variables:

- `baseUrl`: API base URL (default: `http://localhost:3001`)

## 🎯 Simplified API - Only 2 Endpoints

### 1. Upload Car Images
**POST** `/api/cars`
- Upload 1-10 car images for AI recognition
- Get complete car details back immediately
- Automatic processing and database storage
- Content-Type: `multipart/form-data`
- Body: `images` (file array)

**Response includes:**
- All detected cars with complete details
- Processing statistics for each image
- Success/error information
- Timestamp and metadata

### 2. Get All Cars
**GET** `/api/cars`
- Retrieve all detected cars from database
- Complete pagination and filtering support
- Sorting by any field
- Database statistics included

**Query Parameters:**
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)
- `sortBy`: Sort field (default: timestamp)
- `sortOrder`: ASC or DESC (default: DESC)
- `plateNumber`: Filter by plate number (partial match)
- `color`: Filter by car color (partial match)
- `type`: Filter by car type (partial match)

**Response includes:**
- Array of cars with complete details
- Pagination information
- Database statistics (total cars, last 24h)
- Applied filters and sorting

### 3. Health Check (Bonus)
**GET** `/api/health`
- Check API status and configuration
- View available endpoints
- Verify AI model and database connectivity

## Usage Examples

### Upload Images
```bash
POST http://localhost:3001/api/cars
Content-Type: multipart/form-data

# Form data:
images: car1.jpg, car2.png, car3.webp
```

### Get Cars with Filtering
```bash
GET http://localhost:3001/api/cars?limit=10&plateNumber=22&color=white&sortBy=timestamp&sortOrder=DESC
```

### Get All Cars (Simple)
```bash
GET http://localhost:3001/api/cars
```

## Features

✅ **Single Upload Endpoint** - One API for all image processing
✅ **Complete Car Details** - Plate number, color, type, confidence, etc.
✅ **Enhanced AI Accuracy** - Improved character recognition
✅ **Automatic Processing** - Upload → AI Recognition → Database Storage
✅ **Comprehensive Filtering** - Search by plate, color, type
✅ **Pagination Support** - Handle large datasets efficiently
✅ **Statistics Included** - Database metrics and processing info
✅ **Error Handling** - Detailed error messages and validation
✅ **File Cleanup** - Automatic cleanup of uploaded files

## Testing

Each request includes:
- Comprehensive test scripts
- Response validation
- Example responses for different scenarios
- Error handling examples

## Environment Setup

1. Make sure your API server is running on `http://localhost:3001`
2. Ensure you have test car images ready for upload (JPG, PNG, WebP)
3. OpenAI API key should be configured in your `.env` file

## API Response Format

### Upload Response
```json
{
  "success": true,
  "message": "Processed 1 image(s), detected 1 car(s)",
  "totalImages": 1,
  "totalCarsDetected": 1,
  "cars": [
    {
      "id": 123,
      "plateNumber": "22-24869",
      "color": "White",
      "type": "Sedan",
      "imageUrl": "/uploads/car-image-123.jpg",
      "confidence": 95,
      "cameraInfo": "Image: car-image.jpg",
      "timestamp": "2025-09-25T10:59:00.000Z"
    }
  ],
  "processingDetails": [...],
  "timestamp": "2025-09-25T10:59:00.123Z"
}
```

### Get Cars Response
```json
{
  "success": true,
  "message": "Retrieved 10 cars",
  "totalCars": 10,
  "totalInDatabase": 25,
  "last24Hours": 5,
  "pagination": {
    "limit": 10,
    "offset": 0,
    "totalPages": 3,
    "currentPage": 1
  },
  "cars": [...],
  "timestamp": "2025-09-25T11:00:00.123Z"
}
```

## Support

For issues or questions about the API, refer to the main project documentation or create an issue in the repository.

**Developer**: Eng. Bashar Zabadani  
**Email**: basharagb@gmail.com  
**Company**: iDEALCHiP Technology Co
