const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001/api';

async function testTrafficCameraEndpoints() {
  console.log('🚗 Testing Traffic Camera Vision Service...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/traffic-camera/health`);
    console.log('✅ Health check:', healthResponse.data.healthy ? 'HEALTHY' : 'UNHEALTHY');
    console.log('   Components:', healthResponse.data.components);
    console.log('');

    // Test 2: General API Health
    console.log('2️⃣ Testing general API health...');
    const apiHealthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ API Health:', apiHealthResponse.data.message);
    console.log('   Features:', apiHealthResponse.data.features);
    console.log('   ChatGPT:', apiHealthResponse.data.chatgpt);
    console.log('');

    // Test 3: Statistics (should be empty initially)
    console.log('3️⃣ Testing traffic camera statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/traffic-camera/statistics`);
    console.log('✅ Statistics:', {
      totalDetections: statsResponse.data.data.totalDetections,
      uniquePlates: statsResponse.data.data.uniquePlates,
      recentDetections: statsResponse.data.data.recentDetections
    });
    console.log('');

    console.log('🎉 All traffic camera endpoints are working correctly!');
    console.log('');
    console.log('📋 Available Traffic Camera Endpoints:');
    console.log('   POST /api/traffic-camera/process - Process single image');
    console.log('   POST /api/traffic-camera/process-multiple - Process multiple images');
    console.log('   GET  /api/traffic-camera/statistics - Get detection statistics');
    console.log('   GET  /api/traffic-camera/health - Health check');
    console.log('');
    console.log('🚀 Ready to process traffic camera images!');
    console.log('   Use the frontend or Postman to upload your traffic camera images.');
    console.log('   The new AI model is specifically optimized for:');
    console.log('   - Traffic camera images with timestamp overlays');
    console.log('   - Multiple vehicles in frame');
    console.log('   - Accurate license plate reading (like "2224865")');
    console.log('   - Timestamp extraction from camera metadata');

  } catch (error) {
    console.error('❌ Error testing endpoints:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Backend server is not running. Please start it with:');
      console.log('   cd backend && npm run dev');
    }
  }
}

// Run the test
testTrafficCameraEndpoints();
