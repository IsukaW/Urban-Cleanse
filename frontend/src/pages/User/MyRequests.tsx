import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import wasteService from '../../services/waste/api';
import type { WasteRequest } from '../../services/waste/type';
import { 
  FileText, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';

const MyRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<WasteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WasteRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    collectionType: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRequestForPayment, setSelectedRequestForPayment] = useState<WasteRequest | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [pagination.page, filters]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      };

      const response = await wasteService.getUserRequests(params);
      if (response.success) {
        setRequests(response.data.requests);
        setPagination(prev => ({
          ...prev,
          total: response.total,
          pages: response.pages
        }));
      }
    } catch (error: any) {
      toast.error('Failed to fetch your requests');
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCollectionTypeDisplay = (type: string) => {
    switch (type) {
      case 'food':
        return 'Food Waste';
      case 'polythene':
        return 'Polythene Waste';
      case 'paper':
        return 'Paper Waste';
      case 'hazardous':
        return 'Hazardous Waste';
      case 'ewaste':
        return 'E-Waste';
      default:
        return type;
    }
  };

  const handleViewDetails = (request: WasteRequest) => {
    setSelectedRequest(request);
    setShowDetails(true);
  };

  const handlePayment = async (paymentMethod: string, cardNumber?: string) => {
    if (!selectedRequestForPayment) return;

    setPaymentLoading(true);
    try {
      const response = await wasteService.processPayment({
        requestId: selectedRequestForPayment.requestId,
        paymentMethod,
        cardNumber
      });

      if (response.success) {
        toast.success('Payment processed successfully!');
        
        // Update the request in local state
        setRequests(prev => prev.map(req => 
          req.requestId === selectedRequestForPayment.requestId 
            ? { ...req, paymentStatus: 'paid' }
            : req
        ));

        setShowPaymentModal(false);
        setSelectedRequestForPayment(null);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      
      if (error.message?.includes('failed')) {
        toast.error('Payment failed. Please check your details and try again.');
      } else {
        toast.error(error.message || 'Payment processing failed');
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = !filters.search || 
      request.requestId.toLowerCase().includes(filters.search.toLowerCase()) ||
      request.collectionType.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesType = !filters.collectionType || request.collectionType === filters.collectionType;
    
    return matchesSearch && matchesType;
  });

  const RequestDetailsModal: React.FC = () => {
    if (!selectedRequest) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Request Details</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedRequest.requestId}</p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status and Payment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedRequest.status)}`}>
                    {getStatusIcon(selectedRequest.status)}
                    <span className="ml-2 capitalize">{selectedRequest.status}</span>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Payment Status</h4>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(selectedRequest.paymentStatus)}`}>
                    <CreditCard className="h-4 w-4 mr-1" />
                    <span className="capitalize">{selectedRequest.paymentStatus}</span>
                  </div>
                </div>
              </div>

              {/* Request Information */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Collection Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Collection Type</p>
                    <p className="font-medium">{getCollectionTypeDisplay(selectedRequest.collectionType)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Preferred Date</p>
                    <p className="font-medium">
                      {new Date(selectedRequest.preferredDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bin ID</p>
                    <p className="font-medium">{selectedRequest.binId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cost</p>
                    <p className="font-medium text-green-600">${selectedRequest.cost}</p>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              {selectedRequest.address && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Address Information</h4>
                  <div className="space-y-2">
                    {selectedRequest.address.street && (
                      <p><span className="text-gray-600">Street:</span> {selectedRequest.address.street}</p>
                    )}
                    {selectedRequest.address.city && (
                      <p><span className="text-gray-600">City:</span> {selectedRequest.address.city}</p>
                    )}
                    {selectedRequest.address.postalCode && (
                      <p><span className="text-gray-600">Postal Code:</span> {selectedRequest.address.postalCode}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Location Information */}
              {selectedRequest.location && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Location Details</h4>
                  <div className="space-y-2">
                    {selectedRequest.location.address && (
                      <p><span className="text-gray-600">Address:</span> {selectedRequest.location.address}</p>
                    )}
                    <p><span className="text-gray-600">Coordinates:</span> {selectedRequest.location.latitude?.toFixed(6)}, {selectedRequest.location.longitude?.toFixed(6)}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRequest.notes && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
                  <p className="text-gray-700">{selectedRequest.notes}</p>
                </div>
              )}

              {/* Timeline */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Timeline</h4>
                <div className="space-y-2">
                  <p><span className="text-gray-600">Created:</span> {new Date(selectedRequest.createdAt).toLocaleString()}</p>
                  <p><span className="text-gray-600">Last Updated:</span> {new Date(selectedRequest.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetails(false)}
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

  const PaymentModal: React.FC = () => {
    if (!selectedRequestForPayment) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Complete Payment
            </h3>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Request ID:</span>
                  <span className="font-medium">{selectedRequestForPayment.requestId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Collection Type:</span>
                  <span className="font-medium capitalize">{selectedRequestForPayment.collectionType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-green-600">${selectedRequestForPayment.cost}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => handlePayment('credit_card')}
                disabled={paymentLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {paymentLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay with Credit Card
                  </>
                )}
              </button>

              <button
                onClick={() => handlePayment('debit_card')}
                disabled={paymentLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay with Debit Card
              </button>

              <button
                onClick={() => handlePayment('digital_wallet')}
                disabled={paymentLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay with Digital Wallet
              </button>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedRequestForPayment(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Collection Requests</h1>
            <p className="text-gray-600 mt-1">Track and manage your waste collection requests</p>
          </div>
          <button
            onClick={fetchRequests}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Filter
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection Type
            </label>
            <select
              value={filters.collectionType}
              onChange={(e) => setFilters({ ...filters, collectionType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">All Types</option>
              <option value="food">Food Waste</option>
              <option value="polythene">Polythene Waste</option>
              <option value="paper">Paper Waste</option>
              <option value="hazardous">Hazardous Waste</option>
              <option value="ewaste">E-Waste</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search by request ID or collection type..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Total Requests</p>
                <p className="text-2xl font-bold text-blue-900">{pagination.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {requests.filter(r => r.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Completed</p>
                <p className="text-2xl font-bold text-green-900">
                  {requests.filter(r => r.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Total Spent</p>
                <p className="text-2xl font-bold text-purple-900">
                  ${requests.filter(r => r.paymentStatus === 'paid').reduce((sum, r) => sum + r.cost, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Requests Grid */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600">
              {filters.status || filters.search || filters.collectionType
                ? 'Try adjusting your filters to see more requests.' 
                : 'You haven\'t made any collection requests yet.'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((request) => (
              <div key={request._id} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {request.requestId}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Created on {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1 capitalize">{request.status}</span>
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(request.paymentStatus)}`}>
                      <CreditCard className="h-4 w-4 mr-1" />
                      {request.paymentStatus}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Collection Type</p>
                      <p className="text-sm text-gray-600">{getCollectionTypeDisplay(request.collectionType)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Preferred Date</p>
                      <p className="text-sm text-gray-600">
                        {new Date(request.preferredDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Bin ID</p>
                      <p className="text-sm text-gray-600">{request.binId}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Cost</p>
                      <p className="text-sm text-gray-600 font-semibold text-green-600">
                        ${request.cost}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => handleViewDetails(request)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </button>
                  
                  {request.paymentStatus === 'pending' && (
                    <button
                      onClick={() => {
                        setSelectedRequestForPayment(request);
                        setShowPaymentModal(true);
                      }}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay Now
                    </button>
                  )}
                  
                  {request.paymentStatus === 'failed' && (
                    <button
                      onClick={() => {
                        setSelectedRequestForPayment(request);
                        setShowPaymentModal(true);
                      }}
                      className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Retry Payment
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showDetails && <RequestDetailsModal />}
      {showPaymentModal && <PaymentModal />}
    </div>
  );
};

export default MyRequests;
