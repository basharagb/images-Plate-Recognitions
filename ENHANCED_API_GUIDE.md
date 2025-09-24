# Enhanced Car Plate Recognition API Guide

## 🚀 **Production-Ready Fullstack Application**

### **System Overview**
- **Backend**: Node.js + Express + TypeScript + MySQL
- **AI Engine**: OpenAI ChatGPT Vision API
- **Features**: Multi-vehicle detection, Enhanced car details, Structured JSON responses
- **Database**: MySQL with Cars table

---

## 📊 **API Endpoints**

### **1. Health Check**
```bash
GET http://localhost:3001/api/health
```

**Response:**
```json
{
  "success": true,
  "message": "Car Plate Recognition API is running",
  "timestamp": "2024-09-24T11:45:12.000Z",
  "version": "2.0.0",
  "features": ["Multi-vehicle detection", "Enhanced car details", "ChatGPT Vision API"],
  "chatgpt": "configured"
}
```

---

### **2. Recognize Cars (Multi-Vehicle Detection)**
```bash
POST http://localhost:3001/api/recognize
Content-Type: multipart/form-data
```

**Request:**
- Upload one or more car images using `images` field
- Supports up to 10 images per request

**ChatGPT Prompt Used:**
```
"Detect all vehicles in this image. For each vehicle, return:
- Plate number (digits only, no letters or spaces)
- Car color
- Car type (truck, bus, sedan, SUV, etc)
- Unique ID for the detection

Return result as structured JSON."
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 2 images, detected 3 cars",
  "cars": [
    {
      "id": 1,
      "plateNumber": "123456",
      "color": "red",
      "type": "sedan",
      "imageUrl": "/uploads/car1_1234567890_abc123.jpg",
      "timestamp": "2024-09-24T11:45:12.000Z",
      "detectionId": "unique_id_1"
    },
    {
      "id": 2,
      "plateNumber": "789012",
      "color": "blue",
      "type": "suv",
      "imageUrl": "/uploads/car2_1234567890_def456.jpg",
      "timestamp": "2024-09-24T11:45:13.000Z",
      "detectionId": "unique_id_2"
    }
  ],
  "summary": {
    "totalImages": 2,
    "successfulImages": 2,
    "failedImages": 0,
    "totalCarsDetected": 3
  },
  "details": [
    {
      "filename": "traffic_photo1.jpg",
      "success": true,
      "carsDetected": 2,
      "cars": [...]
    },
    {
      "filename": "traffic_photo2.jpg", 
      "success": true,
      "carsDetected": 1,
      "cars": [...]
    }
  ]
}
```

---

### **3. Get All Cars**
```bash
GET http://localhost:3001/api/cars
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `plateNumber` - Filter by plate number
- `color` - Filter by car color
- `type` - Filter by car type
- `startDate` - Filter from date
- `endDate` - Filter to date
- `sortBy` - Sort field (default: timestamp)
- `sortOrder` - ASC or DESC (default: DESC)

**Example:**
```bash
GET http://localhost:3001/api/cars?color=red&type=sedan&page=1&limit=5
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "plateNumber": "123456",
      "color": "red",
      "type": "sedan",
      "imageUrl": "/uploads/car1.jpg",
      "detectionId": "unique_id_1",
      "timestamp": "2024-09-24T11:45:12.000Z",
      "createdAt": "2024-09-24T11:45:12.000Z",
      "updatedAt": "2024-09-24T11:45:12.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 5
  }
}
```

---

### **4. Get Single Car**
```bash
GET http://localhost:3001/api/cars/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "plateNumber": "123456",
    "color": "red",
    "type": "sedan",
    "imageUrl": "/uploads/car1.jpg",
    "detectionId": "unique_id_1",
    "timestamp": "2024-09-24T11:45:12.000Z",
    "createdAt": "2024-09-24T11:45:12.000Z",
    "updatedAt": "2024-09-24T11:45:12.000Z"
  }
}
```

---

### **5. Get Statistics**
```bash
GET http://localhost:3001/api/cars/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "recent24h": 25,
    "byType": [
      {"type": "sedan", "count": 60},
      {"type": "suv", "count": 45},
      {"type": "truck", "count": 30},
      {"type": "bus", "count": 15}
    ],
    "byColor": [
      {"color": "white", "count": 40},
      {"color": "black", "count": 35},
      {"color": "red", "count": 25},
      {"color": "blue", "count": 20}
    ]
  }
}
```

---

### **6. Delete Car**
```bash
DELETE http://localhost:3001/api/cars/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Car deleted successfully"
}
```

---

## 🗄️ **Database Schema**

```sql
CREATE TABLE cars (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plate_number VARCHAR(20) NOT NULL,
  color VARCHAR(20) NOT NULL,
  type VARCHAR(20) NOT NULL,
  image_url TEXT NOT NULL,
  detection_id VARCHAR(50) NOT NULL UNIQUE,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  
  INDEX idx_plate_number (plate_number),
  INDEX idx_color (color),
  INDEX idx_type (type),
  INDEX idx_timestamp (timestamp),
  UNIQUE INDEX idx_detection_id (detection_id)
);
```

---

## 🧪 **Testing Examples**

### **Test with cURL:**

1. **Upload single image:**
```bash
curl -X POST http://localhost:3001/api/recognize \
  -F "images=@/path/to/car-image.jpg"
```

2. **Upload multiple images:**
```bash
curl -X POST http://localhost:3001/api/recognize \
  -F "images=@/path/to/car1.jpg" \
  -F "images=@/path/to/car2.jpg" \
  -F "images=@/path/to/car3.jpg"
```

3. **Get all cars:**
```bash
curl http://localhost:3001/api/cars
```

4. **Get cars with filters:**
```bash
curl "http://localhost:3001/api/cars?color=red&type=sedan&limit=5"
```

---

## 🎯 **Key Features**

### **Enhanced AI Detection:**
- **Multi-Vehicle Support**: Detects multiple cars in single image
- **Detailed Information**: Plate number, color, type for each vehicle
- **Structured JSON**: Consistent, parseable responses
- **Unique IDs**: Each detection gets a unique identifier

### **Smart Processing:**
- **Digits-Only Plates**: Extracts only numeric plate numbers
- **Color Recognition**: Identifies car colors accurately
- **Vehicle Classification**: Categorizes vehicle types
- **Error Handling**: Robust fallback mechanisms

### **Production Features:**
- **Batch Processing**: Handle multiple images efficiently
- **Database Storage**: Persistent storage with indexing
- **Filtering & Pagination**: Advanced query capabilities
- **Statistics**: Real-time analytics and reporting
- **File Management**: Automatic cleanup and organization

---

## 🚀 **Next Steps**

1. ✅ **Backend Complete**: Multi-vehicle detection API ready
2. 🔄 **Frontend Development**: Create React dashboard
3. 🔄 **Integration Testing**: Test with real traffic images
4. 🔄 **Production Deployment**: Configure for production use

The enhanced system is now ready for testing with real car images! The ChatGPT Vision API will analyze each image and return detailed information about all detected vehicles.
