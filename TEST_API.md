# API Testing Guide

## Backend Server Status
✅ Server running on: http://localhost:3001
✅ Database connected: MySQL (imagesPlateRecognitions)
✅ ChatGPT API configured with your key

## API Endpoints

### 1. Health Check
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "License Plate Recognition API is running",
  "timestamp": "2024-09-24T11:39:56.000Z",
  "version": "1.0.0",
  "chatgpt": "configured"
}
```

### 2. Recognize License Plate (Single Image)
```bash
curl -X POST http://localhost:3001/api/recognize \
  -F "image=@/path/to/your/car-image.jpg"
```

Expected response (success):
```json
{
  "success": true,
  "message": "License plate extracted successfully",
  "data": {
    "id": 1,
    "plateNumber": "ABC123",
    "imageUrl": "/uploads/filename.jpg",
    "timestamp": "2024-09-24T11:40:00.000Z",
    "confirmed": false
  }
}
```

### 3. Get All Violations
```bash
curl http://localhost:3001/api/violations
```

### 4. Get Single Violation
```bash
curl http://localhost:3001/api/violations/1
```

### 5. Confirm Violation
```bash
curl -X PUT http://localhost:3001/api/violations/1/confirm
```

## Testing with Frontend
Once the React frontend is ready, you can test the complete flow:

1. Upload car image through the web interface
2. Image gets sent to ChatGPT Vision API
3. License plate number is extracted
4. Result is saved to MySQL database
5. View results in the violations table
6. Confirm violations as needed

## Database Schema
The `violations` table structure:
```sql
CREATE TABLE violations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plate_number VARCHAR(20) NOT NULL,
  image_url TEXT NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

## Next Steps
1. ✅ Backend API is ready and running
2. 🔄 Create React frontend with modern UI
3. 🔄 Integrate frontend with backend API
4. 🔄 Test complete system with real car images
