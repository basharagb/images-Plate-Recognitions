# Car Plate Recognition API - Postman Collection

This folder contains the complete Postman collection for testing the Car Plate Recognition API.

## Files

- `Car_Plate_Recognition_API.postman_collection.json` - Main API collection
- `Car_Plate_Recognition_Environment.postman_environment.json` - Environment variables
- `README.md` - This documentation file

## Setup Instructions

### 1. Import Collection
1. Open Postman
2. Click "Import" button
3. Select `Car_Plate_Recognition_API.postman_collection.json`
4. The collection will be imported with all endpoints

### 2. Import Environment
1. In Postman, go to "Environments" tab
2. Click "Import" 
3. Select `Car_Plate_Recognition_Environment.postman_environment.json`
4. Set this environment as active

### 3. Configure Environment Variables
Make sure these variables are set in your environment:
- `baseUrl`: `http://localhost:3001/api` (default)
- `carId`: Will be auto-set after uploading images

## API Endpoints

### 1. Health Check
- **Method**: GET
- **URL**: `{{baseUrl}}/health`
- **Description**: Check if API is running and ChatGPT is configured
- **Response**: System status and configuration info

### 2. Upload and Recognize Cars
- **Method**: POST
- **URL**: `{{baseUrl}}/recognize`
- **Body**: Form-data with `images` field (file upload)
- **Description**: Upload car images and get ChatGPT recognition results
- **Response**: Detected cars with plate numbers, colors, and types

### 3. Get All Cars
- **Method**: GET
- **URL**: `{{baseUrl}}/cars`
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
  - `plateNumber`: Filter by plate number (partial match)
  - `color`: Filter by car color
  - `type`: Filter by car type
  - `startDate`: Filter from date (ISO format)
  - `endDate`: Filter to date (ISO format)
  - `sortBy`: Sort field (timestamp, plateNumber, color, type)
  - `sortOrder`: Sort order (ASC or DESC)
- **Description**: Get paginated list of all recognized cars
- **Response**: Array of cars with pagination info

### 4. Get Single Car
- **Method**: GET
- **URL**: `{{baseUrl}}/cars/{{carId}}`
- **Description**: Get details of a specific car by ID
- **Response**: Complete car information

### 5. Get Statistics
- **Method**: GET
- **URL**: `{{baseUrl}}/cars/statistics`
- **Description**: Get comprehensive statistics about recognized cars
- **Response**: Total counts, distribution by type/color, recent activity

### 6. Delete Car
- **Method**: DELETE
- **URL**: `{{baseUrl}}/cars/{{carId}}`
- **Description**: Delete a car record and its associated image
- **Response**: Confirmation of deletion

## Example Usage Workflow

### 1. Check API Health
```
GET {{baseUrl}}/health
```
Expected response: `{"success": true, "chatgpt": "configured"}`

### 2. Upload Car Images
```
POST {{baseUrl}}/recognize
Body: form-data
Key: images
Value: [Select car image files]
```

### 3. View Results
```
GET {{baseUrl}}/cars?limit=5&sortBy=timestamp&sortOrder=DESC
```

### 4. Get Statistics
```
GET {{baseUrl}}/cars/statistics
```

## Testing with Sample Images

For testing, use car images that clearly show license plates. The API works best with:
- High-resolution images (at least 800x600)
- Clear, unobstructed license plates
- Good lighting conditions
- Supported formats: JPG, PNG, WebP

## Error Handling

The API returns standard HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (car ID doesn't exist)
- `500`: Internal Server Error

All error responses include:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error info"
}
```

## Environment Variables

The collection uses these environment variables:
- `{{baseUrl}}`: API base URL (http://localhost:3001/api)
- `{{carId}}`: Car ID for single car operations (auto-set from responses)

## ChatGPT Integration

The API uses OpenAI's ChatGPT Vision API (gpt-4o-mini model) for:
- License plate recognition (letters and numbers)
- Car color identification
- Vehicle type classification
- Multi-vehicle detection per image

Make sure your OpenAI API key is configured in the backend `.env` file:
```
OPENAI_API_KEY=your_api_key_here
```

## Support

For issues or questions:
- **Developer**: Eng. Bashar Zabadani
- **Email**: basharagb@gmail.com
- **Company**: iDEALCHiP Technology Co
