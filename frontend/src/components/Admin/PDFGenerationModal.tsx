import React, { useState, useEffect } from 'react';
import { X, Download, Calendar, Filter, FileText, Loader } from 'lucide-react';
import { routeAPI } from '../../services/route/api';
import { clientPDFService } from '../../utils/clientPDFService';
import { getCurrentDate } from '../../utils/dateUtils';

interface PDFGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

const PDFGenerationModal: React.FC<PDFGenerationModalProps> = ({
  isOpen,
  onClose,
  onNotification
}) => {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: getCurrentDate(),
    statusFilter: 'all',
    areaFilter: 'all'
  });
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Set default start date to 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      setFormData(prev => ({
        ...prev,
        startDate: thirtyDaysAgo.toISOString().split('T')[0]
      }));
      
      loadAvailableAreas();
    }
  }, [isOpen]);

  const loadAvailableAreas = async () => {
    try {
      setLoading(true);
      const response = await routeAPI.getRouteStats();
      if (response.data?.stats?.areas) {
        setAvailableAreas(response.data.stats.areas);
      }
    } catch (error: any) {
      console.error('Error loading areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.startDate || !formData.endDate) {
      onNotification('error', 'Please select both start and end dates');
      return false;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (start > end) {
      onNotification('error', 'Start date cannot be after end date');
      return false;
    }

    // Check if date range is not too large (max 6 months)
    const sixMonthsInMs = 6 * 30 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > sixMonthsInMs) {
      onNotification('warning', 'Date range is quite large. This may take some time to generate.');
    }

    return true;
  };

  const generatePDF = async () => {
    if (!validateForm()) return;

    try {
      setGenerating(true);
      onNotification('info', 'Generating PDF report...');

      const requestData = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        statusFilter: formData.statusFilter === 'all' ? undefined : formData.statusFilter,
        areaFilter: formData.areaFilter === 'all' ? undefined : formData.areaFilter
      };

      try {
        // Try server-side PDF generation first
        const response = await routeAPI.generatePDFReport(requestData);

        // Create blob and download link
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename
        const startDate = formData.startDate;
        const endDate = formData.endDate;
        const filename = `route-report-${startDate}-to-${endDate}.pdf`;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        window.URL.revokeObjectURL(url);
        
        onNotification('success', 'PDF report generated and downloaded successfully!');
      } catch (serverError) {
        console.warn('Server-side PDF generation failed, falling back to client-side:', serverError);
        onNotification('info', 'Generating PDF report using client-side fallback...');
        
        // Fallback to client-side PDF generation
        // First, get the route data
        const routesResponse = await routeAPI.getRoutes({
          ...requestData,
          page: 1,
          limit: 1000 // Get all routes for the period
        });
        
        const statsResponse = await routeAPI.getRouteStats(formData.startDate);
        
        const pdfData = {
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
          routes: routesResponse.data.routes || [],
          stats: statsResponse.data.stats
        };
        
        await clientPDFService.generateRouteReport(pdfData);
        onNotification('success', 'PDF report generated and downloaded successfully using client-side generation!');
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      onNotification('error', error.response?.data?.message || 'Failed to generate PDF report');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Generate PDF Report</h2>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Date Range */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <Calendar className="w-4 h-4" />
              <span>Date Range</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  disabled={generating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  disabled={generating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="statusFilter"
                  value={formData.statusFilter}
                  onChange={handleInputChange}
                  disabled={generating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50"
                >
                  <option value="all">All Statuses</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area
                </label>
                <select
                  name="areaFilter"
                  value={formData.areaFilter}
                  onChange={handleInputChange}
                  disabled={generating || loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50"
                >
                  <option value="all">All Areas</option>
                  {availableAreas.map(area => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Report Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-blue-100 rounded">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium text-blue-900 mb-1">Report Contents</p>
                <ul className="text-blue-700 space-y-1">
                  <li>• Summary statistics and metrics</li>
                  <li>• Route performance analysis</li>
                  <li>• Detailed route listings</li>
                  <li>• Worker type distribution</li>
                  <li>• Area coverage overview</li>
                  <li>• Professional formatting with charts</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2 italic">
                  Note: Uses server-side generation with client-side fallback for reliability.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          
          <button
            onClick={generatePDF}
            disabled={generating || !formData.startDate || !formData.endDate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {generating ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Generate PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFGenerationModal;