import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign, Package, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import wasteService from '../../services/waste/api';

interface WasteType {
  _id: string;
  type: string;
  name: string;
  description: string;
  baseCost: number;
  restrictions: string[];
  maxWeight?: number;
  isActive: boolean;
  createdAt: string;
}

const WasteTypeManagement: React.FC = () => {
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<WasteType | null>(null);
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    description: '',
    baseCost: '',
    restrictions: [''],
    maxWeight: '',
    isActive: true
  });
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchWasteTypes();
  }, []);

  const fetchWasteTypes = async () => {
    try {
      setLoading(true);
      console.log('Fetching waste types...');
      const response = await wasteService.getAllWasteTypesAdmin();
      console.log('Waste types response:', response);
      
      if (response.success) {
        setWasteTypes(response.data.wasteTypes || []);
        console.log('Waste types set:', response.data.wasteTypes?.length || 0);
      } else {
        console.error('API returned success: false', response);
        toast.error('Failed to fetch waste types');
      }
    } catch (error: any) {
      console.error('Error fetching waste types:', error);
      toast.error(`Failed to fetch waste types: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.name || !formData.description || !formData.baseCost) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        baseCost: parseFloat(formData.baseCost),
        maxWeight: formData.maxWeight ? parseInt(formData.maxWeight) : undefined,
        restrictions: formData.restrictions.filter(r => r.trim() !== '')
      };

      let response;
      if (editingType) {
        response = await wasteService.updateWasteType(editingType._id, payload);
      } else {
        response = await wasteService.createWasteType(payload);
      }

      if (response.success) {
        toast.success(`Waste type ${editingType ? 'updated' : 'created'} successfully`);
        resetForm();
        fetchWasteTypes();
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editingType ? 'update' : 'create'} waste type`);
    }
  };

  const handleEdit = (wasteType: WasteType) => {
    setEditingType(wasteType);
    setFormData({
      type: wasteType.type,
      name: wasteType.name,
      description: wasteType.description,
      baseCost: wasteType.baseCost.toString(),
      restrictions: wasteType.restrictions.length > 0 ? wasteType.restrictions : [''],
      maxWeight: wasteType.maxWeight?.toString() || '',
      isActive: wasteType.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this waste type?')) return;

    try {
      const response = await wasteService.deleteWasteType(id);
      if (response.success) {
        toast.success('Waste type deleted successfully');
        fetchWasteTypes();
      }
    } catch (error: any) {
      toast.error('Failed to delete waste type');
    }
  };

  const resetForm = () => {
    setFormData({
      type: '',
      name: '',
      description: '',
      baseCost: '',
      restrictions: [''],
      maxWeight: '',
      isActive: true
    });
    setEditingType(null);
    setShowModal(false);
  };

  const addRestriction = () => {
    setFormData(prev => ({
      ...prev,
      restrictions: [...prev.restrictions, '']
    }));
  };

  const updateRestriction = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      restrictions: prev.restrictions.map((r, i) => i === index ? value : r)
    }));
  };

  const removeRestriction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      restrictions: prev.restrictions.filter((_, i) => i !== index)
    }));
  };

  const handleCreateDefaults = async () => {
    if (!confirm('This will create 5 default waste types (Food, Polythene, Paper, Hazardous, E-Waste). Continue?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await wasteService.createDefaultWasteTypes();
      if (response.success) {
        toast.success(`Successfully created ${response.data.count} default waste types!`);
        fetchWasteTypes();
      }
    } catch (error: any) {
      console.error('Error creating defaults:', error);
      toast.error(error.message || 'Failed to create default waste types');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = async () => {
    if (resetConfirmText !== 'CONFIRM_RESET_ALL_WASTE_TYPES') {
      toast.error('Please enter the correct confirmation text');
      return;
    }

    setResetting(true);
    try {
      const response = await wasteService.resetAllWasteTypes(resetConfirmText);
      if (response.success) {
        toast.success(`Successfully deleted ${response.data.deletedCount} waste types`);
        setShowResetModal(false);
        setResetConfirmText('');
        fetchWasteTypes();
      }
    } catch (error: any) {
      console.error('Error resetting waste types:', error);
      toast.error(error.message || 'Failed to reset waste types');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading waste types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Waste Type Management</h1>
            <p className="text-gray-600">Manage collection packages and pricing</p>
          </div>
          <div className="flex space-x-3">
            {wasteTypes.length === 0 && (
              <button
                onClick={handleCreateDefaults}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
              >
                <Package className="h-4 w-4 mr-2" />
                Create Defaults
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Waste Type
            </button>
            {wasteTypes.length > 0 && (
              <button
                onClick={() => setShowResetModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset All
              </button>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Types</p>
                <p className="text-2xl font-bold text-gray-900">{wasteTypes.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Types</p>
                <p className="text-2xl font-bold text-gray-900">
                  {wasteTypes.filter(type => type.isActive).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${wasteTypes.length > 0 ? 
                    (wasteTypes.reduce((sum, type) => sum + type.baseCost, 0) / wasteTypes.length).toFixed(0) 
                    : '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Max Weight</p>
                <p className="text-2xl font-bold text-gray-900">
                  {wasteTypes.length > 0 ? 
                    Math.max(...wasteTypes.filter(t => t.maxWeight).map(t => t.maxWeight!)) || 0
                    : '0'}kg
                </p>
              </div>
            </div>
          </div>
        </div>

        {wasteTypes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Waste Types Found</h3>
            <p className="text-gray-600 mb-6">
              Get started by creating default waste types or add your own custom types
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleCreateDefaults}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Package className="h-4 w-4 mr-2" />
                )}
                Create Default Types
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Type
              </button>
            </div>
          </div>
        ) : (
          /* Waste Types Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wasteTypes.map((type) => (
              <div key={type._id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Package className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{type.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{type.type}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    type.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {type.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4">{type.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-green-600">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-semibold">{type.baseCost}</span>
                  </div>
                  {type.maxWeight && (
                    <span className="text-sm text-gray-500">Max: {type.maxWeight}kg</span>
                  )}
                </div>

                {type.restrictions.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Restrictions:</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {type.restrictions.slice(0, 2).map((restriction, index) => (
                        <li key={index}>• {restriction}</li>
                      ))}
                      {type.restrictions.length > 2 && (
                        <li className="text-gray-500">... and {type.restrictions.length - 2} more</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(type)}
                    className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(type._id)}
                    className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-red-700 flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingType ? 'Edit Waste Type' : 'Add New Waste Type'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type Key *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      <option value="">Select type</option>
                      <option value="food">Food</option>
                      <option value="polythene">Polythene</option>
                      <option value="paper">Paper</option>
                      <option value="hazardous">Hazardous</option>
                      <option value="ewaste">E-Waste</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Premium Service"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description of the service..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Base Cost ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.baseCost}
                      onChange={(e) => setFormData(prev => ({ ...prev, baseCost: e.target.value }))}
                      placeholder="25.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={formData.maxWeight}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxWeight: e.target.value }))}
                      placeholder="20"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restrictions
                  </label>
                  {formData.restrictions.map((restriction, index) => (
                    <div key={index} className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={restriction}
                        onChange={(e) => updateRestriction(index, e.target.value)}
                        placeholder="Enter restriction..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      {formData.restrictions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRestriction(index)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addRestriction}
                    className="text-green-600 hover:text-green-700 text-sm flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Restriction
                  </button>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Active (available for selection)
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {editingType ? 'Update' : 'Create'} Waste Type
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset All Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-4">
                ⚠️ Reset All Waste Types
              </h3>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 mb-2">
                  <strong>Warning:</strong> This action will permanently delete ALL waste types.
                </p>
                <p className="text-sm text-red-600">
                  This cannot be undone. All existing collection requests using these types will be affected.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type "CONFIRM_RESET_ALL_WASTE_TYPES" to confirm:
                </label>
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="CONFIRM_RESET_ALL_WASTE_TYPES"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-sm"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetConfirmText('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetAll}
                  disabled={resetting || resetConfirmText !== 'CONFIRM_RESET_ALL_WASTE_TYPES'}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </div>
                  ) : (
                    'Delete All'
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

export default WasteTypeManagement;
