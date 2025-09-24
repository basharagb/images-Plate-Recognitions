import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Tesseract.js
jest.mock('tesseract.js', () => ({
  recognize: jest.fn(() => 
    Promise.resolve({
      data: {
        text: '21-83168 Vehicle:1646 NonVehicle:0 Person:0',
        confidence: 85
      }
    })
  )
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

describe('License Plate Recognition Dashboard', () => {
  test('renders license plate recognition dashboard', () => {
    render(<App />);
    const headerElement = screen.getByText(/License Plate Recognition System/i);
    expect(headerElement).toBeInTheDocument();
  });

  test('renders upload section', () => {
    render(<App />);
    const uploadText = screen.getByText(/Drag & drop speeding car images here/i);
    expect(uploadText).toBeInTheDocument();
  });

  test('renders company branding', () => {
    render(<App />);
    const companyName = screen.getByText(/iDEALCHiP Technology Co/i);
    const designer = screen.getByText(/Eng. Bashar Zabadani/i);
    expect(companyName).toBeInTheDocument();
    expect(designer).toBeInTheDocument();
  });

  test('renders results section', () => {
    render(<App />);
    const resultsHeader = screen.getByText(/Recognition Results/i);
    expect(resultsHeader).toBeInTheDocument();
  });

  test('renders footer with camera info', () => {
    render(<App />);
    const footer = screen.getByText(/12 Speed Cameras Active/i);
    expect(footer).toBeInTheDocument();
  });

  test('shows no results message initially', () => {
    render(<App />);
    const noResults = screen.getByText(/No violations processed yet/i);
    expect(noResults).toBeInTheDocument();
  });

  test('upload button is present', () => {
    render(<App />);
    const uploadButton = screen.getByText(/Select Images/i);
    expect(uploadButton).toBeInTheDocument();
  });

  test('dropzone is interactive', () => {
    render(<App />);
    const dropzone = screen.getByText(/Drag & drop speeding car images here/i);
    expect(dropzone).toBeInTheDocument();
  });
});
