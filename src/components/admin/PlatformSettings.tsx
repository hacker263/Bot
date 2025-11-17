import React, { useState } from 'react';
import { Save, Globe, DollarSign, Settings, Bell, Shield } from 'lucide-react';

export default function PlatformSettings() {
  const [settings, setSettings] = useState({
    platformName: 'Smart WhatsApp',
    supportEmail: 'support@smartwhatsapp.com',
    defaultCurrency: 'USD',
    allowedRegions: ['ZW', 'ZA'],
    maintenanceMode: false,
    newUserSignup: true,
    emailNotifications: true,
    smsNotifications: false,
    maxOrdersPerDay: 1000,
    orderRetentionDays: 365
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would save to the backend
    console.log('Platform settings updated:', settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Platform Settings</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* General Settings */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Settings className="h-5 w-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">General Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Platform Name</label>
                <input
                  type="text"
                  value={settings.platformName}
                  onChange={(e) => handleChange('platformName', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Support Email</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => handleChange('supportEmail', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Default Currency</label>
                <select
                  value={settings.defaultCurrency}
                  onChange={(e) => handleChange('defaultCurrency', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="ZWL">ZWL</option>
                  <option value="ZAR">ZAR</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Orders Per Day</label>
                <input
                  type="number"
                  value={settings.maxOrdersPerDay}
                  onChange={(e) => handleChange('maxOrdersPerDay', parseInt(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Regional Settings */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Globe className="h-5 w-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Regional Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Allowed Regions</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.allowedRegions.includes('ZW')}
                      onChange={(e) => {
                        const regions = e.target.checked
                          ? [...settings.allowedRegions, 'ZW']
                          : settings.allowedRegions.filter(r => r !== 'ZW');
                        handleChange('allowedRegions', regions);
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-3 text-sm text-gray-700">Zimbabwe</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.allowedRegions.includes('ZA')}
                      onChange={(e) => {
                        const regions = e.target.checked
                          ? [...settings.allowedRegions, 'ZA']
                          : settings.allowedRegions.filter(r => r !== 'ZA');
                        handleChange('allowedRegions', regions);
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-3 text-sm text-gray-700">South Africa</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Shield className="h-5 w-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">System Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
                  <p className="text-sm text-gray-500">Disable platform access for maintenance</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">New User Signup</label>
                  <p className="text-sm text-gray-500">Allow new merchants to register</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.newUserSignup}
                  onChange={(e) => handleChange('newUserSignup', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Data Retention Period</label>
                <div className="mt-1 flex items-center space-x-2">
                  <input
                    type="number"
                    value={settings.orderRetentionDays}
                    onChange={(e) => handleChange('orderRetentionDays', parseInt(e.target.value))}
                    className="block w-32 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <span className="text-sm text-gray-500">days</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">How long to keep order data before archiving</p>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Bell className="h-5 w-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Notification Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                  <p className="text-sm text-gray-500">Send system alerts via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
                  <p className="text-sm text-gray-500">Send critical alerts via SMS</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => handleChange('smsNotifications', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Feature Flags */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Feature Flags</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-md">
                <h3 className="font-medium text-gray-900">WhatsApp Integration</h3>
                <p className="text-sm text-gray-500 mt-1">Core WhatsApp bot functionality</p>
                <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Enabled
                </span>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-md">
                <h3 className="font-medium text-gray-900">Payment Processing</h3>
                <p className="text-sm text-gray-500 mt-1">Multi-region payment support</p>
                <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Enabled
                </span>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-md">
                <h3 className="font-medium text-gray-900">Advanced Analytics</h3>
                <p className="text-sm text-gray-500 mt-1">Detailed reporting and insights</p>
                <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Beta
                </span>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-md">
                <h3 className="font-medium text-gray-900">Multi-language Support</h3>
                <p className="text-sm text-gray-500 mt-1">Localized message templates</p>
                <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isSaved 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Save className="-ml-1 mr-2 h-5 w-5" />
              {isSaved ? 'Settings Saved!' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}