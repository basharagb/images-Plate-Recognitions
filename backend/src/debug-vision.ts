import EnhancedVisionService from './services/enhancedVisionService';
import fs from 'fs';
import path from 'path';

async function debugVision() {
  console.log('🔍 Starting Vision API Debug...');
  
  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    return;
  }
  
  console.log('✅ OpenAI API Key configured');
  
  const visionService = new EnhancedVisionService();
  
  // Create a test image (you'll need to replace this with an actual image path)
  const testImagePath = path.join(__dirname, '../test-images/test-car.jpg');
  
  // Check if test image exists
  if (!fs.existsSync(testImagePath)) {
    console.log('⚠️  Test image not found at:', testImagePath);
    console.log('📝 To test with a real image:');
    console.log('   1. Create a "test-images" folder in the backend directory');
    console.log('   2. Add your car image as "test-car.jpg"');
    console.log('   3. Run this script again');
    return;
  }
  
  try {
    console.log('🚗 Processing test image...');
    const result = await visionService.detectCars(testImagePath);
    
    console.log('📊 Vision API Result:');
    console.log('Success:', result.success);
    console.log('Cars detected:', result.totalDetected);
    console.log('Raw response:', result.rawResponse);
    
    if (result.cars.length > 0) {
      console.log('\n🎯 Detected Cars:');
      result.cars.forEach((car, index) => {
        console.log(`Car ${index + 1}:`);
        console.log(`  - ID: ${car.id}`);
        console.log(`  - Plate: ${car.plateNumber}`);
        console.log(`  - Color: ${car.color}`);
        console.log(`  - Type: ${car.type}`);
        console.log(`  - Confidence: ${car.confidence}%`);
      });
    } else {
      console.log('❌ No cars detected');
    }
    
    if (result.error) {
      console.error('🚨 Error:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

// Run the debug
debugVision().then(() => {
  console.log('🏁 Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
