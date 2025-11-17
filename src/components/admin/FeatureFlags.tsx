import React, { useState } from 'react';
import { ToggleLeft as Toggle, Save, RefreshCw, AlertTriangle } from 'lucide-react';

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'core' | 'experimental' | 'beta' | 'deprecated';
  impact: 'low' | 'medium' | 'high';
  dependencies?: string[];
}

export default function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([
    {
      id: 'whatsapp_bot',
      name: 'WhatsApp Bot Integration',
      description: 'Enable WhatsApp bot functionality for order processing',
      enabled: true,
      category: 'core',
      impact: 'high'
    },
    {
      id: 'payment_processing',
      name: 'Payment Processing',
      description: 'Enable payment gateway integrations',
      enabled: true,
      category: 'core',
      impact: 'high'
    },
    {
      id: 'advanced_analytics',
      name: 'Advanced Analytics',
      description: 'Enhanced reporting and business intelligence features',
      enabled: true,
      category: 'beta',
      impact: 'medium'
    },
    {
      id: 'multi_language',
      name: 'Multi-language Support',
      description: 'Support for multiple languages in bot responses',
      enabled: false,
      category: 'experimental',
      impact: 'medium'
    },
    {
      id: 'voice_orders',
      name: 'Voice Order Processing',
      description: 'Accept orders via voice messages',
      enabled: false,
      category: 'experimental',
      impact: 'low'
    },
    {
      id: 'ai_recommendations',
      name: 'AI Product Recommendations',
      description: 'AI-powered product suggestions for customers',
      enabled: false,
      category: 'experimental',
      impact: 'medium'
    },
    {
      id: 'inventory_sync',
      name: 'Real-time Inventory Sync',
      description: 'Sync inventory with external systems in real-time',
      enabled: true,
      category: 'beta',
      impact: 'medium'
    },
    {
      id: 'loyalty_program',
      name: 'Customer Loyalty Program',
      description: 'Points-based loyalty and rewards system',
      enabled: false,
      category: 'beta',
      impact: 'low'
    }
  ]);

  const [hasChanges, setHasChanges] = useState(false);

  const toggleFlag = (flagId: string) => {
    setFlags(prev => prev.map(flag => 
      flag.id === flagId ? { ...flag, enabled: !flag.enabled } : flag
    ));
    setHasChanges(true);
  };

  const saveChanges = () => {
    // In a real app, this would save to the backend
    console.log('Saving feature flags:', flags);
    setHasChanges(false);
  };

  const resetChanges = () => {
    // Reset to original state
    setHasChanges(false);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core':
        return 'bg-blue-100 text-blue-800';
      case 'beta':
        return 'bg-purple-100 text-purple-800';
      case 'experimental':
        return 'bg-yellow-100 text-yellow-800';
      case 'deprecated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const groupedFlags = flags.reduce((acc, flag) => {
    if (!acc[flag.category]) {
      acc[flag.category] = [];
    }
    acc[flag.category].push(flag);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Feature Flags</h2>
          <p className="text-gray-600">Control platform features and experimental functionality</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <>
              <button
                onClick={resetChanges}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </button>
              <button
                onClick={saveChanges}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Unsaved Changes
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                You have unsaved changes to feature flags. Remember to save your changes to apply them to the platform.
              </p>
            </div>
          </div>
        </div>
      )}

      {Object.entries(groupedFlags).map(([category, categoryFlags]) => (
        <div key={category} className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 capitalize">
              {category} Features
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {categoryFlags.map((flag) => (
              <div key={flag.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {flag.name}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(flag.category)}`}>
                        {flag.category}
                      </span>
                      <span className={`text-xs font-medium ${getImpactColor(flag.impact)}`}>
                        {flag.impact} impact
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{flag.description}</p>
                    {flag.dependencies && flag.dependencies.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">
                          Depends on: {flag.dependencies.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() => toggleFlag(flag.id)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        flag.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          flag.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Impact Warning */}
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Important Notice
            </h3>
            <p className="mt-1 text-sm text-red-700">
              Disabling core features may affect platform functionality. High-impact changes should be tested in a staging environment first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}