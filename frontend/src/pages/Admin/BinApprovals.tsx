import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import binService from '../../services/bin/api';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  User,
  Trash2,
  AlertCircle,
  RefreshCw,
  Eye,
  Clock,
  Navigation
} from 'lucide-react';

interface PendingBin {
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
  isActive: boolean;
  registeredBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

const BinApprovals: React.FC = () => {
  const { user } = useAuth();
  const [pendingBins, setPendingBins] = useState<PendingBin[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingBins, setProcessingBins] = useState<Set<string>>(new Set());
  const [selectedBin, setSelectedBin] = useState<PendingBin | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [binToReject, setBinToReject] = useState<PendingBin | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPendingBins();
    }
  }, [user]);

  const fetchPendingBins = async () => {
    try {
      setLoading(true);
      console.log('Fetching pending bins for admin approval...');
      
      const response = await binService.getPendingBins();
      console.log('Pending bins response:', response);
      
      if (response.success) {
        setPendingBins(response.data.bins);
        console.log(`Loaded ${response.data.bins.length} pending bins`);
      }
    } catch (error: any) {
      console.error('Error fetching pending bins:', error);
      toast.error('Failed to load pending bin registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (binId: string, approved: boolean, notes?: string) => {
    setProcessingBins(prev => new Set(prev).add(binId));
    
    try {
      console.log(`${approved ? 'Approving' : 'Rejecting'} bin:`, binId);
      
      const response = await binService.approveBin(binId, { approved, notes });
      
      if (response.success) {
        toast.success(
          approved 
            ? 'Bin registration approved successfully!' 
            : 'Bin registration rejected.'
        );
        
        // Remove the bin from pending list
        setPendingBins(prev => prev.filter(bin => bin._id !== binId));
        
        // Close modals if they were open for this bin
        if (selectedBin?._id === binId) {
          setShowDetailsModal(false);
          setSelectedBin(null);
        }
        if (binToReject?._id === binId) {
          setShowRejectModal(false);
          setBinToReject(null);
          setRejectNotes('');
        }
      }
    } catch (error: any) {
      console.error('Error processing approval:', error);
      toast.error(error.message || 'Failed to process bin approval');
    } finally {
      setProcessingBins(prev => {
        const newSet = new Set(prev);
        newSet.delete(binId);
        return newSet;
      });
    }
  };

  const openDetailsModal = (bin: PendingBin) => {
    setSelectedBin(bin);
    setShowDetailsModal(true);
  };

  const openRejectModal = (bin: PendingBin) => {
    setBinToReject(bin);
    setShowRejectModal(true);
    setRejectNotes('');
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
    };
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <CheckCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bin Registration Approvals</h1>
              <p className="text-gray-600">Review and approve pending bin registrations</p>
            </div>
          </div>
          <button
            onClick={fetchPendingBins}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{pendingBins.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Trash2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Submissions</p>
              <p className="text-2xl font-bold text-gray-900">{pendingBins.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unique Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(pendingBins.map(bin => bin.registeredBy._id)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Bins List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pending Registrations</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review and approve bin registrations from users
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pending registrations...</p>
          </div>
        ) : pendingBins.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600">No pending bin registrations to review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bin Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingBins.map((bin) => (
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
                          <div className="flex items-center space-x-2">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {bin.registeredBy.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {bin.registeredBy.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {bin.location.address}
                      </div>
                      <div className="text-sm text-gray-500">
                        {bin.location.area}
                      </div>
                      <div className="text-xs text-gray-400">
                        {bin.location.coordinates.lat.toFixed(4)}, {bin.location.coordinates.lng.toFixed(4)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(bin.createdAt)}
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
                        <button
                          onClick={() => handleApproval(bin._id, true)}
                          disabled={processingBins.has(bin._id)}
                          className="text-green-600 hover:text-green-900 p-1 rounded disabled:opacity-50"
                          title="Approve"
                        >
                          {processingBins.has(bin._id) ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openRejectModal(bin)}
                          disabled={processingBins.has(bin._id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded disabled:opacity-50"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedBin && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Bin Registration Details
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
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
                    <span className="text-gray-600">Status:</span>
                    <p className="font-medium">
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                        Pending Approval
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* User Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Registered By</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-medium">{selectedBin.registeredBy.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium">{selectedBin.registeredBy.email}</p>
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

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
                <button
                  onClick={() => openRejectModal(selectedBin)}
                  disabled={processingBins.has(selectedBin._id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Reject Registration
                </button>
                <button
                  onClick={() => handleApproval(selectedBin._id, true)}
                  disabled={processingBins.has(selectedBin._id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {processingBins.has(selectedBin._id) ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 inline animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Approve Registration'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && binToReject && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Reject Registration
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to reject the registration for bin <strong>{binToReject.binId}</strong>?
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for rejection (optional):
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApproval(binToReject._id, false, rejectNotes)}
                  disabled={processingBins.has(binToReject._id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {processingBins.has(binToReject._id) ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 inline animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Rejection'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BinApprovals;
