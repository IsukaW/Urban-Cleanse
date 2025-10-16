import React, { useState, useEffect } from 'react';
import { X, MapPin, Users, Clock } from 'lucide-react';
import { routeAPI } from '../../services/route/api';
import type { BinsByArea, Worker } from '../../services/route/api';

interface RouteCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteCreated: () => void;
  selectedDate: string;
  onNotification?: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const RouteCreationModal: React.FC<RouteCreationModalProps> = ({
  isOpen,
  onClose,
  onRouteCreated,
  selectedDate,
  onNotification
}) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Select Area, 2: Select Bins, 3: Assign Worker
  
  // Data states
  const [areas, setAreas] = useState<BinsByArea[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  
  // Selection states
  const [selectedArea, setSelectedArea] = useState<BinsByArea | null>(null);
  const [selectedBins, setSelectedBins] = useState<string[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [areasResponse, workersResponse] = await Promise.all([
        routeAPI.getBinsByArea(selectedDate),
        routeAPI.getAvailableWorkers(selectedDate)
      ]);
      
      setAreas(areasResponse.data.areas || []);
      setWorkers(workersResponse.data.available || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      onNotification?.('error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAreaSelect = (area: BinsByArea) => {
    setSelectedArea(area);
    setSelectedBins(area.bins.map(bin => bin.binId)); // Select all bins by default
    setStep(2);
  };

  const handleBinToggle = (binId: string) => {
    setSelectedBins(prev => 
      prev.includes(binId)
        ? prev.filter(id => id !== binId)
        : [...prev, binId]
    );
  };

  const handleCreateRoute = async () => {
    if (!selectedArea || selectedBins.length === 0 || !selectedWorker) {
      onNotification?.('warning', 'Please complete all required selections');
      return;
    }

    try {
      setLoading(true);
      await routeAPI.createRoute({
        collectorId: selectedWorker,
        assignedDate: selectedDate,
        area: selectedArea.area,
        selectedBins,
        notes
      });
      
      onNotification?.('success', 'Route created successfully!');
      onRouteCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating route:', error);
      onNotification?.('error', error.message || 'Failed to create route');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setSelectedArea(null);
    setSelectedBins([]);
    setSelectedWorker('');
    setNotes('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const getWorkerTypeLabel = (role: string) => {
    switch (role) {
      case 'wc1': return 'Residential Collector';
      case 'wc2': return 'Commercial Collector';
      case 'wc3': return 'Industrial Collector';
      default: return role;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose}></div>

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Create Collection Route - {new Date(selectedDate).toDateString()}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Step Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((stepNum) => (
                  <div
                    key={stepNum}
                    className={`flex items-center ${stepNum < 3 ? 'flex-1' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step >= stepNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {stepNum}
                    </div>
                    <span className={`ml-2 text-sm ${step >= stepNum ? 'text-gray-900' : 'text-gray-500'}`}>
                      {stepNum === 1 && 'Select Area'}
                      {stepNum === 2 && 'Select Bins'}
                      {stepNum === 3 && 'Assign Worker'}
                    </span>
                    {stepNum < 3 && (
                      <div className={`flex-1 h-px mx-4 ${step > stepNum ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading...</span>
              </div>
            ) : (
              <>
                {/* Step 1: Select Area */}
                {step === 1 && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Select Collection Area</h4>
                    
                    {areas.length === 0 ? (
                      <div className="text-center py-8">
                        <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No areas available</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          No approved collection requests found for {new Date(selectedDate).toDateString()}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {areas.map((area) => (
                          <div
                            key={area.area}
                            onClick={() => handleAreaSelect(area)}
                            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center mb-2">
                              <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                              <h5 className="font-medium text-gray-900">{area.area}</h5>
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>{area.bins.length} bins available</p>
                              <p>{area.totalRequests} collection requests</p>
                              <p className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                ~{area.estimatedDuration} minutes
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Select Bins */}
                {step === 2 && selectedArea && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900">
                        Select Bins in {selectedArea.area}
                      </h4>
                      <button
                        onClick={() => setStep(1)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        ← Back to Areas
                      </button>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        {selectedBins.length} of {selectedArea.bins.length} bins selected
                      </p>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedArea.bins.map((bin) => (
                        <div
                          key={bin.binId}
                          className="flex items-center p-3 border border-gray-200 rounded-lg"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBins.includes(bin.binId)}
                            onChange={() => handleBinToggle(bin.binId)}
                            className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{bin.binId}</span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                bin.fillLevel > 80 ? 'bg-red-100 text-red-800' :
                                bin.fillLevel > 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {bin.fillLevel}% full
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-600 mt-1">{bin.location.address}</p>
                            
                            <div className="text-xs text-gray-500 mt-1">
                              {bin.requests.length} request(s) • Battery: {bin.battery}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex justify-between">
                      <button
                        onClick={() => setStep(1)}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setStep(3)}
                        disabled={selectedBins.length === 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue to Worker Assignment
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Assign Worker */}
                {step === 3 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900">Assign Worker</h4>
                      <button
                        onClick={() => setStep(2)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        ← Back to Bins
                      </button>
                    </div>

                    {/* Route Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                      <h5 className="font-medium text-gray-900 mb-2">Route Summary</h5>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Area:</strong> {selectedArea?.area}</p>
                        <p><strong>Bins:</strong> {selectedBins.length}</p>
                        <p><strong>Estimated Duration:</strong> ~{selectedBins.length * 15} minutes</p>
                        <p><strong>Date:</strong> {new Date(selectedDate).toDateString()}</p>
                      </div>
                    </div>

                    {/* Worker Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Workers
                      </label>
                      
                      {workers.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No workers available</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            All workers are already assigned for this date
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {workers.map((worker) => (
                            <div
                              key={worker._id}
                              onClick={() => setSelectedWorker(worker._id)}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedWorker === worker._id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{worker.name}</p>
                                  <p className="text-sm text-gray-600">{getWorkerTypeLabel(worker.role)}</p>
                                </div>
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    checked={selectedWorker === worker._id}
                                    onChange={() => setSelectedWorker(worker._id)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Add any special instructions or notes for this route..."
                      />
                    </div>

                    <div className="flex justify-between">
                      <button
                        onClick={() => setStep(2)}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleCreateRoute}
                        disabled={!selectedWorker || selectedBins.length === 0 || loading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Creating...' : 'Create Route'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteCreationModal;