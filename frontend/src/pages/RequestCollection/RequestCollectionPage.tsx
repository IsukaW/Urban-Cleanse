import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import wasteService from '../../services/waste/api';
import binService from '../../services/bin/api';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  CreditCard,
  Trash2,
  Clock,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Navigation,
  Map,
  MousePointer
} from 'lucide-react';

// Add these imports for the map
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

import type { WasteType, CreateWasteRequestData, WasteRequest } from '../../services/waste/type';

interface FormData {
  collectionType: string;
  binId: string;
  preferredDate: string;
  preferredTimeSlot: string;
  notes: string;
  specialDetails?: {
    itemType: string;
    weight: string;
    description: string;
  };
  address: {
    street: string;
    city: string;
    postalCode: string;
  };
}

const steps = [
  { id: 1, name: 'Collection Type', icon: Trash2 },
  { id: 2, name: 'Schedule', icon: Calendar },
  { id: 3, name: 'Details', icon: MapPin },
  { id: 4, name: 'Payment', icon: CreditCard },
  { id: 5, name: 'Confirmation', icon: CheckCircle }
];

const RequestCollectionPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [isScheduleAvailable, setIsScheduleAvailable] = useState<boolean | null>(null);
  const [createdRequest, setCreatedRequest] = useState<WasteRequest | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  const [locationMethod, setLocationMethod] = useState<'gps' | 'manual' | null>(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([6.9271, 79.8612]); // Default to Colombo
  const [selectedMapLocation, setSelectedMapLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [userBins, setUserBins] = useState<any[]>([]); // Add state for user's bins

  const [formData, setFormData] = useState<FormData>({
    collectionType: '',
    binId: '',
    preferredDate: '',
    preferredTimeSlot: '',
    notes: '',
    address: {
      street: '',
      city: '',
      postalCode: ''
    }
  });

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (formData.collectionType) {
      calculateEstimatedCost();
    }
  }, [formData.collectionType, wasteTypes]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch waste types and user's registered bins in parallel
      const [wasteTypesResponse, userBinsResponse] = await Promise.all([
        wasteService.getWasteTypes(),
        binService.getUserRegisteredBins() // Only fetch user's registered and approved bins
      ]);

      if (wasteTypesResponse.success) {
        setWasteTypes(wasteTypesResponse.data.wasteTypes);
      }

      if (userBinsResponse.success) {
        // All bins returned are already filtered (registered by user + approved by admin)
        setUserBins(userBinsResponse.data.bins);
        
        if (userBinsResponse.data.bins.length === 0) {
          toast.info('You have no approved bins. Please register a bin first to request collection.');
        }
      }
    } catch (error: any) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load page data');
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedCost = () => {
    const selectedType = wasteTypes.find(type => type.type === formData.collectionType);
    if (selectedType) {
      setEstimatedCost(selectedType.baseCost);
    }
  };

  const checkScheduleAvailability = async () => {
    if (!formData.binId || !formData.preferredDate) return;

    setLoading(true);
    try {
      const response = await wasteService.checkSchedule(formData.binId, formData.preferredDate);
      setIsScheduleAvailable(response.data.isAvailable);
      
      if (!response.data.isAvailable) {
        toast.error(response.data.message);
      } else {
        toast.success('Schedule available!');
      }
    } catch (error: any) {
      toast.error('Failed to check schedule availability');
      setIsScheduleAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 2) {
      await checkScheduleAvailability();
      if (isScheduleAvailable === false) return;
    }

    if (currentStep === 3) {
      await submitRequest();
    }

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Get user's current location
  const getCurrentLocation = () => {
    setLocationLoading(true);
    setLocationError('');
    setLocationMethod('gps');

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        
        // Try to get address from coordinates using reverse geocoding
        try {
          const address = await reverseGeocode(latitude, longitude);
          setUserLocation(prev => ({ ...prev!, address }));
          
          // Auto-fill address fields if available
          if (address) {
            const addressParts = address.split(',');
            setFormData(prev => ({
              ...prev,
              address: {
                street: addressParts[0]?.trim() || '',
                city: addressParts[1]?.trim() || '',
                postalCode: prev.address.postalCode || ''
              }
            }));
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
        }
        
        setLocationLoading(false);
        toast.success('Location captured successfully!');
      },
      (error) => {
        setLocationLoading(false);
        let errorMessage = 'Failed to get location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location services or use manual location selection.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please try manual location selection.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try manual location selection.';
            break;
        }
        
        setLocationError(errorMessage);
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Manual location selection
  const selectManualLocation = () => {
    setLocationMethod('manual');
    setShowLocationMap(true);
    setLocationError('');
  };

  // Handle manual location confirmation
  const confirmManualLocation = async () => {
    if (!selectedMapLocation) {
      toast.error('Please select a location on the map');
      return;
    }

    setLocationLoading(true);
    try {
      const address = await reverseGeocode(selectedMapLocation.latitude, selectedMapLocation.longitude);
      setUserLocation({
        latitude: selectedMapLocation.latitude,
        longitude: selectedMapLocation.longitude,
        address
      });

      // Auto-fill address fields if available
      if (address) {
        const addressParts = address.split(',');
        setFormData(prev => ({
          ...prev,
          address: {
            street: addressParts[0]?.trim() || '',
            city: addressParts[1]?.trim() || '',
            postalCode: prev.address.postalCode || ''
          }
        }));
      }

      setShowLocationMap(false);
      setSelectedMapLocation(null);
      toast.success('Manual location selected successfully!');
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      setUserLocation({
        latitude: selectedMapLocation.latitude,
        longitude: selectedMapLocation.longitude,
        address: `${selectedMapLocation.latitude.toFixed(6)}, ${selectedMapLocation.longitude.toFixed(6)}`
      });
      setShowLocationMap(false);
      setSelectedMapLocation(null);
      toast.success('Manual location selected successfully!');
    } finally {
      setLocationLoading(false);
    }
  };

  // Clear location selection
  const clearLocation = () => {
    setUserLocation(null);
    setLocationMethod(null);
    setLocationError('');
    setSelectedMapLocation(null);
    setShowLocationMap(false);
  };

  // Map click handler component
  const MapClickHandler: React.FC = () => {
    useMapEvents({
      click: (e) => {
        setSelectedMapLocation({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        });
      }
    });
    return null;
  };

  // Simple reverse geocoding using OpenStreetMap Nominatim API
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) throw new Error('Reverse geocoding failed');
      
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    } catch (error) {
      throw new Error('Could not get address from coordinates');
    }
  };

  const submitRequest = async () => {
    setLoading(true);
    try {
      // Include location data in the request
      const requestData: CreateWasteRequestData = {
        binId: formData.binId,
        collectionType: formData.collectionType,
        preferredDate: formData.preferredDate,
        preferredTimeSlot: formData.preferredTimeSlot,
        notes: formData.notes,
        address: formData.address,
        location: userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          address: userLocation.address || `${userLocation.latitude}, ${userLocation.longitude}`
        } : undefined
      };

      console.log('Submitting request with location data:', requestData);

      const response = await wasteService.createWasteRequest(requestData);
      if (response.success) {
        setCreatedRequest(response.data.wasteRequest);
        toast.success('Request created successfully with location!');
        console.log('Request created with ID:', response.data.wasteRequest.requestId);
      }
    } catch (error: any) {
      console.error('Error submitting request:', error);
      
      // Handle specific error types
      if (error.response?.status === 409) {
        toast.error('This bin is already scheduled for the selected date. Please choose a different date.');
      } else if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message || error.message || 'Invalid request data';
        toast.error(errorMessage);
      } else if (error.response?.status === 403) {
        toast.error('Your account is inactive. Please contact support.');
      } else {
        toast.error(error.message || 'Failed to create request. Please try again.');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (paymentMethod: string, cardNumber?: string) => {
    if (!createdRequest) return;

    setPaymentStatus('processing');
    try {
      // Simulate payment processing since the actual method doesn't exist yet
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, assume payment is successful
      setPaymentStatus('success');
      toast.success('Payment successful!');
      
      // Payment successful - notification service will be implemented later
      console.log('Payment completed for request:', createdRequest.requestId);
      
      setCurrentStep(5);
    } catch (error: any) {
      setPaymentStatus('failed');
      toast.error(error.message || 'Payment failed');
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-6 sm:mb-8 overflow-x-auto pb-2">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        
        return (
          <div key={step.id} className="flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors
              ${isActive ? 'bg-green-600 text-white' : 
                isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}
            `}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className={`
              ml-2 text-xs sm:text-sm font-medium hidden sm:block
              ${isActive ? 'text-green-600' : 
                isCompleted ? 'text-green-500' : 'text-gray-400'}
            `}>
              {step.name}
            </span>
            {index < steps.length - 1 && (
              <div className={`
                w-8 sm:w-12 h-0.5 mx-2 sm:mx-4
                ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderCollectionTypeStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
        Select Collection Type
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {wasteTypes.map((type) => (
          <div
            key={type._id}
            className={`
              p-4 sm:p-6 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md
              ${formData.collectionType === type.type 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'}
            `}
            onClick={() => setFormData({ ...formData, collectionType: type.type })}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{type.name}</h3>
              <span className="text-green-600 font-bold text-sm sm:text-base">
                ${type.baseCost}
              </span>
            </div>
            <p className="text-gray-600 text-xs sm:text-sm mb-3">{type.description}</p>
            
            {type.restrictions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-700">Restrictions:</p>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {type.restrictions.slice(0, 2).map((restriction, index) => (
                    <li key={index}>• {restriction}</li>
                  ))}
                  {type.restrictions.length > 2 && (
                    <li className="text-gray-500">+ {type.restrictions.length - 2} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {(formData.collectionType === 'hazardous' || formData.collectionType === 'ewaste') && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">
            Special Collection Details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Item type (e.g., Furniture, Electronics)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              value={formData.specialDetails?.itemType || ''}
              onChange={(e) => setFormData({
                ...formData,
                specialDetails: {
                  ...formData.specialDetails,
                  itemType: e.target.value,
                  weight: formData.specialDetails?.weight || '',
                  description: formData.specialDetails?.description || ''
                }
              })}
            />
            <input
              type="text"
              placeholder="Estimated weight (kg)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              value={formData.specialDetails?.weight || ''}
              onChange={(e) => setFormData({
                ...formData,
                specialDetails: {
                  ...formData.specialDetails,
                  weight: e.target.value,
                  itemType: formData.specialDetails?.itemType || '',
                  description: formData.specialDetails?.description || ''
                }
              })}
            />
          </div>
          <textarea
            placeholder="Additional description"
            rows={3}
            className="w-full mt-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
            value={formData.specialDetails?.description || ''}
            onChange={(e) => setFormData({
              ...formData,
              specialDetails: {
                ...formData.specialDetails,
                description: e.target.value,
                itemType: formData.specialDetails?.itemType || '',
                weight: formData.specialDetails?.weight || ''
              }
            })}
          />
        </div>
      )}

      {estimatedCost > 0 && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <span className="text-green-800 font-medium text-sm sm:text-base">
              Estimated Cost:
            </span>
            <span className="text-green-600 font-bold text-lg sm:text-xl">
              ${estimatedCost}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderScheduleStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
        Schedule Collection
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bin ID / Location
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
            value={formData.binId}
            onChange={(e) => setFormData({ ...formData, binId: e.target.value })}
          >
            <option value="">Select bin location</option>
            {userBins.map((bin) => (
              <option key={bin._id} value={bin.binId}>
                {bin.binId} - {bin.location.address} ({bin.location.area})
                {bin.fillLevel > 0 && ` - ${bin.fillLevel}% full`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Date
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
            value={formData.preferredDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              setFormData({ ...formData, preferredDate: e.target.value });
              // Reset availability check when date changes
              setIsScheduleAvailable(null);
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Time Slot
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
            value={formData.preferredTimeSlot}
            onChange={(e) => {
              setFormData({ ...formData, preferredTimeSlot: e.target.value });
              // Reset availability check when time changes
              setIsScheduleAvailable(null);
            }}
          >
            <option value="">Select time slot</option>
            <option value="08:00-10:00">08:00 - 10:00 AM</option>
            <option value="10:00-12:00">10:00 - 12:00 PM</option>
            <option value="12:00-14:00">12:00 - 02:00 PM</option>
            <option value="14:00-16:00">02:00 - 04:00 PM</option>
            <option value="16:00-18:00">04:00 - 06:00 PM</option>
          </select>
        </div>

        <div>
          <button
            type="button"
            onClick={checkScheduleAvailability}
            disabled={!formData.binId || !formData.preferredDate || loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Check Availability
              </>
            )}
          </button>
        </div>
      </div>

      {isScheduleAvailable !== null && (
        <div className={`p-4 rounded-lg border ${
          isScheduleAvailable 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {isScheduleAvailable ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            <span className="font-medium text-sm sm:text-base">
              {isScheduleAvailable 
                ? 'Schedule is available!' 
                : 'Selected time slot is not available'}
            </span>
          </div>
          {!isScheduleAvailable && (
            <div className="mt-2">
              <p className="text-sm">
                Please try these alternative dates:
              </p>
              <ul className="text-sm mt-1 list-disc list-inside">
                <li>{new Date(Date.now() + 86400000).toDateString()}</li>
                <li>{new Date(Date.now() + 172800000).toDateString()}</li>
                <li>{new Date(Date.now() + 259200000).toDateString()}</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
        Confirm Details & Location
      </h2>

      {/* Collection Summary */}
      <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">
          Collection Summary
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium">
              {wasteTypes.find(t => t.type === formData.collectionType)?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Location:</span>
            <span className="font-medium">{formData.binId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span className="font-medium">
              {new Date(formData.preferredDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Time:</span>
            <span className="font-medium">{formData.preferredTimeSlot}</span>
          </div>
          <div className="flex justify-between border-t pt-3">
            <span className="text-gray-900 font-semibold">Total Cost:</span>
            <span className="text-green-600 font-bold text-lg">${estimatedCost}</span>
          </div>
        </div>
      </div>

      {/* Location Capture */}
      <div className="bg-blue-50 p-4 sm:p-6 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-blue-600" />
          Collection Location
        </h3>
        
        {!userLocation ? (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4 text-sm">
              Please select your location for accurate collection service.
            </p>
            
            {/* Location selection buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {locationLoading && locationMethod === 'gps' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Getting GPS Location...
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4 mr-2" />
                    Use GPS Location
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={selectManualLocation}
                disabled={locationLoading}
                className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <MousePointer className="h-4 w-4 mr-2" />
                Select on Map
              </button>
            </div>
            
            {locationError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{locationError}</p>
                <p className="text-red-600 text-xs mt-1">
                  Try using "Select on Map" instead.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white p-3 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-600 font-medium text-sm flex items-center">
                  {locationMethod === 'gps' ? (
                    <>
                      <Navigation className="h-4 w-4 mr-1" />
                      GPS Location Captured
                    </>
                  ) : (
                    <>
                      <MousePointer className="h-4 w-4 mr-1" />
                      Manual Location Selected
                    </>
                  )}
                </span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={selectManualLocation}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={clearLocation}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>Coordinates:</strong> {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}</p>
                {userLocation.address && (
                  <p><strong>Address:</strong> {userLocation.address}</p>
                )}
              </div>
            </div>
            
            {/* Mini map preview */}
            <div className="bg-white p-3 rounded-lg border">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Map className="h-4 w-4 mr-1" />
                Location Preview
              </p>
              <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.longitude-0.005},${userLocation.latitude-0.005},${userLocation.longitude+0.005},${userLocation.latitude+0.005}&layer=mapnik&marker=${userLocation.latitude},${userLocation.longitude}`}
                  className="w-full h-full rounded-lg"
                  frameBorder="0"
                  scrolling="no"
                  title="Location Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Address Details */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Address Details</h3>
        <div className="grid grid-cols-1 gap-4">
          <input
            type="text"
            placeholder="Street Address"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
            value={formData.address.street}
            onChange={(e) => setFormData({
              ...formData,
              address: { ...formData.address, street: e.target.value }
            })}
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="City"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              value={formData.address.city}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, city: e.target.value }
              })}
            />
            <input
              type="text"
              placeholder="Postal Code"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              value={formData.address.postalCode}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, postalCode: e.target.value }
              })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="Any special instructions or notes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );

  // Manual location selection modal
  const LocationSelectionModal: React.FC = () => {
    if (!showLocationMap) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Select Your Location on Map
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Click on the map to select your collection location
            </p>
          </div>

          <div className="h-96 relative">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler />
              {selectedMapLocation && (
                <Marker
                  position={[selectedMapLocation.latitude, selectedMapLocation.longitude]}
                />
              )}
            </MapContainer>

            {/* Map instructions overlay */}
            <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-md max-w-xs">
              <p className="text-sm text-gray-700">
                <MousePointer className="h-4 w-4 inline mr-1" />
                Click anywhere on the map to place a marker at your location
              </p>
            </div>
          </div>

          {selectedMapLocation && (
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <strong>Selected Location:</strong><br />
                  Latitude: {selectedMapLocation.latitude.toFixed(6)}<br />
                  Longitude: {selectedMapLocation.longitude.toFixed(6)}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowLocationMap(false)}
                    className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmManualLocation}
                    disabled={locationLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {locationLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      'Confirm Location'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!selectedMapLocation && (
            <div className="p-4 bg-yellow-50 border-t border-gray-200">
              <p className="text-sm text-yellow-800 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Please click on the map to select your location
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPaymentStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
        Payment
      </h2>

      {createdRequest && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center mb-2">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="font-medium text-green-800 text-sm sm:text-base">
              Request Created Successfully!
            </span>
          </div>
          <p className="text-green-700 text-sm">
            Request ID: <span className="font-mono">{createdRequest.requestId}</span>
          </p>
        </div>
      )}

      <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-900 font-semibold text-sm sm:text-base">
            Amount to Pay:
          </span>
          <span className="text-green-600 font-bold text-xl sm:text-2xl">
            ${estimatedCost}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
          Payment Method
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => processPayment('credit_card', '****-****-****-1234')}
            disabled={paymentStatus === 'processing'}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-center">
              <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <span className="block font-medium text-sm">Credit Card</span>
              <span className="text-xs text-gray-500">Instant payment</span>
            </div>
          </button>

          <button
            onClick={() => processPayment('debit_card', '****-****-****-5678')}
            disabled={paymentStatus === 'processing'}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <span className="block font-medium text-sm">Debit Card</span>
              <span className="text-xs text-gray-500">Direct payment</span>
            </div>
          </button>
        </div>

        {paymentStatus === 'processing' && (
          <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
            <Loader2 className="w-5 h-5 mr-2 animate-spin text-blue-600" />
            <span className="text-blue-800 font-medium text-sm">
              Processing payment...
            </span>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center mb-2">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="font-medium text-red-800 text-sm">
                Payment Failed
              </span>
            </div>
            <p className="text-red-700 text-sm mb-3">
              Your payment could not be processed. Please try again.
            </p>
            <button
              onClick={() => setPaymentStatus('pending')}
              className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-4 sm:space-y-6 text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
      </div>

      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Request Confirmed!
        </h2>
        <p className="text-gray-600 text-sm sm:text-base">
          Your waste collection has been scheduled successfully.
        </p>
      </div>

      {createdRequest && (
        <div className="bg-gray-50 p-4 sm:p-6 rounded-lg text-left">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">
            Collection Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Request ID:</span>
              <span className="font-mono text-xs sm:text-sm">
                {createdRequest.requestId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                {createdRequest.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span>{new Date(createdRequest.preferredDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment:</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                {createdRequest.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => {
            setCurrentStep(1);
            setFormData({
              collectionType: '',
              binId: '',
              preferredDate: '',
              preferredTimeSlot: '',
              notes: '',
              address: { street: '', city: '', postalCode: '' }
            });
            setCreatedRequest(null);
            setPaymentStatus('pending');
          }}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          New Request
        </button>
      </div>
    </div>
  );

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.collectionType !== '';
      case 2:
        return formData.binId && formData.preferredDate && formData.preferredTimeSlot && isScheduleAvailable;
      case 3:
        return formData.address.street && formData.address.city && formData.address.postalCode && userLocation;
      case 4:
        return paymentStatus === 'success';
      default:
        return false;
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderCollectionTypeStep();
      case 2:
        return renderScheduleStep();
      case 3:
        return renderDetailsStep();
      case 4:
        return renderPaymentStep();
      case 5:
        return renderConfirmationStep();
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to request collection.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account Inactive</h2>
          <p className="text-gray-600 mb-4">
            Your account is inactive. Please contact support to reactivate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Request Waste Collection
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Schedule your waste pickup in a few simple steps
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
          {renderStepIndicator()}
          {renderCurrentStep()}

          {currentStep < 5 && (
            <div className="flex justify-between mt-6 sm:mt-8 pt-6 border-t">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </button>

              <button
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {currentStep === 3 ? 'Submit Request' : 'Next'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add the location selection modal */}
      <LocationSelectionModal />
    </div>
  );
};

export default RequestCollectionPage;
