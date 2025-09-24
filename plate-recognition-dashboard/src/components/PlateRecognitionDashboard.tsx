import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Tesseract from 'tesseract.js';
import aiLicensePlateService from '../services/aiLicensePlateService';
import AIConfigModal from './AIConfigModal';
import './PlateRecognitionDashboard.css';

interface RecognitionResult {
  id: string;
  fileName: string;
  plateNumber: string;
  confidence: number;
  timestamp: Date;
  imageUrl: string;
  processingMethod: 'AI' | 'OCR';
  vehicleInfo?: {
    type: string;
    color: string;
    make?: string;
  };
}

const PlateRecognitionDashboard: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<RecognitionResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [useAI, setUseAI] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [processingMethod, setProcessingMethod] = useState<'AI' | 'OCR'>('OCR');

  useEffect(() => {
    // Check if AI is configured on component mount
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      aiLicensePlateService.setApiKey(savedApiKey);
      setUseAI(true);
      setProcessingMethod('AI');
    }
  }, []);

  const processImage = useCallback(async (file: File): Promise<RecognitionResult> => {
    const imageUrl = URL.createObjectURL(file);
    
    // Try AI processing first if available
    if (useAI && aiLicensePlateService.isConfigured()) {
      try {
        setProgress(25);
        const aiResult = await aiLicensePlateService.analyzeLicensePlate(file);
        setProgress(100);
        
        const result: RecognitionResult = {
          id: Date.now().toString(),
          fileName: file.name,
          plateNumber: aiResult.plateNumber,
          confidence: aiResult.confidence,
          timestamp: new Date(),
          imageUrl,
          processingMethod: 'AI',
          vehicleInfo: aiResult.vehicleInfo
        };
        
        console.log('AI Recognition Result:', result);
        return result;
      } catch (error) {
        console.warn('AI processing failed, falling back to OCR:', error);
        // Fall back to OCR if AI fails
      }
    }
    
    // OCR processing (fallback or primary method)
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
        console.log('Raw OCR text:', text);
        
        // Clean and preprocess the text
        let cleanText = text
          .replace(/[^\w\s-]/g, '') // Remove special characters except dash
          .replace(/\s+/g, '') // Remove all spaces
          .toUpperCase()
          .trim();
        
        console.log('Cleaned text:', cleanText);
        
        // Enhanced regex patterns for different license plate formats
        const platePatterns = [
          /\b\d{2}-\d{5}\b/g,           // XX-XXXXX format (like 21-83168)
          /\b\d{2}-\d{4}\b/g,            // XX-XXXX format
          /\b\d{3}-\d{4}\b/g,            // XXX-XXXX format
          /\b[A-Z]{2}-\d{4}\b/g,         // LL-XXXX format
          /\b[A-Z]{3}-\d{3}\b/g,         // LLL-XXX format
          /\b\d{2}[A-Z]\d{4}\b/g,        // XXL XXXX format
          /\b[A-Z0-9]{5,8}\b/g           // General alphanumeric 5-8 chars
        ];
        
        let plateNumber = '';
        let bestMatch = '';
        
        // Try each pattern to find the best match
        for (const pattern of platePatterns) {
          const matches = cleanText.match(pattern);
          if (matches && matches.length > 0) {
            // Take the longest match as it's likely the most complete
            const longestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
            if (longestMatch.length > bestMatch.length) {
              bestMatch = longestMatch;
            }
          }
        }
        
        // If no pattern matches, try to extract the most likely plate number
        if (!bestMatch) {
          // Look for sequences of numbers and letters
          const sequences = cleanText.match(/[A-Z0-9]{4,}/g);
          if (sequences) {
            bestMatch = sequences[0];
          } else {
            bestMatch = cleanText || 'No plate detected';
          }
        }
        
        plateNumber = bestMatch;
        
        // Additional validation - if we got a very short result, try alternative approach
        if (plateNumber.length < 4 && text.length > 0) {
          // Try to find number sequences in the original text
          const numberSequences = text.match(/\d{2,}/g);
          
          if (numberSequences && numberSequences.length > 0) {
            plateNumber = numberSequences.join('-').toUpperCase();
          }
        }
        
        console.log('Final plate number:', plateNumber);
        
        const result: RecognitionResult = {
          id: Date.now().toString(),
          fileName: file.name,
          plateNumber: plateNumber || 'No plate detected',
          confidence: Math.round(confidence),
          timestamp: new Date(),
          imageUrl,
          processingMethod: 'OCR'
        };
        
        resolve(result);
      }).catch(reject);
    });
  }, [useAI]);

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
  }, [processImage]);

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

  const handleAIConfigSave = (apiKey: string) => {
    localStorage.setItem('openai_api_key', apiKey);
    aiLicensePlateService.setApiKey(apiKey);
    setUseAI(true);
    setProcessingMethod('AI');
  };

  const toggleProcessingMethod = () => {
    if (useAI && aiLicensePlateService.isConfigured()) {
      setProcessingMethod(prev => prev === 'AI' ? 'OCR' : 'AI');
    } else {
      setShowAIConfig(true);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="company-logo">
          <img src="/idealchip-logo.png" alt="iDEALCHiP Technology Co" className="logo" />
        </div>
        <h1>🚗 License Plate Recognition System</h1>
        <p>Industrial Area Traffic Monitoring - Potash Company</p>
        <div className="designer-credit">
          <p>Designed by <strong>Eng. Bashar Zabadani</strong> | iDEALCHiP Technology Co</p>
        </div>
        <div className="ai-controls">
          <div className="processing-method">
            <span>Processing Method: </span>
            <button 
              className={`method-toggle ${processingMethod === 'AI' ? 'ai-active' : 'ocr-active'}`}
              onClick={toggleProcessingMethod}
            >
              {processingMethod === 'AI' ? '🤖 AI-Powered' : '📝 OCR'}
            </button>
            {!useAI && (
              <button 
                className="config-ai-button"
                onClick={() => setShowAIConfig(true)}
              >
                ⚙️ Setup AI
              </button>
            )}
          </div>
        </div>
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
                  <span className={`processing-badge ${result.processingMethod.toLowerCase()}`}>
                    {result.processingMethod === 'AI' ? '🤖 AI' : '📝 OCR'}
                  </span>
                </div>
                <div className="result-details">
                  <p>File: {result.fileName}</p>
                  <p>Confidence: {result.confidence}%</p>
                  <p>Time: {result.timestamp.toLocaleString()}</p>
                  {result.vehicleInfo && (
                    <div className="vehicle-info">
                      <p>Vehicle: {result.vehicleInfo.type} ({result.vehicleInfo.color})</p>
                      {result.vehicleInfo.make && <p>Make: {result.vehicleInfo.make}</p>}
                    </div>
                  )}
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

      <AIConfigModal
        isOpen={showAIConfig}
        onClose={() => setShowAIConfig(false)}
        onSave={handleAIConfigSave}
        currentApiKey={localStorage.getItem('openai_api_key') || ''}
      />
    </div>
  );
};

export default PlateRecognitionDashboard;
