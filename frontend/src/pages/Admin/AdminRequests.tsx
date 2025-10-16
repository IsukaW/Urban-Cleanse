import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Worker {
  _id: string;
  name: string;
  role: string;
  email: string;
  currentLoad: number;
  availability: string;
}

interface WasteRequest {
  _id: string;
  requestId: string;
  userId: {
    name: string;
    email: string;
  };
  binId: string;
  collectionType: string;
  preferredDate: string;
  status: string;
  cost: number;
  paymentStatus: string;
  notes: string;
  createdAt: string;
  assignedWorker?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  scheduledDate?: string;
}

const AdminRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<WasteRequest[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WasteRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Add notification state
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: Date;
  }>>([]);
  
  // Single unified form state
  const [formData, setFormData] = useState({
    status: '',
    notes: '',
    assignedWorkerId: '',
    scheduledDate: ''
  });

  useEffect(() => {
    fetchRequests();
    fetchWorkers();
    // Check for new requests periodically
    const interval = setInterval(checkForNewRequests, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const addNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const checkForNewRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/waste/admin/requests?status=pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const pendingCount = data.count;
        
        // Check if there are new pending requests
        const currentPendingCount = requests.filter(r => r.status === 'pending').length;
        if (pendingCount > currentPendingCount) {
          const newRequestsCount = pendingCount - currentPendingCount;
          addNotification('info', `${newRequestsCount} new waste collection request(s) received`);
          fetchRequests(); // Refresh the list
        }
      }
    } catch (error) {
      console.error('Error checking for new requests:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/waste/admin/requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched requests with worker data:', data.data.requests); // Debug log
        
        // Debug log each request to check assigned worker
        data.data.requests.forEach((req: WasteRequest) => {
          if (req.assignedWorker) {
            console.log(`Request ${req.requestId} has assigned worker:`, req.assignedWorker);
          } else {
            console.log(`Request ${req.requestId} has no assigned worker`);
          }
        });
        
        setRequests(data.data.requests);
      } else {
        addNotification('error', 'Failed to fetch waste collection requests');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      addNotification('error', 'Failed to fetch bin data. Using cached data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/waste/admin/workers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkers(data.data.workers);
      } else {
        addNotification('warning', 'Failed to fetch worker data');
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
      addNotification('warning', 'Failed to fetch worker data');
    }
  };

  const handleEditRequest = (request: WasteRequest) => {
    setSelectedRequest(request);
    setFormData({
      status: request.status,
      notes: '',
      assignedWorkerId: request.assignedWorker?._id || '',
      scheduledDate: request.scheduledDate ? new Date(request.scheduledDate).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleApproveRequest = (request: WasteRequest) => {
    setSelectedRequest(request);
    setFormData({
      status: 'approved',
      notes: '',
      assignedWorkerId: '',
      scheduledDate: new Date(request.preferredDate).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedRequest) return;

    // Validation for approval
    if (formData.status === 'approved') {
      if (!formData.assignedWorkerId) {
        addNotification('error', 'Please select a worker for approval');
        return;
      }
      if (!formData.scheduledDate) {
        addNotification('error', 'Please select a scheduled date for approval');
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      
      // Prepare the request body
      const requestBody: any = {
        status: formData.status,
        notes: formData.notes
      };
      
      // Only include worker and date for approval
      if (formData.status === 'approved') {
        requestBody.assignedWorkerId = formData.assignedWorkerId;
        requestBody.scheduledDate = formData.scheduledDate;
      }
      
      console.log('Submitting update request with body:', requestBody);
      
      const response = await fetch(`/api/waste/admin/requests/${selectedRequest._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Update response:', result); // Debug log
        
        // Update the local state immediately with the returned data
        if (result.data.wasteRequest) {
          setRequests(prevRequests => 
            prevRequests.map(req => 
              req._id === selectedRequest._id 
                ? result.data.wasteRequest 
                : req
            )
          );
        }
        
        setShowModal(false);
        setSelectedRequest(null);
        
        // Show success notification based on action
        if (formData.status === 'approved') {
          const assignedWorker = workers.find(w => w._id === formData.assignedWorkerId);
          addNotification('success', `Request ${selectedRequest.requestId} approved and assigned to ${assignedWorker?.name || 'worker'} successfully!`);
        } else if (formData.status === 'cancelled') {
          addNotification('warning', `Request ${selectedRequest.requestId} has been cancelled`);
        } else {
          addNotification('success', `Request ${selectedRequest.requestId} updated successfully!`);
        }
        
        // Also refresh the list after a short delay to ensure consistency
        setTimeout(() => {
          fetchRequests();
        }, 1000);
      } else {
        const error = await response.json();
        addNotification('error', `Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating request:', error);
      addNotification('error', 'Failed to update request');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setFormData({
      status: '',
      notes: '',
      assignedWorkerId: '',
      scheduledDate: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 border-green-400 text-green-700';
      case 'error': return 'bg-red-100 border-red-400 text-red-700';
      case 'warning': return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      case 'info': return 'bg-blue-100 border-blue-400 text-blue-700';
      default: return 'bg-gray-100 border-gray-400 text-gray-700';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6">
      {/* Notification Area */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`max-w-sm rounded-md border-l-4 p-4 shadow-lg ${getNotificationColor(notification.type)} animate-slide-in-right`}
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{notification.message}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                    className="text-sm opacity-50 hover:opacity-75"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Waste Collection Requests</h1>
        <p className="text-gray-600">Manage and approve waste collection requests</p>
        
        {/* Request Statistics */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">
              {requests.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending Requests</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">
              {requests.filter(r => r.status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">
              {requests.filter(r => r.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-orange-600">
              {requests.filter(r => r.paymentStatus === 'paid').length}
            </div>
            <div className="text-sm text-gray-600">Paid Requests</div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collection Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preferred Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Worker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {request.requestId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{request.userId.name}</div>
                    <div className="text-sm text-gray-500">{request.userId.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.collectionType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(request.preferredDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${request.cost}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(request.paymentStatus)}`}>
                      {request.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.assignedWorker ? (
                      <div>
                        <div className="font-medium text-gray-900">
                          {request.assignedWorker.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {request.assignedWorker.role?.toUpperCase()} • {request.assignedWorker.email}
                        </div>
                        {request.scheduledDate && (
                          <div className="text-xs text-blue-600 mt-1">
                            Scheduled: {new Date(request.scheduledDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {request.status === 'pending' && request.paymentStatus === 'paid' && (
                      <button
                        onClick={() => handleApproveRequest(request)}
                        className="text-green-600 hover:text-green-900 mr-3 px-3 py-1 bg-green-100 rounded-md hover:bg-green-200"
                      >
                        Approve & Assign
                      </button>
                    )}
                    <button
                      onClick={() => handleEditRequest(request)}
                      className="text-blue-600 hover:text-blue-900 px-3 py-1 bg-blue-100 rounded-md hover:bg-blue-200"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Unified Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Update Request: {selectedRequest.requestId}
              </h3>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p><strong>Customer:</strong> {selectedRequest.userId.name}</p>
                <p><strong>Collection Type:</strong> {selectedRequest.collectionType}</p>
                <p><strong>Preferred Date:</strong> {new Date(selectedRequest.preferredDate).toLocaleDateString()}</p>
                <p><strong>Amount:</strong> ${selectedRequest.cost}</p>
                <p><strong>Payment Status:</strong> {selectedRequest.paymentStatus}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Status Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {(formData.status === 'pending' && selectedRequest?.status !== 'pending') && (
                  <p className="text-sm text-blue-600 mt-1">
                    ℹ️ Setting to Pending will clear worker assignment and remove from routes, allowing reassignment
                  </p>
                )}
                {(formData.status === 'cancelled') && (
                  <p className="text-sm text-orange-600 mt-1">
                    ⚠️ Cancelling will clear worker assignment and remove from routes
                  </p>
                )}
              </div>

              {/* Worker Assignment - Show only for approved status */}
              {formData.status === 'approved' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign Worker * <span className="text-red-500">(Required for approval)</span>
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                      {workers.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          No workers available. Please try again later.
                        </div>
                      ) : (
                        workers.map((worker) => (
                          <div
                            key={worker._id}
                            className={`p-3 border rounded cursor-pointer transition-colors ${
                              formData.assignedWorkerId === worker._id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => setFormData({...formData, assignedWorkerId: worker._id})}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-gray-900">{worker.name}</div>
                                <div className="text-sm text-gray-500">
                                  {worker.role.toUpperCase()} • {worker.email}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-xs px-2 py-1 rounded ${
                                  worker.availability === 'available' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {worker.availability}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Load: {worker.currentLoad}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {formData.assignedWorkerId && (
                      <div className="mt-2 text-sm text-green-600">
                        ✓ Selected: {workers.find(w => w._id === formData.assignedWorkerId)?.name}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Scheduled Collection Date * <span className="text-red-500">(Required for approval)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Add any notes about this status change..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Update Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRequests;
