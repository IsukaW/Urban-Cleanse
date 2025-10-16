import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import binService from '../../services/bin/api';
import toast from 'react-hot-toast';
import {
  Trash2,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Calendar,
  Package,
  Navigation,
  Plus,
  Edit,
  Battery,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface UserBin {
  _id: string;
  binId: string;
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    area: string;
  };
  capacity: number;
  type: string;
  fillLevel: number;
  battery: number;
  status?: 'Empty' | 'Half-Full' | 'Full' | 'Overflow';
  isActive: boolean;
  registeredBy: {
    _id: string;
    name: string;
    email: string;
  };
  approvedBy?: {
    _id: string;
    name: string;
  };
  approvedAt?: string;
  rejectedBy?: {
    _id: string;
    name: string;
  };
  rejectedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const MyBins: React.FC = () => {
  const { user } = useAuth();
  const [bins, setBins] = useState<UserBin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBin, setSelectedBin] = useState<UserBin | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Update functionality states
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateBin, setUpdateBin] = useState<UserBin | null>(null);
  const [updateData, setUpdateData] = useState<{
    status: 'Empty' | 'Half-Full' | 'Full' | 'Overflow';
    battery: number;
  }>({
    status: 'Empty',
    battery: 100
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserBins();
    }
  }, [user]);

  const fetchUserBins = async () => {
    try {
      setLoading(true);
      console.log('Fetching user bins...');
      
      const response = await binService.getUserRegisteredBins();
      console.log('User bins response:', response);
      
      if (response.success) {
        setBins(response.data.bins);
        console.log(`Loaded ${response.data.bins.length} user bins`);
      }
    } catch (error: any) {
      console.error('Error fetching user bins:', error);
      toast.error('Failed to load your registered bins');
    } finally {
      setLoading(false);
    }
  };

  const openDetailsModal = (bin: UserBin) => {
    setSelectedBin(bin);
    setShowDetailsModal(true);
  };

  const handleUpdateBin = (bin: UserBin) => {
    setUpdateBin(bin);
    setUpdateData({
      status: bin.status || 'Empty',
      battery: bin.battery
    });
    setShowUpdateModal(true);
  };

  const handleUpdateSubmit = async () => {
    if (!updateBin) return;

    try {
      setUpdateLoading(true);
      
      const response = await binService.updateUserBinData(updateBin._id, updateData);
      
      if (response.success) {
        toast.success('Bin data updated successfully!');
        
        // Update the bin in the local state
        setBins(prevBins => 
          prevBins.map(bin => 
            bin._id === updateBin._id 
              ? { ...bin, status: updateData.status, battery: updateData.battery }
              : bin
          )
        );
        
        setShowUpdateModal(false);
        setUpdateBin(null);
      }
    } catch (error: any) {
      console.error('Error updating bin data:', error);
      toast.error(error.message || 'Failed to update bin data');
    } finally {
      setUpdateLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBinTypeColor = (type: string) => {
    switch (type) {
      case 'food':
        return 'bg-green-100 text-green-800';
      case 'polythene':
        return 'bg-blue-100 text-blue-800';
      case 'paper':
        return 'bg-yellow-100 text-yellow-800';
      case 'hazardous':
        return 'bg-red-100 text-red-800';
      case 'ewaste':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusInfo = (bin: UserBin) => {
    if (bin.isActive && bin.approvedBy) {
      return {
        status: 'Approved',
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        description: 'Your bin is approved and active for collection requests'
      };
    } else if (bin.rejectedBy) {
      return {
        status: 'Rejected',
        icon: <XCircle className="h-5 w-5 text-red-600" />,
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        description: 'Your bin registration was rejected by admin'
      };
    } else {
      return {
        status: 'Pending Approval',
        icon: <Clock className="h-5 w-5 text-yellow-600" />,
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        description: 'Your bin registration is pending admin approval'
      };
    }
  };

  const getBatteryColor = (level: number) => {
    if (level >= 70) return 'text-green-600';
    if (level >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'Empty': return 'text-green-600';
      case 'Half-Full': return 'text-yellow-600';
      case 'Full': return 'text-orange-600';
      case 'Overflow': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Group bins by status
  const approvedBins = bins.filter(bin => bin.isActive && bin.approvedBy);
  const pendingBins = bins.filter(bin => !bin.isActive && !bin.approvedBy && !bin.rejectedBy);
  const rejectedBins = bins.filter(bin => bin.rejectedBy);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Trash2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Registered Bins</h1>
              <p className="text-gray-600">View and manage your bin registrations</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchUserBins}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              to="/register-bin"
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Register New Bin
            </Link>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
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
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{approvedBins.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingBins.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{rejectedBins.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your registered bins...</p>
        </div>
      ) : bins.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Bins Registered</h3>
          <p className="text-gray-600 mb-6">
            You haven't registered any bins yet. Register your first bin to start using our waste collection services.
          </p>
          <Link
            to="/register-bin"
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Register Your First Bin
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Registered Bins</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your bin registrations and view their approval status
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bin Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monitoring
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bins.map((bin) => {
                  const statusInfo = getStatusInfo(bin);
                  return (
                    <tr key={bin._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-gray-100 p-2 rounded-lg">
                            <Trash2 className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {bin.binId}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBinTypeColor(bin.type)}`}>
                                {bin.type}
                              </span>
                              <span className="text-xs text-gray-500">
                                {bin.capacity}L
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          <div className="flex items-start space-x-1">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium truncate">{bin.location.address}</p>
                              <p className="text-gray-500">{bin.location.area}</p>
                              <p className="text-xs text-gray-400">
                                {bin.location.coordinates.lat.toFixed(4)}, {bin.location.coordinates.lng.toFixed(4)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                          {statusInfo.icon}
                          <span className="ml-2 font-medium">{statusInfo.status}</span>
                        </div>
                        {bin.approvedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Approved: {formatDate(bin.approvedAt)}
                          </p>
                        )}
                        {bin.rejectedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Rejected: {formatDate(bin.rejectedAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {bin.isActive ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">Status:</span>
                              <span className={`text-xs font-medium ${getStatusColor(bin.status)}`}>
                                {bin.status || 'Empty'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">Battery:</span>
                              <span className={`text-xs font-medium ${getBatteryColor(bin.battery)}`}>
                                {bin.battery}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not active</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(bin.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openDetailsModal(bin)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {bin.isActive && (
                            <>
                              <button
                                onClick={() => handleUpdateBin(bin)}
                                className="text-green-600 hover:text-green-900 p-1 rounded"
                                title="Update Fill & Battery Level"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <Link
                                to="/request-collection"
                                className="text-purple-600 hover:text-purple-900 p-1 rounded"
                                title="Request Collection"
                              >
                                <Navigation className="h-4 w-4" />
                              </Link>
                            </>
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

      {/* Details Modal */}
      {showDetailsModal && selectedBin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Bin Registration Details
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Info */}
              <div className={`p-4 rounded-lg ${getStatusInfo(selectedBin).bgColor}`}>
                <div className="flex items-center space-x-2 mb-2">
                  {getStatusInfo(selectedBin).icon}
                  <h4 className={`font-medium ${getStatusInfo(selectedBin).textColor}`}>
                    {getStatusInfo(selectedBin).status}
                  </h4>
                </div>
                <p className={`text-sm ${getStatusInfo(selectedBin).textColor}`}>
                  {getStatusInfo(selectedBin).description}
                </p>
              </div>

              {/* Bin Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Bin Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Bin ID:</span>
                    <p className="font-medium">{selectedBin.binId}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <p className="font-medium capitalize">{selectedBin.type}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Capacity:</span>
                    <p className="font-medium">{selectedBin.capacity} Liters</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Registration Date:</span>
                    <p className="font-medium">{formatDate(selectedBin.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Location Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Address:</span>
                    <p className="font-medium">{selectedBin.location.address}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Area:</span>
                    <p className="font-medium">{selectedBin.location.area}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Coordinates:</span>
                    <p className="font-medium">
                      {selectedBin.location.coordinates.lat.toFixed(6)}, {selectedBin.location.coordinates.lng.toFixed(6)}
                    </p>
                  </div>
                </div>

                {/* Map Preview */}
                <div className="mt-4">
                  <div className="h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                    <iframe
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedBin.location.coordinates.lng-0.01},${selectedBin.location.coordinates.lat-0.01},${selectedBin.location.coordinates.lng+0.01},${selectedBin.location.coordinates.lat+0.01}&layer=mapnik&marker=${selectedBin.location.coordinates.lat},${selectedBin.location.coordinates.lng}`}
                      className="w-full h-full rounded-lg"
                      frameBorder="0"
                      scrolling="no"
                      title="Bin Location"
                    />
                  </div>
                </div>
              </div>

              {/* Monitoring Data (if active) */}
              {selectedBin.isActive && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Live Monitoring</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p className={`font-medium text-lg ${getStatusColor(selectedBin.status)}`}>
                        {selectedBin.status || 'Empty'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Battery Level:</span>
                      <p className={`font-medium text-lg ${getBatteryColor(selectedBin.battery)}`}>
                        {selectedBin.battery}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Notes (if any) */}
              {selectedBin.notes && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-900 mb-2">Admin Notes</h4>
                  <p className="text-sm text-yellow-800">{selectedBin.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
                {selectedBin.isActive && (
                  <Link
                    to="/request-collection"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Request Collection
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && updateBin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Update Bin Data
                </h3>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Bin Info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Trash2 className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">{updateBin.binId}</p>
                    <p className="text-sm text-gray-600">{updateBin.location.address}</p>
                  </div>
                </div>
              </div>

              {/* Fill Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <BarChart3 className="h-4 w-4 inline mr-1" />
                  Status
                </label>
                <select
                  value={updateData.status}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, status: e.target.value as 'Empty' | 'Half-Full' | 'Full' | 'Overflow' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Empty">Empty</option>
                  <option value="Half-Full">Half-Full</option>
                  <option value="Full">Full</option>
                  <option value="Overflow">Overflow</option>
                </select>
              </div>

              {/* Battery Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Battery className="h-4 w-4 inline mr-1" />
                  Battery Level (%)
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={updateData.battery}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, battery: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span className={`font-medium ${getBatteryColor(updateData.battery)}`}>
                      {updateData.battery}%
                    </span>
                    <span>100%</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={updateData.battery}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, battery: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter battery level"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  disabled={updateLoading}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSubmit}
                  disabled={updateLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center transition-colors"
                >
                  {updateLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Update Bin Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBins;
