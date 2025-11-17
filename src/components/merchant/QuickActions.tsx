import React from 'react';
import { Plus, MessageSquare, BarChart3, Settings, Download, Eye } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

interface QuickActionsProps {
  onOpenBot: () => void;
  onAddProduct: () => void;
}

export default function QuickActions({ onOpenBot, onAddProduct }: QuickActionsProps) {
  const { orders } = useData();

  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  const actions = [
    {
      name: 'Add Product',
      description: 'Add a new product to your catalog',
      icon: Plus,
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: onAddProduct
    },
    {
      name: 'Test WhatsApp Bot',
      description: 'Test your WhatsApp ordering bot',
      icon: MessageSquare,
      color: 'bg-green-500 hover:bg-green-600',
      onClick: onOpenBot
    },
    {
      name: 'View Analytics',
      description: 'Check your sales performance',
      icon: BarChart3,
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => window.location.href = '/dashboard/analytics'
    },
    {
      name: 'Export Orders',
      description: 'Download order data as CSV',
      icon: Download,
      color: 'bg-orange-500 hover:bg-orange-600',
      onClick: () => {
        // Export functionality would be implemented here
        console.log('Exporting orders...');
      }
    }
  ];

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        {pendingOrders > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {pendingOrders} pending orders
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {actions.map((action) => (
          <button
            key={action.name}
            onClick={action.onClick}
            className={`${action.color} text-white p-4 rounded-lg transition-colors duration-200 text-left group`}
          >
            <div className="flex items-center space-x-3">
              <action.icon className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
              <div>
                <h4 className="font-medium">{action.name}</h4>
                <p className="text-sm opacity-90">{action.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {pendingOrders > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <Eye className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">
              You have <strong>{pendingOrders}</strong> pending order{pendingOrders !== 1 ? 's' : ''} that need attention.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard/orders'}
              className="ml-auto text-sm font-medium text-yellow-800 hover:text-yellow-900"
            >
              View Orders →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}