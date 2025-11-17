import React, { useState } from 'react';
import { Save, MessageSquare, DollarSign, Globe, Bell } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

export default function MerchantSettings() {
  const { user } = useAuth();
  const { merchants, subscriptionPlans, updateMerchant } = useData();
  
  const merchant = merchants.find(m => m.id === user?.merchantId);
  const currentPlan = subscriptionPlans.find(p => p.id === merchant?.subscriptionPlan);

  const [formData, setFormData] = useState({
    businessName: merchant?.businessName || '',
    email: merchant?.email || '',
    phone: merchant?.phone || '',
    region: merchant?.region || 'ZW',
    currency: merchant?.currency || 'USD',
    codEnabled: merchant?.settings.codEnabled || false,
    welcomeMessage: merchant?.settings.messageTemplates.welcome || '',
    orderConfirmation: merchant?.settings.messageTemplates.orderConfirmation || '',
    paymentLink: merchant?.settings.messageTemplates.paymentLink || ''
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;

    updateMerchant(merchant.id, {
      businessName: formData.businessName,
      email: formData.email,
      phone: formData.phone,
      region: formData.region as 'ZW' | 'ZA',
      currency: formData.currency as 'USD' | 'ZWL' | 'ZAR',
      settings: {
        codEnabled: formData.codEnabled,
        messageTemplates: {
          welcome: formData.welcomeMessage,
          orderConfirmation: formData.orderConfirmation,
          paymentLink: formData.paymentLink
        }
      }
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!merchant) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <p className="text-gray-500">Loading merchant settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>

        <div className="space-y-8">
          {/* Subscription Status */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Subscription Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Current Plan</h3>
                <p className="mt-1 text-lg font-semibold text-blue-600 capitalize">
                  {merchant.subscriptionPlan}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Orders This Month</h3>
                <p className="mt-1 text-lg font-semibold">
                  {merchant.orderCount}
                  {merchant.orderLimit > 0 && (
                    <span className="text-sm text-gray-500 ml-1">
                      / {merchant.orderLimit}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  merchant.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {merchant.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            {currentPlan && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h4 className="font-medium text-gray-900">Plan Features</h4>
                <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                  {currentPlan.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Business Information */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Business Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Name</label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Region</label>
                  <select
                    value={formData.region}
                    onChange={(e) => handleChange('region', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="ZW">Zimbabwe</option>
                    <option value="ZA">South Africa</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="ZWL">ZWL</option>
                    <option value="ZAR">ZAR</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Settings */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Settings</h2>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.codEnabled}
                  onChange={(e) => handleChange('codEnabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700">
                    Enable Cash on Delivery (COD)
                  </label>
                  <p className="text-sm text-gray-500">
                    Allow customers to pay cash when they receive their order
                  </p>
                </div>
              </div>
            </div>

            {/* Message Templates */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">WhatsApp Message Templates</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Welcome Message</label>
                  <textarea
                    value={formData.welcomeMessage}
                    onChange={(e) => handleChange('welcomeMessage', e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Welcome message when customers first contact you..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This message is sent when customers first interact with your WhatsApp bot.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Confirmation</label>
                  <textarea
                    value={formData.orderConfirmation}
                    onChange={(e) => handleChange('orderConfirmation', e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Order confirmation message..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Use {'{'}orderNumber{'}'} and {'{'}total{'}'} as placeholders for dynamic content.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Link Message</label>
                  <textarea
                    value={formData.paymentLink}
                    onChange={(e) => handleChange('paymentLink', e.target.value)}
                    rows={2}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Payment link message..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Use {'{'}paymentLink{'}'} as placeholder for the payment URL.
                  </p>
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
                {isSaved ? 'Saved!' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}