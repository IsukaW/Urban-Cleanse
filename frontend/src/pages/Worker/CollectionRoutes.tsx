import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Calendar,
  Navigation,
  Package,
  Mail
} from 'lucide-react';
import { routeAPI } from '../../services/route/api';
import type { Route } from '../../services/route/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { getCurrentDate, formatDateForDisplay } from '../../utils/dateUtils';

const CollectionRoutes: React.FC = () => {
  const { user } = useAuth();
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());

  useEffect(() => {
    if (user) {
      loadRoute();
    }
  }, [user, selectedDate]);

  const loadRoute = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await routeAPI.getRoutes({
        date: selectedDate,
        collectorId: user._id,
        status: 'assigned,in_progress'
      });
      
      console.log('Worker routes response:', response);
      const routes = response.data.routes || [];
      console.log('Filtered routes for worker:', routes);
      setRoute(routes.length > 0 ? routes[0] : null);
    } catch (error: any) {
      console.error('Error loading route:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getBinStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Collection Routes</h1>
        <p className="text-gray-600">View and manage your assigned collection routes</p>
      </div>

      {/* Date Selection */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading your route...</span>
        </div>
      ) : !route ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Route Assigned</h3>
          <p className="text-gray-500">
            You don't have any collection route assigned for {formatDateForDisplay(selectedDate)}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Route Overview */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Route Overview</h2>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(route.status)}`}>
                {getStatusIcon(route.status)}
                <span className="ml-1 capitalize">{route.status.replace('_', ' ')}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Area</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{route.area}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Package className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Progress</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {route.completedBins}/{route.totalBins} bins
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${route.totalBins > 0 ? (route.completedBins / route.totalBins) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Clock className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Duration</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">~{route.estimatedDuration} min</p>
                {route.actualDuration && (
                  <p className="text-sm text-gray-500">Actual: {route.actualDuration} min</p>
                )}
              </div>
            </div>

            {route.notes && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Route Notes</h4>
                <p className="text-blue-800">{route.notes}</p>
              </div>
            )}
          </div>

          {/* Collection Tasks */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Collection Tasks</h3>
              <p className="text-sm text-gray-600 mt-1">
                Complete collections in the order listed for optimal routing
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {route.bins.map((bin) => (
                <div key={bin.binId} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        bin.status === 'completed' ? 'bg-green-600 text-white' :
                        bin.status === 'in_progress' ? 'bg-yellow-600 text-white' :
                        'bg-gray-300 text-gray-600'
                      }`}>
                        {bin.sequence}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{bin.binId}</h4>
                          {bin.priority !== 'normal' && (
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(bin.priority)}`}>
                              {bin.priority}
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Customer:</strong> {bin.customerInfo.name}</p>
                          <p><strong>Type:</strong> {bin.customerInfo.collectionType}</p>
                          <p><strong>Cost:</strong> ${bin.customerInfo.cost}</p>
                          {bin.estimatedTime && (
                            <p className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              Estimated: {bin.estimatedTime} minutes
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getBinStatusColor(bin.status)}`}>
                        {bin.status.replace('_', ' ')}
                      </span>
                      
                      {bin.status === 'pending' && (
                        <a
                          href={`/worker/perform-collection?binId=${bin.binId}&routeId=${route.routeId}`}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Start Collection
                        </a>
                      )}
                      
                      {bin.completedAt && (
                        <p className="text-xs text-gray-500">
                          Completed: {new Date(bin.completedAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Customer Contact Information */}
                  <div className="bg-gray-50 rounded-lg p-3 mt-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Mail className="w-4 h-4 mr-1" />
                        {bin.customerInfo.email || 'No email provided'}
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <Navigation className="w-4 h-4 mr-1" />
                        <span>Navigate to location</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {route.bins.length === 0 && (
              <div className="p-8 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Collections Assigned</h3>
                <p className="text-gray-500">This route doesn't have any collection tasks assigned yet.</p>
              </div>
            )}
          </div>

          {/* Route Actions */}
          {route.status === 'assigned' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Actions</h3>
              <div className="flex space-x-4">
                <button
                  onClick={async () => {
                    try {
                      await routeAPI.updateRouteStatus(route._id, 'in_progress', 'Route started by worker');
                      toast.success('Route started successfully!');
                      loadRoute(); // Refresh the route data
                    } catch (error: any) {
                      console.error('Error starting route:', error);
                      toast.error('Failed to start route: ' + (error.message || 'Unknown error'));
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Route
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionRoutes;