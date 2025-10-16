import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  MapPin, 
  Battery, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Filter,
  Eye,
  RefreshCw,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import userBinService from '../../services/admin/userBinService';
import type { UserBinData } from '../../services/admin/userBinService';

// Types
interface UserBin {
  _id: string;
  binId: string;
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
    area: string;
  };
  capacity: number;
  type: string;
  fillLevel: number;
  battery: number;
  status?: 'Empty' | 'Half-Full' | 'Full' | 'Overflow';
  isActive: boolean;
  approvedBy?: { _id: string; name: string };
  approvedAt?: string;
  rejectedBy?: { _id: string; name: string };
  rejectedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface SelectedBin extends UserBin {
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

const UserBinManagement: React.FC = () => {
  const [userBinData, setUserBinData] = useState<UserBinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'rejected'>('all');
  const [selectedBin, setSelectedBin] = useState<SelectedBin | null>(null);
  const [showBinDetails, setShowBinDetails] = useState(false);

  useEffect(() => {
    fetchUserBinData();
  }, []);

  const fetchUserBinData = async () => {
    try {
      setLoading(true);
      const response = await userBinService.getUserBinData();
      if (response.success) {
        setUserBinData(response.data);
      } else {
        toast.error('Failed to fetch user bin data');
      }
    } catch (error) {
      console.error('Error fetching user bin data:', error);
      toast.error('Failed to fetch user bin data');
      // Fallback to mock data for demo
      const mockData: UserBinData[] = [
        {
          user: {
            _id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890'
          },
          bins: [
            {
              _id: 'bin1',
              binId: 'BIN-001',
              location: {
                address: '123 Main St, Colombo',
                coordinates: { lat: 6.9271, lng: 79.8612 },
                area: 'Colombo 01'
              },
              capacity: 100,
              type: 'food',
              fillLevel: 85,
              battery: 75,
              status: 'Full',
              isActive: true,
              approvedBy: { _id: 'admin1', name: 'Admin User' },
              approvedAt: '2024-01-15T10:30:00Z',
              createdAt: '2024-01-10T08:00:00Z',
              updatedAt: '2024-01-16T12:00:00Z'
            }
          ],
          totalBins: 3,
          activeBins: 2,
          pendingBins: 1,
          rejectedBins: 0
        }
      ];
      setUserBinData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'Empty': return 'text-green-600 bg-green-100';
      case 'Half-Full': return 'text-yellow-600 bg-yellow-100';
      case 'Full': return 'text-orange-600 bg-orange-100';
      case 'Overflow': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
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

  const getBatteryColor = (level: number) => {
    if (level >= 70) return 'text-green-600';
    if (level >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredUsers = userBinData.filter(userData => {
    const matchesSearch = userData.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userData.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (filterStatus) {
      case 'active':
        return userData.activeBins > 0;
      case 'pending':
        return userData.pendingBins > 0;
      case 'rejected':
        return userData.rejectedBins > 0;
      default:
        return true;
    }
  });

  const openBinDetails = (bin: any, user: UserBinData['user']) => {
    setSelectedBin({ ...bin, user });
    setShowBinDetails(true);
  };

  const getApprovalStatus = (bin: any) => {
    if (bin.isActive && bin.approvedBy) {
      return {
        status: 'Approved',
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
        color: 'text-green-800 bg-green-100'
      };
    } else if (bin.rejectedBy) {
      return {
        status: 'Rejected',
        icon: <XCircle className="h-4 w-4 text-red-600" />,
        color: 'text-red-800 bg-red-100'
      };
    } else {
      return {
        status: 'Pending',
        icon: <Clock className="h-4 w-4 text-yellow-600" />,
        color: 'text-yellow-800 bg-yellow-100'
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
          <span className="text-gray-500">Loading user bin data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="h-6 w-6 mr-2 text-blue-600" />
              User Bin Management
            </h1>
            <p className="text-gray-600 mt-1">View and manage all user-registered bins</p>
          </div>
          <button
            onClick={fetchUserBinData}
            className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by user name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="active">Has Active Bins</option>
              <option value="pending">Has Pending Bins</option>
              <option value="rejected">Has Rejected Bins</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Cards */}
      <div className="grid gap-6">
        {filteredUsers.map((userData) => (
          <div key={userData.user._id} className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* User Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{userData.user.name}</h3>
                    <p className="text-gray-600">{userData.user.email}</p>
                    {userData.user.phone && (
                      <p className="text-sm text-gray-500">{userData.user.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{userData.totalBins}</div>
                    <div className="text-gray-500">Total</div>
                  </div>
                  {userData.activeBins > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{userData.activeBins}</div>
                      <div className="text-gray-500">Active</div>
                    </div>
                  )}
                  {userData.pendingBins > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{userData.pendingBins}</div>
                      <div className="text-gray-500">Pending</div>
                    </div>
                  )}
                  {userData.rejectedBins > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{userData.rejectedBins}</div>
                      <div className="text-gray-500">Rejected</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* User's Bins */}
            <div className="p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Registered Bins ({userData.bins.length})
              </h4>
              
              {userData.bins.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {userData.bins.map((bin) => {
                    const approvalStatus = getApprovalStatus(bin);
                    return (
                      <div key={bin._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-gray-900">{bin.binId}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${approvalStatus.color} flex items-center space-x-1`}>
                            {approvalStatus.icon}
                            <span>{approvalStatus.status}</span>
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center text-gray-600">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate">{bin.location.address}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBinTypeColor(bin.type)}`}>
                              {bin.type.charAt(0).toUpperCase() + bin.type.slice(1)}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(bin.status)}`}>
                                {bin.status || 'Empty'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <Battery className="h-3 w-3" />
                              <span className={`text-xs font-medium ${getBatteryColor(bin.battery)}`}>
                                {bin.battery}%
                              </span>
                            </div>
                            <button
                              onClick={() => openBinDetails(bin, userData.user)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center space-x-1"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No bins registered by this user</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search criteria' : 'No users have registered bins yet'}
          </p>
        </div>
      )}

      {/* Bin Details Modal */}
      {showBinDetails && selectedBin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Bin Details</h3>
                <button
                  onClick={() => setShowBinDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Owner Info */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Owner Information</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-medium">{selectedBin.user.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium">{selectedBin.user.email}</p>
                    </div>
                    {selectedBin.user.phone && (
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <p className="font-medium">{selectedBin.user.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bin Info */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Bin Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600">Bin ID:</span>
                    <p className="font-medium">{selectedBin.binId}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ml-2 ${getBinTypeColor(selectedBin.type)}`}>
                      {selectedBin.type.charAt(0).toUpperCase() + selectedBin.type.slice(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ml-2 ${getStatusColor(selectedBin.status)}`}>
                      {selectedBin.status || 'Empty'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Battery:</span>
                    <p className={`font-medium ${getBatteryColor(selectedBin.battery)}`}>
                      {selectedBin.battery}%
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Capacity:</span>
                    <p className="font-medium">{selectedBin.capacity}L</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Location</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-600 mt-1" />
                    <div>
                      <p className="font-medium">{selectedBin.location.address}</p>
                      <p className="text-sm text-gray-600">Area: {selectedBin.location.area}</p>
                      <p className="text-sm text-gray-600">
                        Coordinates: {selectedBin.location.coordinates.lat.toFixed(6)}, {selectedBin.location.coordinates.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval Status */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Approval Status</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedBin.approvedBy ? (
                    <div className="flex items-center space-x-2 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <span>Approved by {selectedBin.approvedBy.name}</span>
                      {selectedBin.approvedAt && (
                        <span className="text-sm text-gray-600">
                          on {new Date(selectedBin.approvedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : selectedBin.rejectedBy ? (
                    <div className="flex items-center space-x-2 text-red-700">
                      <XCircle className="h-4 w-4" />
                      <span>Rejected by {selectedBin.rejectedBy.name}</span>
                      {selectedBin.rejectedAt && (
                        <span className="text-sm text-gray-600">
                          on {new Date(selectedBin.rejectedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-yellow-700">
                      <Clock className="h-4 w-4" />
                      <span>Pending approval</span>
                    </div>
                  )}
                  
                  {selectedBin.notes && (
                    <div className="mt-3">
                      <span className="text-gray-600">Notes:</span>
                      <p className="text-sm mt-1 p-2 bg-white rounded border">{selectedBin.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-600">Created:</span>
                    <span>{new Date(selectedBin.createdAt).toLocaleDateString()} at {new Date(selectedBin.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-600">Last Updated:</span>
                    <span>{new Date(selectedBin.updatedAt).toLocaleDateString()} at {new Date(selectedBin.updatedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowBinDetails(false)}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBinManagement;