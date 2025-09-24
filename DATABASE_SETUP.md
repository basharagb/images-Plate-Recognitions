# Database Setup Guide

## MySQL Database Configuration

### 1. Create Database
Access your MySQL database through phpMyAdmin at: http://localhost/phpmyadmin/index.php

Execute the following SQL command to create the database:

```sql
CREATE DATABASE IF NOT EXISTS imagesPlateRecognitions 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

### 2. Database Schema
The application will automatically create the following table structure when you start the server:

```sql
CREATE TABLE violations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plate_number VARCHAR(20) NOT NULL,
  image_url TEXT NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  processing_method ENUM('AI', 'OCR') NOT NULL DEFAULT 'OCR',
  confidence DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  vehicle_info JSON,
  camera_id VARCHAR(50),
  location VARCHAR(255),
  speed INT,
  speed_limit INT,
  status ENUM('pending', 'confirmed', 'rejected') NOT NULL DEFAULT 'pending',
  confirmed_at DATETIME,
  confirmed_by VARCHAR(100),
  notes TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  
  INDEX idx_plate_number (plate_number),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_camera_id (camera_id)
);
```

### 3. Environment Configuration
Update the `.env` file in the backend directory with your database credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=imagesPlateRecognitions
DB_USER=root
DB_PASSWORD=your_mysql_password
```

### 4. AI API Keys (Optional but Recommended)
For enhanced accuracy, add your AI service API keys:

```env
# OpenAI Vision API (Recommended for best accuracy)
OPENAI_API_KEY=your_openai_api_key_here

# AWS Rekognition (Alternative AI option)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1
```

### 5. Start the Backend Server
```bash
cd backend
npm run dev
```

The server will:
- Connect to MySQL database
- Create tables automatically
- Start listening on port 3001
- Provide API endpoints for the frontend

### 6. API Endpoints
- `POST /api/violations/process` - Upload and process images
- `GET /api/violations` - Get all violations with filtering
- `GET /api/violations/:id` - Get single violation
- `PUT /api/violations/:id` - Update violation status
- `DELETE /api/violations/:id` - Delete violation
- `PATCH /api/violations/bulk-update` - Bulk update violations
- `GET /api/violations/statistics` - Get violation statistics
- `GET /api/health` - Health check

### 7. Testing the Setup
1. Start the backend server
2. Visit http://localhost:3001/api/health
3. You should see a success response indicating the API is running
4. Check the database to confirm the `violations` table was created
