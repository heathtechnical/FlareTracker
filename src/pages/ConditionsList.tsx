import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ConditionCard from '../components/ConditionCard';
import { SkinCondition } from '../types';
import { subDays } from 'date-fns';

const ConditionsList: React.FC = () => {
  const { user, addCondition, updateCondition, deleteCondition } = useApp();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentCondition, setCurrentCondition] = useState<SkinCondition | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#2563EB' // Default blue
  });

  // Get check-ins from the last 30 days for condition cards
  const recentCheckIns = useMemo(() => {
    if (!user) return [];
    
    const thirtyDaysAgo = subDays(new Date(), 30);
    return [...user.checkIns]
      .filter(checkIn => new Date(checkIn.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [user?.checkIns]);
  
  // Reset form when opening add modal
  const openAddModal = () => {
    setFormData({
      name: '',
      description: '',
      color: '#2563EB'
    });
    setIsAddModalOpen(true);
  };
  
  // Set form data when opening edit modal
  const openEditModal = (condition: SkinCondition) => {
    setCurrentCondition(condition);
    setFormData({
      name: condition.name,
      description: condition.description || '',
      color: condition.color
    });
    setIsEditModalOpen(true);
  };
  
  // Handle form submission for adding
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addCondition(formData);
    setIsAddModalOpen(false);
  };
  
  // Handle form submission for editing
  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentCondition) {
      updateCondition({
        ...currentCondition,
        name: formData.name,
        description: formData.description,
        color: formData.color
      });
    }
    
    setIsEditModalOpen(false);
    setCurrentCondition(null);
  };
  
  // Handle deletion with confirmation
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this condition? All related check-in data will be removed.')) {
      deleteCondition(id);
    }
  };
  
  if (!user) return null;
  
  // Color options
  const colorOptions = [
    { value: '#2563EB', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#F59E0B', label: 'Orange' },
    { value: '#EF4444', label: 'Red' },
    { value: '#6B7280', label: 'Gray' },
    { value: '#0D9488', label: 'Teal' },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">My Skin Conditions</h1>
          <p className="text-gray-600">
            Manage the skin conditions you want to track
          </p>
        </div>
        
        <button
          onClick={openAddModal}
          className="mt-3 sm:mt-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          <span>Add Condition</span>
        </button>
      </div>
      
      {user.conditions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-100 text-center">
          <h3 className="text-lg font-medium text-gray-800 mb-2">No conditions added yet</h3>
          <p className="text-gray-600 mb-6">
            Add your first skin condition to start tracking your symptoms and progress.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            <span>Add Your First Condition</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {user.conditions.map(condition => (
            <div key={condition.id} className="relative">
              <ConditionCard
                condition={condition}
                recentCheckIns={recentCheckIns}
              />
              <div className="absolute top-3 right-3 flex space-x-1">
                <button
                  onClick={() => openEditModal(condition)}
                  className="p-1.5 bg-white text-gray-500 hover:text-blue-600 rounded-full shadow-sm"
                  aria-label="Edit condition"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => handleDelete(condition.id)}
                  className="p-1.5 bg-white text-gray-500 hover:text-red-600 rounded-full shadow-sm"
                  aria-label="Delete condition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Condition Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Add New Condition</h3>
            </div>
            
            <form onSubmit={handleAdd}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Eczema, Psoriasis, Acne"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Location or additional details"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full focus:outline-none ${
                          formData.color === color.value ? 'ring-2 ring-offset-2 ring-gray-500' : ''
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        aria-label={`Select ${color.label} color`}
                      ></button>
                    ))}
                  </div>
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
                  Add Condition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Condition Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Edit Condition</h3>
            </div>
            
            <form onSubmit={handleEdit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition Name
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
                    Description (optional)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full focus:outline-none ${
                          formData.color === color.value ? 'ring-2 ring-offset-2 ring-gray-500' : ''
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        aria-label={`Select ${color.label} color`}
                      ></button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-between">
                <button
                  type="button"
                  className="px-4 py-2 text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  onClick={() => {
                    if (currentCondition) {
                      handleDelete(currentCondition.id);
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

export default ConditionsList;