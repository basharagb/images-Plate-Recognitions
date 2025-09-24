# License Plate Recognition Dashboard

A React-based dashboard system for license plate recognition of speeding cars in industrial areas. This system is designed for traffic monitoring in the Potash Company's industrial area with 12 speed cameras equipped with radars.

## Features

- 🚗 **Image Upload**: Drag & drop or click to upload speeding car images
- 🔍 **OCR Recognition**: Automatic license plate text extraction using Tesseract.js
- 📊 **Results Dashboard**: View all processed violations with confidence scores
- 🎨 **Modern UI**: Professional, responsive design suitable for industrial use
- 📱 **Mobile Friendly**: Works on desktop, tablet, and mobile devices
- 🗑️ **Result Management**: Delete individual results or clear all at once

## Technology Stack

- **React 18** with TypeScript
- **Tesseract.js** for OCR (Optical Character Recognition)
- **React Dropzone** for file upload handling
- **CSS3** with modern styling and animations

## Installation

1. Clone the repository
2. Navigate to the project directory:
   ```bash
   cd plate-recognition-dashboard
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Development Mode
```bash
npm start
```
Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Production Build
```bash
npm run build
```
Builds the app for production to the `build` folder.

### Testing
```bash
npm test
```
Launches the test runner in interactive watch mode.

## How to Use

1. **Upload Images**: 
   - Drag and drop car images from your speed cameras
   - Or click the upload area to select files
   - Supports multiple image formats (JPEG, PNG, BMP, GIF)

2. **View Results**:
   - License plate numbers are automatically extracted
   - View confidence scores for each recognition
   - See timestamp and original filename
   - Preview the uploaded images

3. **Manage Results**:
   - Delete individual results
   - Clear all results at once
   - Results are stored in browser session

## Camera Integration

This system is designed to work with images from 12 speed cameras with integrated radars. Simply upload the captured images of violating vehicles, and the system will extract the license plate information.

## License Plate Format

The OCR system is optimized for standard license plate formats. You may need to adjust the regex pattern in `PlateRecognitionDashboard.tsx` based on your country's license plate format:

```typescript
const plateRegex = /[A-Z0-9]{2,8}/g;
```

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For technical support or feature requests, please contact the development team.
