import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  Camera,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Clock,
  Scan,
  Navigation,
  Trash2,
  Battery,
  AlertCircle,
  RefreshCw,
  List,
  Map as MapIcon,
  Phone,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';
import collectionService from '../../services/collection/api';
import type { CollectionRoute } from '../../services/collection/type';

const PerformCollectionPage: React.FC = () => {
  const { user } = useAuth();
  const [routeData, setRouteData] = useState<CollectionRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedBin, setSelectedBin] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showIssueReport, setShowIssueReport] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualBinId, setManualBinId] = useState('');
  const [issueForm, setIssueForm] = useState<{
    type: 'damaged_bin' | 'blocked_access' | 'qr_damaged' | 'overflow' | 'hazardous_material' | 'other' | '';
    description: string;
    requiresAdmin: boolean;
  }>({
    type: '',
    description: '',
    requiresAdmin: false
  });

  useEffect(() => {
    fetchRouteData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchRouteData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchRouteData = async () => {
    if (!user?._id) return;
    
    try {
      setLoading(true);
      const response = await collectionService.getCollectorRoute(user._id);
      
      if (response.success) {
        setRouteData(response.data.route);
      } else {
        setRouteData(null);
      }
    } catch (error: any) {
      console.error('Error fetching route data:', error);
      if (error.message?.includes('No route assigned')) {
        setRouteData(null);
      } else {
        toast.error('Failed to fetch route data');
      }
    } finally {
      setLoading(false);
    }
  };

  const simulateQRScan = async () => {
    if (!selectedBin || !routeData) return;
    
    setScanning(true);
    try {
      // Get current location
      const locationData = await collectionService.getCurrentLocation();
      
      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 95% success rate for scanning simulation
      const scanSuccess = Math.random() > 0.05;
      
      if (scanSuccess) {
        await markBinCollected(selectedBin.binId, 'scan', locationData);
        toast.success(`Bin ${selectedBin.binId} scanned successfully!`);
        setShowScanner(false);
        setSelectedBin(null);
      } else {
        toast.error('Scan failed. Please try manual entry.');
        setShowScanner(false);
        setShowManualEntry(true);
      }
    } catch (error: any) {
      console.error('Scanning error:', error);
      toast.error('Scanning error occurred. Try manual entry.');
      setShowScanner(false);
      setShowManualEntry(true);
    } finally {
      setScanning(false);
    }
  };

  const markBinCollected = async (
    binId: string, 
    method: 'scan' | 'manual',
    locationData?: { latitude: number; longitude: number; accuracy: number }
  ) => {
    if (!routeData) return;

    try {
      let response;
      
      if (method === 'scan') {
        response = await collectionService.scanBinCollection({
          binId,
          routeId: routeData.routeId,
          locationData: locationData ? collectionService.formatLocationData(locationData) : undefined
        });
      } else {
        response = await collectionService.manualBinCollection({
          binId,
          routeId: routeData.routeId,
          reason: 'QR code scan failed',
          locationData: locationData ? collectionService.formatLocationData(locationData) : undefined
        });
      }

      if (response.success) {
        // Update local state - use the progress data from response
        setRouteData(prev => {
          if (!prev) return prev;
          
          const updatedBins = prev.bins.map(bin => 
            bin.binId === binId 
              ? { ...bin, collectionStatus: 'collected' as const }
              : bin
          );
          
          return {
            ...prev,
            bins: updatedBins,
            completedBins: response.data.routeProgress.completed
          };
        });
        
        toast.success(`Collection confirmed for ${binId}`);
        
        // Show additional success info about waste request
        if (response.data.wasteRequestStatus === 'completed') {
          toast.success(`✅ Waste request completed and customer notified`, {
            duration: 4000,
            icon: '📧'
          });
        }
      }
    } catch (error: any) {
      console.error('Error marking bin as collected:', error);
      
      // Handle specific error cases
      if (error.message?.includes('No approved collection request')) {
        toast.error('This bin is not scheduled for collection today.');
      } else if (error.message?.includes('already been collected')) {
        toast.error('This bin has already been collected today.');
      } else {
        toast.error(error.message || 'Failed to mark bin as collected');
      }
    }
  };

  const handleManualEntry = async () => {
    if (!manualBinId.trim()) {
      toast.error('Please enter a valid Bin ID');
      return;
    }
    
    const binExists = routeData?.bins.find(bin => bin.binId === manualBinId);
    if (!binExists) {
      toast.error('Bin ID not found in your route');
      return;
    }

    try {
      const locationData = await collectionService.getCurrentLocation();
      await markBinCollected(manualBinId, 'manual', locationData);
      setManualBinId('');
      setShowManualEntry(false);
    } catch (error: any) {
      console.error('Manual entry error:', error);
      // Still allow manual entry without location
      await markBinCollected(manualBinId, 'manual');
      setManualBinId('');
      setShowManualEntry(false);
    }
  };

  const reportIssue = async () => {
    if (!selectedBin || !issueForm.type || !routeData) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const locationData = await collectionService.getCurrentLocation();
      
      const response = await collectionService.reportIssue({
        binId: selectedBin.binId,
        routeId: routeData.routeId,
        issueType: issueForm.type as any,
        description: issueForm.description,
        requiresAdmin: issueForm.requiresAdmin,
        locationData: {
          coordinates: {
            lat: locationData.latitude,
            lng: locationData.longitude
          },
          accuracy: locationData.accuracy,
          timestamp: new Date().toISOString()
        }
      });

      if (response.success) {
        // Update bin status
        setRouteData(prev => {
          if (!prev) return prev;
          
          const updatedBins = prev.bins.map(bin => 
            bin.binId === selectedBin.binId 
              ? { ...bin, collectionStatus: 'failed' as const }
              : bin
          );
          
          return {
            ...prev,
            bins: updatedBins
          };
        });
        
        toast.success('Issue reported successfully');
        if (response.data.adminNotified) {
          toast.success('Admin has been notified');
        }
      }
    } catch (error: any) {
      console.error('Error reporting issue:', error);
      
      if (error.message?.includes('No approved collection request')) {
        toast.error('No collection request found for this bin today.');
      } else {
        toast.error(error.message || 'Failed to report issue');
      }
    } finally {
      setShowIssueReport(false);
      setSelectedBin(null);
      setIssueForm({ type: '', description: '', requiresAdmin: false });
    }
  };

  const getBinIcon = (bin: any) => {
    const getColor = () => {
      switch (bin.collectionStatus) {
        case 'collected': return '#10B981';
        case 'priority': return '#EF4444';
        case 'failed': return '#F59E0B';
        default: return '#6B7280';
      }
    };

    return L.divIcon({
      className: 'custom-bin-marker',
      html: `
        <div style="
          background-color: ${getColor()};
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
          ${bin.collectionStatus === 'collected' ? '✓' : (bin.fillLevel || '?')}
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  const getProgressPercentage = () => {
    if (!routeData) return 0;
    return Math.round((routeData.completedBins / routeData.totalBins) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'collected': return 'bg-green-100 text-green-800';
      case 'priority': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'collected': return <CheckCircle className="h-4 w-4" />;
      case 'priority': return <AlertTriangle className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your route...</p>
        </div>
      </div>
    );
  }

  if (!routeData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Route Assigned</h2>
          <p className="text-gray-600 mb-4">You don't have any assigned routes for today.</p>
          <button
            onClick={fetchRouteData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Collection Route</h1>
              <p className="text-sm text-gray-600">{routeData.routeId}</p>
              {routeData.approvedRequestsCount && (
                <p className="text-xs text-green-600">
                  {routeData.approvedRequestsCount} approved collection requests
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-green-100 text-green-600' : 'text-gray-600'}`}
              >
                <List className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-lg ${viewMode === 'map' ? 'bg-green-100 text-green-600' : 'text-gray-600'}`}
              >
                <MapIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Collection Progress</span>
              <span>{routeData.completedBins}/{routeData.totalBins} completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {getProgressPercentage()}% complete
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="p-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  Admin Approved & Paid Collections Only
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  You can only see collection requests that have been approved by admin AND fully paid by customers. 
                  Pending, cancelled, or unpaid requests are not shown in your collection list.
                </p>
              </div>
            </div>
          </div>

          {routeData.bins
            .filter(bin => 
              bin.wasteRequest && 
              bin.customerInfo && 
              bin.customerInfo.requestStatus === 'approved' && 
              bin.customerInfo.paymentStatus === 'paid'
            ) // Extra frontend filter for approved and paid requests
            .map((bin) => (
            <div
              key={bin.binId}
              className={`bg-white rounded-lg shadow-sm border p-4 ${
                bin.priority === 'urgent' ? 'border-red-200 bg-red-50' : 'border-green-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <h3 className="font-semibold text-gray-900">{bin.binId}</h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bin.collectionStatus || 'pending')}`}>
                      {getStatusIcon(bin.collectionStatus || 'pending')}
                      <span className="ml-1">{bin.collectionStatus || 'pending'}</span>
                    </span>
                    {bin.priority === 'urgent' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Urgent
                      </span>
                    )}
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Approved & Paid
                    </span>
                  </div>

                  {/* Customer Information - Only show for approved and paid requests */}
                  {bin.customerInfo && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Customer:</span>
                          <span className="ml-2 font-medium">{bin.customerInfo.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Request ID:</span>
                          <span className="ml-2 font-medium">{bin.customerInfo.requestId}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Collection Type:</span>
                          <span className="ml-2 font-medium capitalize">{bin.customerInfo.collectionType}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Amount:</span>
                          <span className="ml-2 font-medium text-green-600">${bin.customerInfo.cost}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Payment:</span>
                          <span className="ml-2 font-medium text-green-600">✓ Paid</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <span className="ml-2 font-medium text-blue-600">✓ Approved</span>
                        </div>
                        {bin.customerInfo.notes && (
                          <div className="md:col-span-2">
                            <span className="text-gray-600">Notes:</span>
                            <span className="ml-2">{bin.customerInfo.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Bin Location and Status */}
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {bin.location?.address || bin.binData?.location?.address || 'Address not available'}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Fill: {bin.fillLevel || bin.binData?.fillLevel || 0}%
                      </div>
                      <div className="flex items-center">
                        <Battery className="h-4 w-4 mr-1" />
                        {bin.battery || bin.binData?.battery || 0}%
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Seq: #{bin.sequence}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 ml-4">
                  {bin.collectionStatus !== 'collected' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedBin(bin);
                          setShowScanner(true);
                        }}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        <Scan className="h-4 w-4 mr-1" />
                        Collect
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBin(bin);
                          setShowIssueReport(true);
                        }}
                        className="flex items-center px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Issue
                      </button>
                    </>
                  )}
                  {bin.collectionStatus === 'collected' && (
                    <div className="text-center">
                      <div className="flex items-center text-green-600 text-sm mb-1">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Collected
                      </div>
                      {bin.customerInfo && (
                        <p className="text-xs text-gray-500">
                          Customer notified
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* No approved requests message */}
          {routeData.bins.filter(bin => 
            bin.wasteRequest && 
            bin.customerInfo && 
            bin.customerInfo.requestStatus === 'approved' && 
            bin.customerInfo.paymentStatus === 'paid'
          ).length === 0 && (
            <div className="text-center py-12">
              <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Approved & Paid Collections</h3>
              <p className="text-gray-600">
                There are no admin-approved and fully paid waste collection requests for today.
                <br />
                Only requests that are both approved by admin AND paid by customers will appear here.
                <br />
                Check back later or contact dispatch for updates.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="h-screen">
          <MapContainer
            center={[6.9271, 79.8612]}
            zoom={13}
            style={{ height: 'calc(100vh - 200px)', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {routeData.bins
              .filter(bin => bin.wasteRequest && bin.location)
              .map((bin) => (
              <Marker
                key={bin.binId}
                position={[
                  bin.location?.coordinates?.lat || bin.binData?.location?.coordinates?.lat || 0,
                  bin.location?.coordinates?.lng || bin.binData?.location?.coordinates?.lng || 0
                ]}
                icon={getBinIcon(bin)}
                eventHandlers={{
                  click: () => setSelectedBin(bin)
                }}
              >
                <Popup>
                  <div className="p-2 max-w-xs">
                    <h4 className="font-semibold">{bin.binId}</h4>
                    <p className="text-sm text-gray-600">{bin.location?.address || bin.binData?.location?.address}</p>
                    
                    {bin.customerInfo && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <p><strong>Customer:</strong> {bin.customerInfo.name}</p>
                        <p><strong>Type:</strong> {bin.customerInfo.collectionType}</p>
                        <p><strong>Amount:</strong> ${bin.customerInfo.cost}</p>
                      </div>
                    )}
                    
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">Fill Level: {bin.fillLevel || bin.binData?.fillLevel}%</p>
                      <p className="text-sm">Battery: {bin.battery || bin.binData?.battery}%</p>
                      <p className="text-sm">Status: {bin.collectionStatus || 'pending'}</p>
                      <p className="text-sm">Sequence: #{bin.sequence}</p>
                    </div>
                    
                    {bin.collectionStatus !== 'collected' && (
                      <div className="mt-2 flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBin(bin);
                            setShowScanner(true);
                          }}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                          Collect
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBin(bin);
                            setShowIssueReport(true);
                          }}
                          className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700"
                        >
                          Issue
                        </button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Scanner Modal - Enhanced with customer info */}
      {showScanner && selectedBin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Collecting Bin {selectedBin.binId}
              </h3>
              
              {selectedBin.customerInfo && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4 text-left">
                  <h4 className="font-medium text-blue-900 mb-2">Collection Details</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-blue-700">Customer:</span> {selectedBin.customerInfo.name}</p>
                    <p><span className="text-blue-700">Type:</span> {selectedBin.customerInfo.collectionType}</p>
                    <p><span className="text-blue-700">Request:</span> {selectedBin.customerInfo.requestId}</p>
                    <p><span className="text-blue-700">Amount:</span> ${selectedBin.customerInfo.cost}</p>
                  </div>
                </div>
              )}
              
              <div className="relative mb-6">
                <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                  {scanning ? (
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600"></div>
                  ) : (
                    <Camera className="h-16 w-16 text-gray-400" />
                  )}
                </div>
                {scanning && (
                  <div className="absolute inset-0 border-2 border-green-600 rounded-lg animate-pulse"></div>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                {scanning ? 'Scanning QR code...' : 'Position the QR code within the frame'}
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowScanner(false)}
                  disabled={scanning}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={simulateQRScan}
                  disabled={scanning}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {scanning ? 'Scanning...' : 'Scan Now'}
                </button>
              </div>
              
              <button
                onClick={() => {
                  setShowScanner(false);
                  setShowManualEntry(true);
                }}
                className="w-full mt-3 text-sm text-green-600 hover:text-green-700"
              >
                Enter Bin ID manually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Manual Bin Entry
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bin ID
                </label>
                <input
                  type="text"
                  value={manualBinId}
                  onChange={(e) => setManualBinId(e.target.value.toUpperCase())}
                  placeholder="Enter Bin ID (e.g., BIN-001)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowManualEntry(false);
                    setManualBinId('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualEntry}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirm Collection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Report Modal */}
      {showIssueReport && selectedBin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Report Issue - {selectedBin.binId}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Type
                  </label>
                  <select
                    value={issueForm.type}
                    onChange={(e) => setIssueForm({ ...issueForm, type: e.target.value as typeof issueForm.type })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select issue type</option>
                    <option value="damaged_bin">Damaged Bin</option>
                    <option value="blocked_access">Blocked Access</option>
                    <option value="qr_damaged">QR Code Damaged</option>
                    <option value="overflow">Overflow</option>
                    <option value="hazardous_material">Hazardous Material</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={issueForm.description}
                    onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                    rows={3}
                    placeholder="Describe the issue..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={issueForm.requiresAdmin}
                      onChange={(e) => setIssueForm({ ...issueForm, requiresAdmin: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Requires admin attention
                    </span>
                  </label>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowIssueReport(false);
                    setSelectedBin(null);
                    setIssueForm({ type: '', description: '', requiresAdmin: false });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={reportIssue}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Report Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Quick Actions Bar */}
      <div className="fixed bottom-4 left-4 right-4">
        <div className="bg-white rounded-lg shadow-lg border p-3">
          <div className="flex justify-between items-center">
            <div className="text-sm">
              <p className="font-medium text-gray-900">
                {routeData.completedBins}/{routeData.totalBins} Collections Complete
              </p>
              <p className="text-gray-600">
                {routeData.totalBins - routeData.completedBins} remaining • 
                {routeData.bins.filter(b => b.wasteRequest).length} approved requests
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowManualEntry(true)}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                title="Manual Entry"
              >
                <Navigation className="h-5 w-5" />
              </button>
              <button
                onClick={fetchRouteData}
                className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                title="Refresh"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformCollectionPage;
