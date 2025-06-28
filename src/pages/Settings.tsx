import React, { useState } from 'react';
import { Bell, Clock, User, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Settings: React.FC = () => {
  const { user, updateUserSettings } = useApp();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    reminderEnabled: user?.reminderEnabled || false,
    reminderTime: user?.reminderTime || '20:00'
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Update user settings
    updateUserSettings({
      name: formData.name,
      email: formData.email,
      reminderEnabled: formData.reminderEnabled,
      reminderTime: formData.reminderTime
    });
    
    // Show success message briefly
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => {
      setSaveMessage('');
      setIsSaving(false);
    }, 2000);
  };
  
  if (!user) return null;
  
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Settings</h1>
      
      <form onSubmit={handleSubmit}>
        {/* Profile Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
          <div className="flex items-center mb-4">
            <User size={20} className="text-blue-600 mr-3" />
            <h2 className="text-lg font-medium text-gray-800">Profile</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
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
                Email Address
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>
        </div>
        
        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
          <div className="flex items-center mb-4">
            <Bell size={20} className="text-blue-600 mr-3" />
            <h2 className="text-lg font-medium text-gray-800">Reminders</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="reminder-toggle"
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                checked={formData.reminderEnabled}
                onChange={(e) => setFormData({ ...formData, reminderEnabled: e.target.checked })}
              />
              <label htmlFor="reminder-toggle" className="ml-2 text-sm text-gray-700">
                Enable daily check-in reminders
              </label>
            </div>
            
            {formData.reminderEnabled && (
              <div className="ml-6 mt-2">
                <div className="flex items-center">
                  <Clock size={16} className="text-gray-500 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Reminder Time
                  </label>
                </div>
                <input
                  type="time"
                  className="mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.reminderTime}
                  onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  You'll receive a reminder to complete your daily check-in at this time.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Data Management */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Data Management</h2>
          
          <div className="space-y-4">
            <button
              type="button"
              className="text-sm text-gray-700 hover:text-gray-900"
              onClick={() => {
                const data = JSON.stringify(user);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `flaretracker-data-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export all data (JSON)
            </button>
            
            <div className="border-t border-gray-200 pt-4">
              <button
                type="button"
                className="text-sm text-red-600 hover:text-red-800"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                    localStorage.removeItem('skinTrackUser');
                    window.location.reload();
                  }
                }}
              >
                Reset all data
              </button>
              <p className="text-xs text-gray-500 mt-1">
                This will permanently delete all your recorded data.
              </p>
            </div>
          </div>
        </div>
        
        {/* Save button */}
        <div className="flex justify-between items-center">
          <div>
            {saveMessage && (
              <p className="text-sm text-green-600">{saveMessage}</p>
            )}
          </div>
          
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70"
            disabled={isSaving}
          >
            <Save size={18} />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;