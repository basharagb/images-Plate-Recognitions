import React, { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import carApiService, { Car, RecognitionResult } from '../services/carApiService';

interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

const CarRecognitionDashboard: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Queries
  const { data: carsData, isLoading: carsLoading, refetch: refetchCars } = useQuery({
    queryKey: ['cars'],
    queryFn: () => carApiService.getCars({ limit: 50, sortBy: 'timestamp', sortOrder: 'DESC' }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => carApiService.getStatistics(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: () => carApiService.checkHealth(),
  });

  // Mutations
  const recognizeMutation = useMutation({
    mutationFn: (files: File[]) => carApiService.recognizeCars(files),
    onSuccess: (data: RecognitionResult) => {
      console.log('Recognition result:', data);
      // Refresh database queries to get updated data
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      setUploadedFiles([]);
      setIsUploading(false);
    },
    onError: (error) => {
      console.error('Recognition error:', error);
      setIsUploading(false);
    },
    onSettled: () => {
      // Ensure isUploading is always reset
      setTimeout(() => setIsUploading(false), 100);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => carApiService.deleteCar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      setSelectedCar(null);
      setShowDetails(false);
    },
  });

  // File handling
  const handleFileSelect = useCallback((files: FileList) => {
    const newFiles: UploadedFile[] = [];
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        newFiles.push({
          file,
          preview,
          id: Math.random().toString(36).substring(7),
        });
      }
    });
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      // Revoke object URL to prevent memory leaks
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
  }, []);

  const handleRecognize = useCallback(async () => {
    if (uploadedFiles.length === 0) return;
    
    console.log('Starting recognition with files:', uploadedFiles.length);
    setIsUploading(true);
    const files = uploadedFiles.map(f => f.file);
    console.log('Files to process:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    recognizeMutation.mutate(files);
  }, [uploadedFiles, recognizeMutation]);

  const handleCarClick = useCallback((car: Car) => {
    setSelectedCar(car);
    setShowDetails(true);
  }, []);

  const handleDeleteCar = useCallback((id: number) => {
    if (window.confirm('Are you sure you want to delete this car record?')) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  // Cleanup object URLs on unmount
  React.useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        URL.revokeObjectURL(file.preview);
      });
    };
  }, [uploadedFiles]);

  // Combine database cars with recent recognition results
  const databaseCars = carsData?.data || [];
  const recognitionCars = recognizeMutation.data?.cars || [];
  const cars = recognitionCars.length > 0 ? recognitionCars : databaseCars;
  
  const stats = statsData?.data;
  const health = healthData;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4">
                <img 
                  src="/logo.svg" 
                  alt="iDEALCHiP Logo" 
                  className="h-12 w-auto"
                />
                <div>
                  <h1 className="text-2xl font-bold text-primary-800">Car Plate Recognition</h1>
                  <p className="text-sm text-primary-600">Powered by AI Vision Technology • iDEALCHiP Technology Co</p>
                </div>
              </div>
            </div>
            
            {health && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-secondary-600 rounded-full"></div>
                  <span className="text-sm text-primary-600">
                    AI Vision • {health.chatgpt === 'configured' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Cars</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🚗</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Today</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
                  </div>
                  <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📅</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Last 24h</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.recent24h}</p>
                  </div>
                  <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">⏰</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">AI Model</p>
                    <p className="text-lg font-semibold text-primary-600">{stats.aiModel}</p>
                  </div>
                  <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🤖</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Upload Car Images</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Upload images to detect cars and extract license plates
                </p>
              </div>
              
              <div className="card-body">
                {/* Upload Area */}
                <div
                  className="upload-area"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl">📸</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Drop images here or click to select
                    </h3>
                    <p className="text-sm text-gray-600 text-center">
                      Supports JPG, PNG, WebP up to 10MB each
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                />

                {/* Uploaded Files Preview */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Selected Images ({uploadedFiles.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="relative group">
                          <img
                            src={file.preview}
                            alt={file.file.name}
                            className="w-full h-20 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(file.id);
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-error-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                            {file.file.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recognize Button */}
                <div className="mt-6">
                  <button
                    onClick={handleRecognize}
                    disabled={uploadedFiles.length === 0 || isUploading}
                    className="btn-primary w-full"
                  >
                    {isUploading ? (
                      <div className="flex items-center justify-center">
                        <div className="spinner w-4 h-4 mr-2"></div>
                        Processing with AI Vision...
                      </div>
                    ) : (
                      `Recognize Cars (${uploadedFiles.length})`
                    )}
                  </button>
                </div>

                {/* Recognition Results */}
                {recognizeMutation.data && (
                  <div className="mt-6 space-y-4">
                    <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                      <h3 className="text-lg font-semibold text-success-800 mb-2">Recognition Complete!</h3>
                      <p className="text-success-700">
                        Detected {recognizeMutation.data.summary.totalCarsDetected} cars from {recognizeMutation.data.summary.totalImages} images
                      </p>
                    </div>
                    
                    {/* Demo Mode Warning */}
                    {recognizeMutation.data.details?.some((detail: any) => detail.cars?.some((car: any) => car.id?.includes('demo'))) && (
                      <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-5 h-5 text-warning-600 mr-2">⚠️</div>
                          <div>
                            <h4 className="text-sm font-semibold text-warning-800">Demo Mode Active</h4>
                            <p className="text-sm text-warning-700 mt-1">
                              وضع التجريب: يُظهر أقرب 1-2 مركبة بلوحات واضحة. أضف رصيد OpenAI للتعرف الحقيقي.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cars Table */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Recognized Cars</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Click on any row to view details
                    </p>
                  </div>
                  <button
                    onClick={() => refetchCars()}
                    className="btn-outline"
                    disabled={carsLoading}
                  >
                    {carsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Plate Number</th>
                      <th>Color</th>
                      <th>Type</th>
                      <th>Timestamp</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cars.map((car) => (
                      <tr
                        key={car.id}
                        onClick={() => handleCarClick(car)}
                        className="cursor-pointer"
                      >
                        <td>
                          <img
                            src={carApiService.getImageUrl(car.imageUrl)}
                            alt={`Car ${car.plateNumber}`}
                            className="w-16 h-12 object-cover rounded-lg border border-gray-200"
                          />
                        </td>
                        <td>
                          <span className="font-mono font-semibold text-primary-600">
                            {carApiService.formatPlateNumber(car.plateNumber)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${carApiService.getColorBadgeClass(car.color)}`}>
                            {carApiService.capitalize(car.color)}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center space-x-2">
                            <span>{carApiService.getVehicleTypeIcon(car.type)}</span>
                            <span>{carApiService.capitalize(car.type)}</span>
                          </div>
                        </td>
                        <td className="text-sm text-gray-600">
                          {carApiService.formatTimestamp(car.timestamp)}
                        </td>
                        <td>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCar(car.id);
                            }}
                            className="text-error-600 hover:text-error-800 text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {cars.length === 0 && !carsLoading && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🚗</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No cars detected yet</h3>
                    <p className="text-gray-600">Upload some car images to get started!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Car Details Modal */}
      {showDetails && selectedCar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Car Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>

            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={`http://localhost:3001${selectedCar.imageUrl}`}
                    alt={`Car ${selectedCar.plateNumber}`}
                    className="w-full h-64 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      console.error('Image failed to load:', selectedCar.imageUrl);
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==';
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Image URL: {selectedCar.imageUrl}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="form-label">Plate Number</label>
                    <div className="text-2xl font-mono font-bold text-primary-600">
                      {carApiService.formatPlateNumber(selectedCar.plateNumber)}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Color</label>
                    <span className={`badge ${carApiService.getColorBadgeClass(selectedCar.color)}`}>
                      {carApiService.capitalize(selectedCar.color)}
                    </span>
                  </div>

                  <div>
                    <label className="form-label">Vehicle Type</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{carApiService.getVehicleTypeIcon(selectedCar.type)}</span>
                      <span className="text-lg">{carApiService.capitalize(selectedCar.type)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Detection Time</label>
                    <div className="text-gray-900">
                      {carApiService.formatTimestamp(selectedCar.timestamp)}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Database ID</label>
                    <div className="text-gray-600 font-mono">#{selectedCar.id}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-footer">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetails(false)}
                  className="btn-outline"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDeleteCar(selectedCar.id)}
                  className="btn-error"
                >
                  Delete Car
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarRecognitionDashboard;
