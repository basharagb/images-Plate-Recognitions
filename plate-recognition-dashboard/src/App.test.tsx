import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders license plate recognition dashboard', () => {
  render(<App />);
  const headerElement = screen.getByText(/License Plate Recognition System/i);
  expect(headerElement).toBeInTheDocument();
});
