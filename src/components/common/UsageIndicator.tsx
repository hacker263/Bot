import React from 'react';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { subscriptionService, UsageStats } from '../../services/subscriptionService';
import { Merchant } from '../../types';

interface UsageIndicatorProps {
  merchant: Merchant;
  showDetails?: boolean;
}

export default function UsageIndicator({ merchant, showDetails = false }: UsageIndicatorProps) {
  const usage = subscriptionService.checkUsageLimit(merchant);
  const warnings = subscriptionService.getUsageWarnings(merchant);

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getUsageIcon = (percentage: number) => {
    if (percentage >= 90) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (percentage >= 75) return <Clock className="h-4 w-4 text-yellow-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  if (usage.orderLimit === -1) {
    return (
      <div className="flex items-center space-x-2">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-sm text-gray-600">Unlimited</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getUsageIcon(usage.percentageUsed)}
          <span className="text-sm font-medium text-gray-900">
            {usage.currentOrders} / {usage.orderLimit} orders
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {usage.percentageUsed.toFixed(0)}%
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(usage.percentageUsed)}`}
          style={{ width: `${Math.min(usage.percentageUsed, 100)}%` }}
        ></div>
      </div>

      {showDetails && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">
            Resets in {usage.daysUntilReset} days
          </p>
          
          {warnings.map((warning, index) => (
            <div
              key={index}
              className={`p-2 rounded-md text-xs ${
                warning.type === 'danger' ? 'bg-red-50 text-red-700 border border-red-200' :
                warning.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              <p className="font-medium">{warning.message}</p>
              {warning.action && (
                <p className="mt-1">{warning.action}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}