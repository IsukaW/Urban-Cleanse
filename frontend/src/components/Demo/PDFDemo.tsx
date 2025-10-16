import React, { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { clientPDFService } from '../../utils/clientPDFService';

// Sample data for demonstration
const sampleData = {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  routes: [
    {
      _id: '1',
      routeId: 'RT-001',
      collectorId: {
        _id: 'worker1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'wc1'
      },
      assignedDate: '2024-01-15',
      status: 'completed' as const,
      bins: [],
      estimatedDuration: 120,
      actualDuration: 115,
      completedBins: 8,
      totalBins: 8,
      area: 'Downtown',
      createdAt: '2024-01-15T08:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      _id: '2',
      routeId: 'RT-002',
      collectorId: {
        _id: 'worker2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'wc2'
      },
      assignedDate: '2024-01-16',
      status: 'in_progress' as const,
      bins: [],
      estimatedDuration: 90,
      actualDuration: undefined,
      completedBins: 5,
      totalBins: 6,
      area: 'Business District',
      createdAt: '2024-01-16T08:00:00Z',
      updatedAt: '2024-01-16T09:30:00Z'
    },
    {
      _id: '3',
      routeId: 'RT-003',
      collectorId: {
        _id: 'worker3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        role: 'wc3'
      },
      assignedDate: '2024-01-17',
      status: 'assigned' as const,
      bins: [],
      estimatedDuration: 150,
      actualDuration: undefined,
      completedBins: 0,
      totalBins: 10,
      area: 'Industrial Zone',
      createdAt: '2024-01-17T08:00:00Z',
      updatedAt: '2024-01-17T08:00:00Z'
    }
  ],
  stats: {
    totalRoutes: 3,
    routesByStatus: {
      assigned: 1,
      in_progress: 1,
      completed: 1,
      cancelled: 0
    },
    totalBins: 24,
    completedBins: 13,
    totalWorkers: 3,
    estimatedDuration: 360,
    actualDuration: 115,
    areas: ['Downtown', 'Business District', 'Industrial Zone'],
    workerTypes: {
      wc1: 1,
      wc2: 1,
      wc3: 1
    },
    completionRate: 54,
    efficiency: 95
  }
};

const PDFDemo: React.FC = () => {
  const [generating, setGenerating] = useState(false);

  const handleGenerateDemo = async () => {
    setGenerating(true);
    try {
      await clientPDFService.generateRouteReport(sampleData);
      alert('Demo PDF generated successfully!');
    } catch (error) {
      console.error('Error generating demo PDF:', error);
      alert('Error generating demo PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <div className="text-center">
        <div className="p-3 bg-blue-100 rounded-lg inline-flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          PDF Generation Demo
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          Click the button below to generate a sample route management PDF report with demo data.
        </p>
        
        <button
          onClick={handleGenerateDemo}
          disabled={generating}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Generate Demo PDF</span>
            </>
          )}
        </button>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>Demo includes:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>3 sample routes</li>
            <li>Summary statistics</li>
            <li>Performance metrics</li>
            <li>Professional formatting</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PDFDemo;