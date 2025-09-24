import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlateRecognitionDashboard from './PlateRecognitionDashboard';

// Mock Tesseract.js
jest.mock('tesseract.js', () => ({
  recognize: jest.fn(() => 
    Promise.resolve({
      data: {
        text: 'ABC123',
        confidence: 85
      }
    })
  )
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

describe('PlateRecognitionDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dashboard header', () => {
    render(<PlateRecognitionDashboard />);
    
    expect(screen.getByText('🚗 License Plate Recognition System')).toBeInTheDocument();
    expect(screen.getByText('Industrial Area Traffic Monitoring - Potash Company')).toBeInTheDocument();
  });

  test('renders upload section', () => {
    render(<PlateRecognitionDashboard />);
    
    expect(screen.getByText(/Drag & drop speeding car images here/)).toBeInTheDocument();
    expect(screen.getByText('Select Images')).toBeInTheDocument();
  });

  test('renders results section', () => {
    render(<PlateRecognitionDashboard />);
    
    expect(screen.getByText('Recognition Results (0)')).toBeInTheDocument();
    expect(screen.getByText('No violations processed yet. Upload images from speed cameras to begin.')).toBeInTheDocument();
  });

  test('renders footer', () => {
    render(<PlateRecognitionDashboard />);
    
    expect(screen.getByText('Traffic Monitoring System - 12 Speed Cameras Active')).toBeInTheDocument();
  });

  test('handles file upload', async () => {
    render(<PlateRecognitionDashboard />);
    
    const file = new File(['test'], 'test-car.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /select images/i }).closest('div')?.querySelector('input[type="file"]');
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
      
      // Wait for processing to complete
      await waitFor(() => {
        expect(screen.getByText('Recognition Results (1)')).toBeInTheDocument();
      }, { timeout: 5000 });
    }
  });

  test('clear all results button appears when results exist', async () => {
    render(<PlateRecognitionDashboard />);
    
    const file = new File(['test'], 'test-car.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /select images/i }).closest('div')?.querySelector('input[type="file"]');
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Clear All')).toBeInTheDocument();
      }, { timeout: 5000 });
    }
  });

  test('delete individual result', async () => {
    render(<PlateRecognitionDashboard />);
    
    const file = new File(['test'], 'test-car.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /select images/i }).closest('div')?.querySelector('input[type="file"]');
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);
        
        expect(screen.getByText('Recognition Results (0)')).toBeInTheDocument();
      }, { timeout: 5000 });
    }
  });
});
