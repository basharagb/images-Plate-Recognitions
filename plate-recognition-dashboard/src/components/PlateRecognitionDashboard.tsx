import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Tesseract from 'tesseract.js';
import './PlateRecognitionDashboard.css';

interface RecognitionResult {
  id: string;
  fileName: string;
  plateNumber: string;
  confidence: number;
  timestamp: Date;
  imageUrl: string;
}

const PlateRecognitionDashboard: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<RecognitionResult[]>([]);
  const [progress, setProgress] = useState(0);

  const processImage = async (file: File): Promise<RecognitionResult> => {
    const imageUrl = URL.createObjectURL(file);
    
    return new Promise((resolve, reject) => {
      Tesseract.recognize(
        file,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          }
        }
      ).then(({ data: { text, confidence } }) => {
        // Extract license plate pattern (adjust regex based on your country's format)
        const plateRegex = /[A-Z0-9]{2,8}/g;
        const matches = text.match(plateRegex);
        const plateNumber = matches ? matches[0] : text.replace(/\s+/g, '').toUpperCase();
        
        const result: RecognitionResult = {
          id: Date.now().toString(),
          fileName: file.name,
          plateNumber: plateNumber || 'No plate detected',
          confidence: Math.round(confidence),
          timestamp: new Date(),
          imageUrl
        };
        
        resolve(result);
      }).catch(reject);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      for (const file of acceptedFiles) {
        const result = await processImage(file);
        setResults(prev => [result, ...prev]);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.bmp', '.gif']
    },
    multiple: true
  });

  const clearResults = () => {
    setResults([]);
  };

  const deleteResult = (id: string) => {
    setResults(prev => prev.filter(result => result.id !== id));
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🚗 License Plate Recognition System</h1>
        <p>Industrial Area Traffic Monitoring - Potash Company</p>
      </header>

      <div className="upload-section">
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          {isProcessing ? (
            <div className="processing">
              <div className="spinner"></div>
              <p>Processing image... {progress}%</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          ) : (
            <div className="upload-content">
              <div className="upload-icon">📸</div>
              <p>
                {isDragActive
                  ? 'Drop the speeding car images here...'
                  : 'Drag & drop speeding car images here, or click to select'}
              </p>
              <button className="upload-button">Select Images</button>
            </div>
          )}
        </div>
      </div>

      <div className="results-section">
        <div className="results-header">
          <h2>Recognition Results ({results.length})</h2>
          {results.length > 0 && (
            <button onClick={clearResults} className="clear-button">
              Clear All
            </button>
          )}
        </div>

        <div className="results-grid">
          {results.map((result) => (
            <div key={result.id} className="result-card">
              <div className="result-image">
                <img src={result.imageUrl} alt={result.fileName} />
              </div>
              <div className="result-info">
                <div className="plate-number">
                  <strong>License Plate: {result.plateNumber}</strong>
                </div>
                <div className="result-details">
                  <p>File: {result.fileName}</p>
                  <p>Confidence: {result.confidence}%</p>
                  <p>Time: {result.timestamp.toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => deleteResult(result.id)}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {results.length === 0 && (
          <div className="no-results">
            <p>No violations processed yet. Upload images from speed cameras to begin.</p>
          </div>
        )}
      </div>

      <footer className="dashboard-footer">
        <p>Traffic Monitoring System - 12 Speed Cameras Active</p>
      </footer>
    </div>
  );
};

export default PlateRecognitionDashboard;
