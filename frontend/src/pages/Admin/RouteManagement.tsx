import React, { useState, useEffect } from 'react';
import {
  Users,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Plus,
  Search,
  Eye,
  Trash2,
  BarChart3,
  Shield,
  FileText
} from 'lucide-react';
import { routeAPI } from '../../services/route/api';
import type { Route, RouteStats } from '../../services/route/api';
import RouteCreationModal from '../../components/Admin/RouteCreationModal';
import PDFGenerationModal from '../../components/Admin/PDFGenerationModal';
import ConfirmationModal from '../../components/Common/ConfirmationModal';
import PromptModal from '../../components/Common/PromptModal';
import SimpleNotificationList from '../../components/Common/SimpleNotificationList';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentDate } from '../../utils/dateUtils';

const RouteManagement: React.FC = () => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stats, setStats] = useState<RouteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Additional security check - redirect non-admin users
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access Route Management. This area is restricted to administrators only.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    type: 'warning' | 'error' | 'success' | 'info';
    onConfirm: () => void;
  } | null>(null);
  const [promptModalConfig, setPromptModalConfig] = useState<{
    title: string;
    placeholder: string;
    onSubmit: (value: string) => void;
  } | null>(null);
  
  // Notifications
  const { notifications, addNotification, removeNotification } = useNotifications();
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadRoutes();
    loadStats();
  }, [selectedDate, statusFilter, currentPage]);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const params = {
        date: selectedDate,
        status: statusFilter || undefined,
        page: currentPage,
        limit: itemsPerPage
      };
      
      const response = await routeAPI.getRoutes(params);
      setRoutes(response.data.routes || []);
      setTotalPages(response.pages || 1);
    } catch (error: any) {
      console.error('Error loading routes:', error);
      addNotification('error', error.message || 'Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await routeAPI.getRouteStats(selectedDate);
      setStats(response.data.stats);
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  const handleStatusUpdate = async (route: Route, newStatus: string) => {
    const statusLabels: { [key: string]: string } = {
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'assigned': 'Assigned'
    };

    setConfirmModalConfig({
      title: 'Update Route Status',
      message: `Are you sure you want to change route ${route.routeId} status to ${statusLabels[newStatus] || newStatus}?`,
      type: 'info',
      onConfirm: async () => {
        try {
          await routeAPI.updateRouteStatus(route._id, newStatus);
          addNotification('success', `Route status updated to ${statusLabels[newStatus] || newStatus}`);
          loadRoutes();
          loadStats();
        } catch (error: any) {
          addNotification('error', error.message || 'Failed to update route status');
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleDeleteRoute = async (route: Route) => {
    setConfirmModalConfig({
      title: 'Cancel Route',
      message: `Are you sure you want to cancel route ${route.routeId}? This action cannot be undone.`,
      type: 'warning',
      onConfirm: () => {
        setShowConfirmModal(false);
        setPromptModalConfig({
          title: 'Cancellation Reason',
          placeholder: 'Please provide a reason for cancellation...',
          onSubmit: async (reason: string) => {
            if (!reason.trim()) {
              addNotification('error', 'Please provide a cancellation reason');
              return;
            }
            
            try {
              await routeAPI.deleteRoute(route._id, reason);
              addNotification('success', 'Route cancelled successfully');
              loadRoutes();
              loadStats();
            } catch (error: any) {
              addNotification('error', error.message || 'Failed to cancel route');
            }
            setShowPromptModal(false);
          }
        });
        setShowPromptModal(true);
      }
    });
    setShowConfirmModal(true);
  };

  const filteredRoutes = routes.filter(route => {
    const matchesSearch = !searchTerm || 
      route.routeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.collectorId?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.area.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

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
      default: return <Pause className="w-4 h-4" />;
    }
  };

  const getWorkerTypeLabel = (role: string) => {
    switch (role) {
      case 'wc1': return 'Residential';
      case 'wc2': return 'Commercial';
      case 'wc3': return 'Industrial';
      default: return role;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Route Management</h1>
        <p className="text-gray-600">Create and manage collection routes for workers</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Routes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRoutes}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Workers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalWorkers}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Collections</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedBins}/{stats.totalBins}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search routes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPDFModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Generate PDF
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Route
            </button>
          </div>
        </div>
      </div>

      {/* Routes Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Worker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Area
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Loading routes...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRoutes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No routes found for the selected criteria
                  </td>
                </tr>
              ) : (
                filteredRoutes.map((route) => (
                  <tr key={route._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{route.routeId}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(route.assignedDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {route.collectorId?.name || 'Unassigned'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getWorkerTypeLabel(route.collectorId?.role || '')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{route.area}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(route.status)}`}>
                        {getStatusIcon(route.status)}
                        <span className="ml-1 capitalize">{route.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {route.completedBins}/{route.totalBins} bins
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${route.totalBins > 0 ? (route.completedBins / route.totalBins) * 100 : 0}%`
                          }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {route.estimatedDuration}min est.
                      </div>
                      {route.actualDuration && (
                        <div className="text-sm text-gray-500">
                          {route.actualDuration}min actual
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => addNotification('info', 'Route details modal will be implemented')}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {route.status === 'assigned' && (
                          <button
                            onClick={() => handleStatusUpdate(route, 'in_progress')}
                            className="text-green-600 hover:text-green-900"
                            title="Start Route"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        {route.status === 'in_progress' && (
                          <button
                            onClick={() => handleStatusUpdate(route, 'completed')}
                            className="text-green-600 hover:text-green-900"
                            title="Complete Route"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {['assigned', 'in_progress'].includes(route.status) && (
                          <button
                            onClick={() => handleDeleteRoute(route)}
                            className="text-red-600 hover:text-red-900"
                            title="Cancel Route"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page {currentPage} of {totalPages}
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <RouteCreationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onRouteCreated={() => {
            loadRoutes();
            loadStats();
            setShowCreateModal(false);
          }}
          selectedDate={selectedDate}
          onNotification={addNotification}
        />
      )}

      {/* PDF Generation Modal */}
      {showPDFModal && (
        <PDFGenerationModal
          isOpen={showPDFModal}
          onClose={() => setShowPDFModal(false)}
          onNotification={addNotification}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmModalConfig && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          type={confirmModalConfig.type}
          onConfirm={confirmModalConfig.onConfirm}
          onClose={() => setShowConfirmModal(false)}
        />
      )}

      {/* Prompt Modal */}
      {showPromptModal && promptModalConfig && (
        <PromptModal
          isOpen={showPromptModal}
          title={promptModalConfig.title}
          message=""
          placeholder={promptModalConfig.placeholder}
          onConfirm={promptModalConfig.onSubmit}
          onClose={() => setShowPromptModal(false)}
        />
      )}

      {/* Notifications */}
      <SimpleNotificationList
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
};

export default RouteManagement;