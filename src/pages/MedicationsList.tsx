import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MedicationCard from '../components/MedicationCard';
import MedicationAlerts from '../components/MedicationAlerts';
import { Medication } from '../types';
import { getMedicationAlerts } from '../utils/medicationUtils';

const MedicationsList: React.FC = () => {
  const { user, addMedication, updateMedication, deleteMedication } = useApp();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentMedication, setCurrentMedication] = useState<Medication | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: '',
    notes: '',
    active: true,
    conditionIds: [] as string[],
    maxUsageDays: undefined as number | undefined
  });

  // Get medication alerts
  const medicationAlerts = useMemo(() => {
    if (!user) return [];
    return getMedicationAlerts(user.medications, user.checkIns);
  }, [user]);
  
  // Reset form when opening add modal
  const openAddModal = () => {
    setFormData({
      name: '',
      dosage: '',
      frequency: '',
      notes: '',
      active: true,
      conditionIds: [],
      maxUsageDays: undefined
    });
    setIsAddModalOpen(true);
  };
  
  // Set form data when opening edit modal
  const openEditModal = (medication: Medication) => {
    setCurrentMedication(medication);
    setFormData({
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      notes: medication.notes || '',
      active: medication.active,
      conditionIds: medication.conditionIds || [],
      maxUsageDays: medication.maxUsageDays
    });
    setIsEditModalOpen(true);
  };
  
  // Handle form submission for adding
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addMedication(formData);
    setIsAddModalOpen(false);
  };
  
  // Handle form submission for editing
  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentMedication) {
      updateMedication({
        ...currentMedication,
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        notes: formData.notes,
        active: formData.active,
        conditionIds: formData.conditionIds,
        maxUsageDays: formData.maxUsageDays
      });
    }
    
    setIsEditModalOpen(false);
    setCurrentMedication(null);
  };
  
  // Handle deletion with confirmation
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this medication? All related check-in data will be removed.')) {
      deleteMedication(id);
    }
  };
  
  // Toggle condition selection
  const toggleCondition = (conditionId: string) => {
    setFormData(prev => ({
      ...prev,
      conditionIds: prev.conditionIds.includes(conditionId)
        ? prev.conditionIds.filter(id => id !== conditionId)
        : [...prev.conditionIds, conditionId]
    }));
  };

  // Standard frequency options
  const frequencyOptions = [
    'Once daily',
    'Twice daily', 
    'Three times daily',
    'Four times daily',
    'Every 8 hours',
    'Every 12 hours',
    'Weekly',
    'Fortnightly',
    'Monthly',
    'As required'
  ];
  
  if (!user) return null;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">My Medications</h1>
          <p className="text-gray-600">
            Manage medications with usage tracking and safety alerts
          </p>
        </div>
        
        <button
          onClick={openAddModal}
          className="mt-3 sm:mt-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          <span>Add Medication</span>
        </button>
      </div>

      {/* Medication Alerts */}
      {medicationAlerts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center">
            <AlertTriangle size={20} className="text-orange-500 mr-2" />
            <h2 className="text-lg font-medium text-gray-800">Medication Alerts</h2>
          </div>
          <MedicationAlerts alerts={medicationAlerts} />
        </div>
      )}
      
      {/* Active Medications Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-800">Active Medications</h2>
        
        {user.medications.filter(m => m.active).length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 text-center">
            <p className="text-gray-600 mb-4">You don't have any active medications.</p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              <span>Add Medication</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.medications
              .filter(m => m.active)
              .map(medication => (
                <div key={medication.id} className="relative">
                  <MedicationCard
                    medication={medication}
                    recentCheckIns={user.checkIns}
                  />
                  <div className="absolute top-3 right-3 flex space-x-1">
                    <button
                      onClick={() => openEditModal(medication)}
                      className="p-1.5 bg-white text-gray-500 hover:text-blue-600 rounded-full shadow-sm"
                      aria-label="Edit medication"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(medication.id)}
                      className="p-1.5 bg-white text-gray-500 hover:text-red-600 rounded-full shadow-sm"
                      aria-label="Delete medication"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
      
      {/* Inactive Medications Section */}
      {user.medications.filter(m => !m.active).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800">Inactive Medications</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.medications
              .filter(m => !m.active)
              .map(medication => (
                <div key={medication.id} className="relative">
                  <MedicationCard
                    medication={medication}
                    recentCheckIns={user.checkIns}
                  />
                  <div className="absolute top-3 right-3 flex space-x-1">
                    <button
                      onClick={() => openEditModal(medication)}
                      className="p-1.5 bg-white text-gray-500 hover:text-blue-600 rounded-full shadow-sm"
                      aria-label="Edit medication"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(medication.id)}
                      className="p-1.5 bg-white text-gray-500 hover:text-red-600 rounded-full shadow-sm"
                      aria-label="Delete medication"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Add Medication Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ marginTop: 0 }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Add New Medication</h3>
            </div>
            
            <form onSubmit={handleAdd}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medication Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Hydrocortisone Cream"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 10mg, Apply thin layer"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    required
                  >
                    <option value="">Select frequency</option>
                    {frequencyOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    "As required" medications are excluded from adherence tracking
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Usage Days (optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 14 for topical steroids"
                    value={formData.maxUsageDays || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      maxUsageDays: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You'll be warned when this limit is exceeded
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Used for Conditions
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {user.conditions.map(condition => (
                      <label key={condition.id} className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          checked={formData.conditionIds.includes(condition.id)}
                          onChange={() => toggleCondition(condition.id)}
                        />
                        <div className="ml-2 flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: condition.color }}
                          ></div>
                          <span className="text-sm text-gray-700">{condition.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {user.conditions.length === 0 && (
                    <p className="text-sm text-gray-500">No conditions available. Add conditions first.</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional information"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  ></textarea>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active-status"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  <label htmlFor="active-status" className="ml-2 text-sm text-gray-700">
                    This medication is currently active
                  </label>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Medication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Medication Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ marginTop: 0 }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Edit Medication</h3>
            </div>
            
            <form onSubmit={handleEdit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medication Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    required
                  >
                    <option value="">Select frequency</option>
                    {frequencyOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    "As required" medications are excluded from adherence tracking
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Usage Days (optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 14 for topical steroids"
                    value={formData.maxUsageDays || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      maxUsageDays: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You'll be warned when this limit is exceeded
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Used for Conditions
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {user.conditions.map(condition => (
                      <label key={condition.id} className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          checked={formData.conditionIds.includes(condition.id)}
                          onChange={() => toggleCondition(condition.id)}
                        />
                        <div className="ml-2 flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: condition.color }}
                          ></div>
                          <span className="text-sm text-gray-700">{condition.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  ></textarea>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active-status-edit"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  <label htmlFor="active-status-edit" className="ml-2 text-sm text-gray-700">
                    This medication is currently active
                  </label>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-between">
                <button
                  type="button"
                  className="px-4 py-2 text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  onClick={() => {
                    if (currentMedication) {
                      handleDelete(currentMedication.id);
                    }
                    setIsEditModalOpen(false);
                  }}
                >
                  Delete
                </button>
                
                <div className="space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationsList;