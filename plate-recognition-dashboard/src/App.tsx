import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CarRecognitionDashboard from './components/CarRecognitionDashboard';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <CarRecognitionDashboard />
      </div>
    </QueryClientProvider>
  );
}

export default App;
