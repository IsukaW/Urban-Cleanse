import React, { useState, useEffect } from 'react';

interface Worker {
  _id: string;
  name: string;
  role: string;
  email: string;
  currentLoad: number;
  availability: string;
}

interface WorkerAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (workerId: string, scheduledDate: string, notes: string) => void;
  requestId: string;
  preferredDate: string;
  collectionType: string;
}

const WorkerAssignmentModal: React.FC<WorkerAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  requestId,
  preferredDate,
  collectionType
}) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchWorkers();
      // Set default scheduled date to preferred date
      setScheduledDate(new Date(preferredDate).toISOString().split('T')[0]);
    }
  }, [isOpen, preferredDate]);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/waste/admin/workers?date=${scheduledDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkers(data.data.workers);
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = () => {
    if (!selectedWorkerId || !scheduledDate) {
      alert('Please select a worker and scheduled date');
      return;
    }
    onAssign(selectedWorkerId, scheduledDate, notes);
    handleClose();
  };

  const handleClose = () => {
    setSelectedWorkerId('');
    setScheduledDate('');
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Assign Worker for Request: {requestId}
          </h3>
          
          <div className="space-y-4">
            {/* Collection Info */}
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">
                <p><strong>Collection Type:</strong> {collectionType}</p>
                <p><strong>Customer Preferred Date:</strong> {new Date(preferredDate).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Scheduled Collection Date *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  // Refetch workers when date changes
                  if (e.target.value) {
                    fetchWorkers();
                  }
                }}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {/* Worker Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Worker *
              </label>
              {loading ? (
                <div className="text-center py-4">Loading workers...</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {workers.map((worker) => (
                    <div
                      key={worker._id}
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        selectedWorkerId === worker._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedWorkerId(worker._id)}
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
                            Current Load: {worker.currentLoad}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Assignment Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
                placeholder="Add any special instructions or notes for the assigned worker..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedWorkerId || !scheduledDate}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Assign Worker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerAssignmentModal;
