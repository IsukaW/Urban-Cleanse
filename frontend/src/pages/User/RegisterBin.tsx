import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, Trash2, CheckCircle, Map, Navigation, Target, Layers, Satellite } from 'lucide-react';
import toast from 'react-hot-toast';
import binService from '../../services/bin/api';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom red marker icon
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks
const MapClickHandler: React.FC<{
  onLocationSelect: (coords: { lat: number; lng: number }) => void;
}> = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      
      // Check if coordinates are within Sri Lanka bounds
      if (lat >= 5.9 && lat <= 9.9 && lng >= 79.6 && lng <= 81.9) {
        onLocationSelect({ lat, lng });
      } else {
        toast.error('Please select a location within Sri Lanka');
      }
    },
  });
  return null;
};

// Component to update map view when location is detected
const MapController: React.FC<{
  center: [number, number];
  zoom: number;
}> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

// Google Maps-like MapSelector component
const MapSelector: React.FC<{
  coordinates: { lat: string; lng: string };
  onCoordinatesChange: (coords: { lat: string; lng: string }) => void;
  onAddressDetected: (address: string) => void;
}> = ({ coordinates, onCoordinatesChange, onAddressDetected }) => {
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [mapCenter, setMapCenter] = useState<[number, number]>([6.9271, 79.8612]); // Colombo
  const [zoomLevel, setZoomLevel] = useState(13);

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Check if location is within Sri Lanka
        if (latitude >= 5.9 && latitude <= 9.9 && longitude >= 79.6 && longitude <= 81.9) {
          onCoordinatesChange({
            lat: latitude.toFixed(6),
            lng: longitude.toFixed(6)
          });
          
          // Update map center and zoom in
          setMapCenter([latitude, longitude]);
          setZoomLevel(16);
          
          // Simulate reverse geocoding
          setTimeout(() => {
            onAddressDetected(`Current location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            toast.success('📍 Current location detected successfully!');
          }, 500);
        } else {
          toast.error('Your current location is outside Sri Lanka. Please select a location manually.');
        }
        
        setIsDetectingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Failed to detect location. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'Please select manually on the map.';
            break;
        }
        
        toast.error(errorMessage);
        setIsDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const handleLocationSelect = (coords: { lat: number; lng: number }) => {
    onCoordinatesChange({
      lat: coords.lat.toFixed(6),
      lng: coords.lng.toFixed(6)
    });

    // Simulate reverse geocoding with Sri Lankan locations
    setTimeout(() => {
      const sriLankanAreas = [
        'Colombo 1 (Fort)',
        'Colombo 2 (Slave Island)',
        'Colombo 3 (Kollupitiya)',
        'Colombo 4 (Bambalapitiya)',
        'Colombo 5 (Narahenpita)',
        'Colombo 6 (Wellawatte)',
        'Colombo 7 (Cinnamon Gardens)',
        'Mount Lavinia',
        'Dehiwala',
        'Moratuwa',
        'Kotte',
        'Maharagama'
      ];
      
      const randomArea = sriLankanAreas[Math.floor(Math.random() * sriLankanAreas.length)];
      onAddressDetected(`Near ${randomArea}, Sri Lanka`);
      toast.success('📍 Location selected on map');
    }, 300);
  };

  const toggleMapType = () => {
    setMapType(prev => prev === 'street' ? 'satellite' : 'street');
  };

  // Get tile layer URL based on map type
  const getTileLayer = () => {
    if (mapType === 'satellite') {
      return {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      };
    } else {
      return {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      };
    }
  };

  const tileLayer = getTileLayer();

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Map className="h-5 w-5 mr-2 text-blue-600" />
          📍 Interactive Map Location Selector
        </h3>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={toggleMapType}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center text-sm border"
            title={`Switch to ${mapType === 'street' ? 'Satellite' : 'Street'} view`}
          >
            {mapType === 'street' ? (
              <>
                <Satellite className="h-4 w-4 mr-1" />
                Satellite
              </>
            ) : (
              <>
                <Layers className="h-4 w-4 mr-1" />
                Street
              </>
            )}
          </button>
          <button
            type="button"
            onClick={detectCurrentLocation}
            disabled={isDetectingLocation}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm disabled:opacity-50 border border-blue-600"
          >
            {isDetectingLocation ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Detecting...
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4 mr-2" />
                My Location
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Google Maps-like map */}
      <div className="relative w-full h-96 rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg">
        <MapContainer
          center={mapCenter}
          zoom={zoomLevel}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          dragging={true}
        >
          <TileLayer
            url={tileLayer.url}
            attribution={tileLayer.attribution}
            maxZoom={19}
          />
          
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          <MapController center={mapCenter} zoom={zoomLevel} />
          
          {/* Selected location marker */}
          {coordinates.lat && coordinates.lng && (
            <Marker
              position={[parseFloat(coordinates.lat), parseFloat(coordinates.lng)]}
              icon={redIcon}
            >
              <Popup>
                <div className="text-center p-2">
                  <h3 className="font-semibold text-gray-900 mb-1">📍 Selected Bin Location</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    📐 {parseFloat(coordinates.lat).toFixed(4)}, {parseFloat(coordinates.lng).toFixed(4)}
                  </p>
                  <p className="text-xs text-blue-600">
                    ✅ Perfect! This location will be used for your smart bin registration.
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Map type indicator */}
        <div className="absolute top-4 left-4 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-sm z-[1000]">
          <p className="text-xs font-medium text-gray-700 flex items-center">
            <span className="mr-1">🗺️</span>
            {mapType === 'street' ? 'Street View' : 'Satellite View'}
          </p>
        </div>

        {/* Coordinates display */}
        {coordinates.lat && coordinates.lng && (
          <div className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-90 text-white text-xs px-3 py-2 rounded-lg z-[1000]">
            📐 {parseFloat(coordinates.lat).toFixed(6)}, {parseFloat(coordinates.lng).toFixed(6)}
          </div>
        )}

        {/* Center crosshair */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1000]">
          <Target className="h-6 w-6 text-blue-500 opacity-30" />
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
        <p className="font-medium text-blue-900 mb-2 flex items-center">
          <span className="mr-2">🎯</span>
          Interactive Map Instructions:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-blue-800">
          <ul className="space-y-1">
            <li className="flex items-center">
              <span className="mr-2">🖱️</span>
              <strong>Click</strong> anywhere to place your bin location
            </li>
            <li className="flex items-center">
              <span className="mr-2">🔄</span>
              <strong>Scroll</strong> to zoom in/out for precision
            </li>
            <li className="flex items-center">
              <span className="mr-2">🖐️</span>
              <strong>Drag</strong> to pan around the map
            </li>
          </ul>
          <ul className="space-y-1">
            <li className="flex items-center">
              <span className="mr-2">📍</span>
              <strong>GPS</strong> button for auto-location
            </li>
            <li className="flex items-center">
              <span className="mr-2">🛰️</span>
              <strong>Switch</strong> between Street & Satellite view
            </li>
            <li className="flex items-center">
              <span className="mr-2">✅</span>
              <strong>Red pin</strong> shows selected location
            </li>
          </ul>
        </div>
      </div>

      {/* Quick location buttons for Sri Lanka */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm font-medium text-gray-700 mb-3">🏙️ Quick Jump to Major Cities:</p>
        <div className="flex flex-wrap gap-2">
          {/*
            { name: '🏛️ Colombo', coords: [6.9271, 79.8612] },
            { name: '🏖️ Mount Lavinia', coords: [6.8485, 79.9053] },
            { name: '🏪 Dehiwala', coords: [6.8562, 79.8492] },
            { name: '🏭 Moratuwa', coords: [6.7720, 79.8816] },
            { name: '🏢 Kotte', coords: [6.8906, 79.9142] }
          */}
          {/*
            { city.name }
          */}
        </div>
      </div>
    </div>
  );
};

const RegisterBin: React.FC = () => {
  const [formData, setFormData] = useState({
    address: '',
    area: '',
    coordinates: { lat: '', lng: '' },
    capacity: '100',
    type: 'food'
  });
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const areas = [
    'Colombo 1 (Fort)',
    'Colombo 2 (Slave Island)',
    'Colombo 3 (Kollupitiya)',
    'Colombo 4 (Bambalapitiya)',
    'Colombo 5 (Narahenpita)',
    'Colombo 6 (Wellawatte)',
    'Colombo 7 (Cinnamon Gardens)',
    'Colombo 8 (Borella)',
    'Colombo 9 (Dematagoda)',
    'Colombo 10 (Maradana)',
    'Colombo 11 (Pettah)',
    'Colombo 12 (Hulftsdorp)',
    'Colombo 13 (Kotahena)',
    'Colombo 14 (Grandpass)',
    'Colombo 15 (Mutwal)',
    'Mount Lavinia',
    'Dehiwala',
    'Moratuwa',
    'Ratmalana',
    'Kotte',
    'Maharagama',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.address || !formData.area || !formData.coordinates.lat || !formData.coordinates.lng) {
      toast.error('Please fill in all required fields including GPS coordinates');
      return;
    }

    // Validate coordinates
    const lat = parseFloat(formData.coordinates.lat);
    const lng = parseFloat(formData.coordinates.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Please enter valid GPS coordinates');
      return;
    }
    
    // Basic validation for Sri Lanka coordinates
    if (lat < 5.9 || lat > 9.9 || lng < 79.6 || lng > 81.9) {
      toast.error('Coordinates should be within Sri Lanka boundaries');
      return;
    }

    setLoading(true);
    try {
      const response = await binService.registerBin({
        address: formData.address,
        area: formData.area,
        coordinates: {
          lat: parseFloat(formData.coordinates.lat),
          lng: parseFloat(formData.coordinates.lng)
        },
        capacity: parseInt(formData.capacity),
        type: formData.type
      });

      if (response.success) {
        toast.success('Smart bin registered successfully! Our team will review and approve your registration within 24-48 hours.');
        setFormData({
          address: '',
          area: '',
          coordinates: { lat: '', lng: '' },
          capacity: '100',
          type: 'food'
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to register bin');
    } finally {
      setLoading(false);
    }
  };

  const handleCoordinatesChange = (coords: { lat: string; lng: string }) => {
    setFormData(prev => ({
      ...prev,
      coordinates: coords
    }));
  };

  const handleAddressDetected = (detectedAddress: string) => {
    if (!formData.address) {
      setFormData(prev => ({
        ...prev,
        address: detectedAddress
      }));
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            coordinates: {
              lat: position.coords.latitude.toString(),
              lng: position.coords.longitude.toString()
            }
          }));
          toast.success('Location detected successfully');
        },
        (error) => {
          toast.error('Failed to get location. Please use the map or enter coordinates manually.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-green-100 p-2 rounded-lg">
              <Plus className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Register Smart Bin</h1>
              <p className="text-gray-600">Register your bin location for waste collection services</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Map Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Location Selection</h3>
                <button
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {showMap ? 'Hide Map' : 'Show Map'}
                </button>
              </div>
              
              {showMap && (
                <MapSelector
                  coordinates={formData.coordinates}
                  onCoordinatesChange={handleCoordinatesChange}
                  onAddressDetected={handleAddressDetected}
                />
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Complete Address *
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter complete address with street name, house/building number, and landmarks"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Include street name, building/house number, and nearby landmarks for easy identification
              </p>
            </div>

            {/* Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Area/District *
              </label>
              <select
                value={formData.area}
                onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">Select your area</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            {/* GPS Coordinates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GPS Coordinates *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.coordinates.lat}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      coordinates: { ...prev.coordinates, lat: e.target.value }
                    }))}
                    placeholder="6.9271"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.coordinates.lng}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      coordinates: { ...prev.coordinates, lng: e.target.value }
                    }))}
                    placeholder="79.8612"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    Auto-Detect
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use the map above to select location, click "Auto-Detect" for current location, or enter coordinates manually
              </p>
            </div>

            {/* Capacity and Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bin Capacity (Liters)
                </label>
                <select
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="50">50 Liters (Small)</option>
                  <option value="100">100 Liters (Medium)</option>
                  <option value="200">200 Liters (Large)</option>
                  <option value="500">500 Liters (Extra Large)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bin Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="food">Food Waste</option>
                  <option value="polythene">Polythene Waste</option>
                  <option value="paper">Paper Waste</option>
                  <option value="hazardous">Hazardous Waste</option>
                  <option value="ewaste">E-Waste</option>
                </select>
              </div>
            </div>

            {/* Coordinates Display */}
            {formData.coordinates.lat && formData.coordinates.lng && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Location</h4>
                <div className="text-sm text-blue-800">
                  <p>Latitude: {formData.coordinates.lat}</p>
                  <p>Longitude: {formData.coordinates.lng}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Please verify this location is correct before submitting
                  </p>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-900">Registration Process</h4>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    <li>• Your bin registration will be reviewed by our admin team</li>
                    <li>• Approval typically takes 24-48 hours</li>
                    <li>• You'll receive email notification once approved</li>
                    <li>• Ensure GPS coordinates are accurate for successful collection</li>
                    <li>• Our team may contact you for verification if needed</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Registering Smart Bin...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Register Smart Bin
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterBin;
