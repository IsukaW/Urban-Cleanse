import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import {
  MapPin,
  Battery,
  Trash2,
  AlertTriangle,
  Bell,
  Wifi,
  WifiOff,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle
} from 'lucide-react';
import binService from '../../services/bin/api';
import type { Bin, Alert } from '../../services/bin/type';
import type { WasteRequest } from '../../services/waste/type';
import wasteService from '../../services/waste/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const BinStatusDashboard: React.FC = () => {
  const [bins, setBins] = useState<Bin[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
  const [showBinDetails, setShowBinDetails] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    area: '',
    maintenance: false
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [userRequests, setUserRequests] = useState<WasteRequest[]>([]);
  const [showUserRequests, setShowUserRequests] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WasteRequest | null>(null);
  const [showRequestTracking, setShowRequestTracking] = useState(false);
  const [viewMode, setViewMode] = useState<'bins' | 'requests' | 'combined'>('combined');
  const [selectedBinId, setSelectedBinId] = useState<string>('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([6.9271, 79.8612]); // Default to Colombo, Sri Lanka

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [binResponse, alertResponse, requestsResponse] = await Promise.all([
        binService.getBinStatus(filters),
        binService.getActiveAlerts(),
        wasteService.getAllRequests({ limit: 100 }) // Get recent requests with location
      ]);

      if (binResponse.success) {
        setBins(binResponse.data.bins);
        setAreas(binResponse.data.areas);
      }

      if (alertResponse.success) {
        setAlerts(alertResponse.data.alerts);
      }

      if (requestsResponse.success) {
        // Filter requests that have location data
        const requestsWithLocation = requestsResponse.data.requests.filter(
          req => req.location && req.location.latitude && req.location.longitude
        );
        setUserRequests(requestsWithLocation);
      }

      setIsConnected(true);
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setIsConnected(false);
      toast.error('Failed to fetch bin data. Using cached data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleBinClick = (bin: Bin) => {
    setSelectedBin(bin);
    setShowBinDetails(true);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await binService.acknowledgeAlert(alertId);
      toast.success('Alert acknowledged');
      fetchData();
    } catch (error) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const getBinMarkerColor = (status: string) => {
    switch (status) {
      case 'Empty':
        return '#10B981'; // Green
      case 'Half-Full':
        return '#F59E0B'; // Orange
      case 'Full':
        return '#EF4444'; // Red
      case 'Overflow':
        return '#8B5CF6'; // Purple
      default:
        return '#6B7280'; // Gray
    }
  };

  const createBinIcon = (bin: Bin) => {
    const color = getBinMarkerColor(bin.status);
    return L.divIcon({
      className: 'custom-bin-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 10px;
        ">
          ${bin.fillLevel > 100 ? '!' : Math.round(bin.fillLevel)}
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  const createUserRequestIcon = (request: WasteRequest) => {
    const getStatusColor = () => {
      switch (request.status) {
        case 'pending': return '#F59E0B'; // Orange
        case 'approved': return '#3B82F6'; // Blue
        case 'completed': return '#10B981'; // Green
        case 'cancelled': return '#EF4444'; // Red
        default: return '#6B7280'; // Gray
      }
    };

    return L.divIcon({
      className: 'custom-request-marker',
      html: `
        <div style="
          background-color: ${getStatusColor()};
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 8px;
        ">
          R
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  const getStatusCounts = () => {
    const counts = bins.reduce((acc, bin) => {
      acc[bin.status] = (acc[bin.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Empty', value: counts.Empty || 0, color: '#10B981' },
      { name: 'Half-Full', value: counts['Half-Full'] || 0, color: '#F59E0B' },
      { name: 'Full', value: counts.Full || 0, color: '#EF4444' },
      { name: 'Overflow', value: counts.Overflow || 0, color: '#8B5CF6' }
    ];
  };

  const getAlertCounts = () => {
    const counts = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([type, count]) => ({
      name: type.replace('_', ' ').toUpperCase(),
      value: count
    }));
  };

  const BinDetailsModal: React.FC = () => {
    if (!selectedBin) return null;

    const binAlerts = alerts.filter(alert => alert.binId === selectedBin.binId);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Bin Details - {selectedBin.binId}
              </h3>
              <button
                onClick={() => setShowBinDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status Overview */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fill Level:</span>
                      <span className="font-medium">{selectedBin.fillLevel}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.min(selectedBin.fillLevel, 100)}%`,
                          backgroundColor: getBinMarkerColor(selectedBin.status)
                        }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedBin.status === 'Empty' ? 'bg-green-100 text-green-800' :
                        selectedBin.status === 'Half-Full' ? 'bg-yellow-100 text-yellow-800' :
                        selectedBin.status === 'Full' ? 'bg-red-100 text-red-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {selectedBin.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Battery</h4>
                  <div className="flex items-center space-x-2">
                    <Battery className={`h-4 w-4 ${
                      selectedBin.battery > 20 ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <span className="font-medium">{selectedBin.battery}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        selectedBin.battery > 20 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${selectedBin.battery}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Location & Info */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Location</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Address:</strong> {selectedBin.location.address}</p>
                    <p><strong>Area:</strong> {selectedBin.location.area}</p>
                    <p><strong>Coordinates:</strong> {selectedBin.location.coordinates.lat.toFixed(4)}, {selectedBin.location.coordinates.lng.toFixed(4)}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Technical Info</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Type:</strong> {selectedBin.type}</p>
                    <p><strong>Capacity:</strong> {selectedBin.capacity}L</p>
                    <p><strong>Last Updated:</strong> {new Date(selectedBin.lastUpdated).toLocaleString()}</p>
                    <p><strong>Maintenance Required:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        selectedBin.maintenanceRequired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedBin.maintenanceRequired ? 'Yes' : 'No'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Alerts */}
            {binAlerts.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Active Alerts</h4>
                <div className="space-y-2">
                  {binAlerts.map((alert) => (
                    <div key={alert._id} className={`p-3 rounded-lg border-l-4 ${
                      alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                      alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                      alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{alert.message}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!alert.acknowledgedBy && (
                          <button
                            onClick={() => handleAcknowledgeAlert(alert._id)}
                            className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Request Tracking Modal
  const RequestTrackingModal: React.FC = () => {
    if (!selectedRequest || !showRequestTracking) return null;

    const relatedBin = bins.find(bin => bin.binId === selectedRequest.binId);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Request Tracking - {selectedRequest.requestId}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Track bin location and request details
                </p>
              </div>
              <button
                onClick={() => setShowRequestTracking(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Request Details */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Request Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Request ID:</span>
                      <span className="font-medium font-mono">{selectedRequest.requestId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium">{(selectedRequest.userId as any)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Collection Type:</span>
                      <span className="font-medium capitalize">{selectedRequest.collectionType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Preferred Date:</span>
                      <span className="font-medium">
                        {new Date(selectedRequest.preferredDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedRequest.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        selectedRequest.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedRequest.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium text-green-600">${selectedRequest.cost}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Location */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Customer Location</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Address:</strong> {selectedRequest.location?.address}</p>
                    <p><strong>Coordinates:</strong> {selectedRequest.location?.latitude.toFixed(6)}, {selectedRequest.location?.longitude.toFixed(6)}</p>
                    {selectedRequest.address && (
                      <div className="pt-2 border-t border-blue-200">
                        <p><strong>Street:</strong> {selectedRequest.address.street}</p>
                        <p><strong>City:</strong> {selectedRequest.address.city}</p>
                        <p><strong>Postal Code:</strong> {selectedRequest.address.postalCode}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned Bin Details */}
                {relatedBin && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Assigned Bin Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bin ID:</span>
                        <span className="font-medium">{relatedBin.binId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fill Level:</span>
                        <span className="font-medium">{relatedBin.fillLevel}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          relatedBin.status === 'Empty' ? 'bg-green-100 text-green-800' :
                          relatedBin.status === 'Half-Full' ? 'bg-yellow-100 text-yellow-800' :
                          relatedBin.status === 'Full' ? 'bg-red-100 text-red-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {relatedBin.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Battery:</span>
                        <span className="font-medium">{relatedBin.battery}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium text-xs">{relatedBin.location.address}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tracking Map */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Location Tracking</h4>
                <div className="h-96 rounded-lg overflow-hidden border">
                  <MapContainer
                    center={selectedRequest.location ? 
                      [selectedRequest.location.latitude, selectedRequest.location.longitude] : 
                      [6.9271, 79.8612]
                    }
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Customer Location Marker */}
                    {selectedRequest.location && (
                      <Marker
                        position={[selectedRequest.location.latitude, selectedRequest.location.longitude]}
                        icon={L.divIcon({
                          className: 'custom-request-marker',
                          html: `
                            <div style="
                              background-color: #3B82F6;
                              width: 24px;
                              height: 24px;
                              border-radius: 50%;
                              border: 3px solid white;
                              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              color: white;
                              font-weight: bold;
                              font-size: 12px;
                            ">
                              C
                            </div>
                          `,
                          iconSize: [30, 30],
                          iconAnchor: [15, 15]
                        })}
                      >
                        <Popup>
                          <div className="p-2">
                            <h4 className="font-semibold">Customer Location</h4>
                            <p className="text-sm">{selectedRequest.requestId}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {selectedRequest.location.address}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* Assigned Bin Marker */}
                    {relatedBin && (
                      <Marker
                        position={[relatedBin.location.coordinates.lat, relatedBin.location.coordinates.lng]}
                        icon={createBinIcon(relatedBin)}
                      >
                        <Popup>
                          <div className="p-2">
                            <h4 className="font-semibold">Assigned Bin</h4>
                            <p className="text-sm">{relatedBin.binId}</p>
                            <p className="text-xs text-gray-600">{relatedBin.location.address}</p>
                            <div className="mt-2 space-y-1">
                              <p className="text-xs">Fill Level: {relatedBin.fillLevel}%</p>
                              <p className="text-xs">Battery: {relatedBin.battery}%</p>
                              <p className="text-xs">Status: {relatedBin.status}</p>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>

                {/* Distance Calculation */}
                {selectedRequest.location && relatedBin && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">Distance Information</h5>
                    <div className="text-sm text-gray-600">
                      <p>Distance between customer and assigned bin:</p>
                      <p className="font-medium text-gray-900">
                        {calculateDistance(
                          selectedRequest.location.latitude,
                          selectedRequest.location.longitude,
                          relatedBin.location.coordinates.lat,
                          relatedBin.location.coordinates.lng
                        ).toFixed(2)} km
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  if (relatedBin) {
                    handleBinClick(relatedBin);
                    setShowRequestTracking(false);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Bin Details
              </button>
              <button
                onClick={() => setShowRequestTracking(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleRequestClick = (request: WasteRequest) => {
    setSelectedRequest(request);
    setShowRequestTracking(true);
  };

  const handleTrackBin = (binId: string) => {
    setSelectedBinId(binId);
    const bin = bins.find(b => b.binId === binId);
    if (bin) {
      setMapCenter([bin.location.coordinates.lat, bin.location.coordinates.lng]);
    }
  };

  const getRequestsForBin = (binId: string) => {
    return userRequests.filter(req => req.binId === binId);
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bin Monitoring Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Real-time monitoring of {bins.length} smart bins and {userRequests.length} user requests
              {!isConnected && (
                <span className="ml-2 inline-flex items-center text-red-600">
                  <WifiOff className="h-4 w-4 mr-1" />
                  Reconnecting...
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-600">
              <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
              {isConnected && <Wifi className="h-4 w-4 ml-2 text-green-600" />}
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">View Mode</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('bins')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'bins'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bins Only
            </button>
            <button
              onClick={() => setViewMode('requests')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'requests'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Requests Only
            </button>
            <button
              onClick={() => setViewMode('combined')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'combined'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Combined View
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Trash2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bins</p>
              <p className="text-2xl font-bold text-gray-900">{bins.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">User Requests</p>
              <p className="text-2xl font-bold text-gray-900">{userRequests.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Battery className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Battery</p>
              <p className="text-2xl font-bold text-gray-900">
                {bins.filter(bin => bin.battery < 20).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bell className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overflow</p>
              <p className="text-2xl font-bold text-gray-900">
                {bins.filter(bin => bin.status === 'Overflow').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Statuses</option>
                <option value="Empty">Empty</option>
                <option value="Half-Full">Half-Full</option>
                <option value="Full">Full</option>
                <option value="Overflow">Overflow</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Area
              </label>
              <select
                value={filters.area}
                onChange={(e) => setFilters({ ...filters, area: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Areas</option>
                {areas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.maintenance}
                  onChange={(e) => setFilters({ ...filters, maintenance: e.target.checked })}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Maintenance Required
                </span>
              </label>
            </div>

            {/* Bin ID Filter for Tracking */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Track Specific Bin
              </label>
              <select
                value={selectedBinId}
                onChange={(e) => handleTrackBin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select bin to track</option>
                {bins.map((bin) => (
                  <option key={bin.binId} value={bin.binId}>
                    {bin.binId} - {bin.location.area}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Distribution Chart */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Status Distribution</h4>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getStatusCounts()}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                  >
                    {getStatusCounts().map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Live Tracking Map
            </h3>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={showUserRequests}
                  onChange={(e) => setShowUserRequests(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                Show User Requests
              </label>
            </div>
          </div>

          {/* Enhanced Map Legend */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Map Legend</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              {(viewMode === 'bins' || viewMode === 'combined') && (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span>Empty Bins</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span>Half-Full</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span>Full Bins</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                    <span>Overflow</span>
                  </div>
                </>
              )}
              {(viewMode === 'requests' || viewMode === 'combined') && showUserRequests && (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full border border-white"></div>
                    <span>Pending Requests</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full border border-white"></div>
                    <span>Approved Requests</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full border border-white"></div>
                    <span>Cancelled</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="h-96 rounded-lg overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Bin Markers */}
              {(viewMode === 'bins' || viewMode === 'combined') && bins.map((bin) => (
                <Marker
                  key={bin.binId}
                  position={[bin.location.coordinates.lat, bin.location.coordinates.lng]}
                  icon={createBinIcon(bin)}
                  eventHandlers={{
                    click: () => handleBinClick(bin)
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h4 className="font-semibold">{bin.binId}</h4>
                      <p className="text-sm text-gray-600">{bin.location.address}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm">
                          <strong>Fill Level:</strong> {bin.fillLevel}%
                        </p>
                        <p className="text-sm">
                          <strong>Battery:</strong> {bin.battery}%
                        </p>
                        <p className="text-sm">
                          <strong>Status:</strong> 
                          <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                            bin.status === 'Empty' ? 'bg-green-100 text-green-800' :
                            bin.status === 'Half-Full' ? 'bg-yellow-100 text-yellow-800' :
                            bin.status === 'Full' ? 'bg-red-100 text-red-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {bin.status}
                          </span>
                        </p>
                        <p className="text-sm">
                          <strong>Requests:</strong> {getRequestsForBin(bin.binId).length}
                        </p>
                      </div>
                      <div className="mt-2 pt-2 border-t">
                        <button
                          onClick={() => handleBinClick(bin)}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 mr-2"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleTrackBin(bin.binId)}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          Track Bin
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* User Request Markers */}
              {(viewMode === 'requests' || viewMode === 'combined') && showUserRequests && userRequests.map((request) => (
                <Marker
                  key={request.requestId}
                  position={[request.location!.latitude, request.location!.longitude]}
                  icon={createUserRequestIcon(request)}
                  eventHandlers={{
                    click: () => handleRequestClick(request)
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h4 className="font-semibold">User Request</h4>
                      <p className="text-sm text-gray-600">{request.requestId}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm">
                          <strong>Customer:</strong> {(request.userId as any)?.name || 'N/A'}
                        </p>
                        <p className="text-sm">
                          <strong>Type:</strong> {request.collectionType}
                        </p>
                        <p className="text-sm">
                          <strong>Assigned Bin:</strong> {request.binId}
                        </p>
                        <p className="text-sm">
                          <strong>Date:</strong> {new Date(request.preferredDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm">
                          <strong>Status:</strong> 
                          <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            request.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status}
                          </span>
                        </p>
                        <p className="text-sm">
                          <strong>Location:</strong> {request.location!.address}
                        </p>
                      </div>
                      <div className="mt-2 pt-2 border-t">
                        <button
                          onClick={() => handleRequestClick(request)}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          Track Request
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Request-wise Bin Tracking Table */}
      {(viewMode === 'requests' || viewMode === 'combined') && userRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Request-wise Bin Tracking ({userRequests.length} requests)
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Bin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userRequests.slice(0, 10).map((request) => {
                  const assignedBin = bins.find(bin => bin.binId === request.binId);
                  const distance = assignedBin && request.location ? 
                    calculateDistance(
                      request.location.latitude, 
                      request.location.longitude,
                      assignedBin.location.coordinates.lat,
                      assignedBin.location.coordinates.lng
                    ) : null;

                  return (
                    <tr key={request.requestId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {request.requestId}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            request.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {(request.userId as any)?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.collectionType}
                          </div>
                          <div className="text-xs text-gray-400">
                            📍 {request.location?.address?.substring(0, 30)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {assignedBin ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              {assignedBin.binId}
                            </div>
                            <div className="text-sm text-gray-500">
                              {assignedBin.location.area}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                assignedBin.status === 'Empty' ? 'bg-green-100 text-green-800' :
                                assignedBin.status === 'Half-Full' ? 'bg-yellow-100 text-yellow-800' :
                                assignedBin.status === 'Full' ? 'bg-red-100 text-red-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {assignedBin.fillLevel}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Bin not found</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {distance !== null ? (
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">{distance.toFixed(2)} km</span>
                            <div className={`text-xs mt-1 ${
                              distance < 0.5 ? 'text-green-600' :
                              distance < 1.0 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {distance < 0.5 ? 'Very Close' :
                               distance < 1.0 ? 'Nearby' : 'Far'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRequestClick(request)}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                            title="Track Request"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {assignedBin && (
                            <button
                              onClick={() => handleBinClick(assignedBin)}
                              className="text-green-600 hover:text-green-900 text-sm"
                              title="View Bin"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Recent Alerts ({alerts.length})
          </h3>
          
          <div className="space-y-3">
            {alerts.slice(0, 10).map((alert) => (
              <div key={alert._id} className={`p-4 rounded-lg border-l-4 ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                'bg-blue-50 border-blue-500'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {alert.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const bin = bins.find(b => b.binId === alert.binId);
                        if (bin) handleBinClick(bin);
                      }}
                      className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                    {!alert.acknowledgedBy && (
                      <button
                        onClick={() => handleAcknowledgeAlert(alert._id)}
                        className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Requests Summary */}
      {showUserRequests && userRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Recent User Requests with Location ({userRequests.length})
          </h3>
          
          <div className="space-y-3">
            {userRequests.slice(0, 10).map((request) => (
              <div key={request.requestId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{request.requestId}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      request.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">{(request.userId as any)?.name}</span> • 
                    <span className="ml-1">{request.collectionType}</span> • 
                    <span className="ml-1">{new Date(request.preferredDate).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    📍 {request.location!.address}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">${request.cost}</p>
                  <p className="text-xs text-gray-500">
                    {request.location!.latitude.toFixed(4)}, {request.location!.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBinDetails && <BinDetailsModal />}
      {showRequestTracking && <RequestTrackingModal />}
    </div>
  );
};

export default BinStatusDashboard;
