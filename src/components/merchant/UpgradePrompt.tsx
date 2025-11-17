import React from 'react';
import { ArrowUp, Star, Crown, Zap, X } from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

interface UpgradePromptProps {
  onClose?: () => void;
  compact?: boolean;
}

export default function UpgradePrompt({ onClose, compact = false }: UpgradePromptProps) {
  const { user } = useAuth();
  const { merchants, subscriptionPlans } = useData();
  
  const merchant = merchants.find(m => m.id === user?.merchantId);
  if (!merchant) return null;

  const recommendation = subscriptionService.generateUpgradeRecommendation(merchant);
  
  if (!recommendation.shouldUpgrade) return null;

  const targetPlan = subscriptionPlans.find(p => p.id === recommendation.recommendedPlan);
  if (!targetPlan) return null;

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'pro': return Crown;
      case 'starter': return Zap;
      default: return Star;
    }
  };

  const PlanIcon = getPlanIcon(recommendation.recommendedPlan);

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-full p-2">
              <ArrowUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Upgrade to {targetPlan.name}</h3>
              <p className="text-sm opacity-90">{recommendation.reason}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors">
              Upgrade Now
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 rounded-full p-3">
            <PlanIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Upgrade to {targetPlan.name}
            </h3>
            <p className="text-sm text-gray-600">{recommendation.reason}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          What you'll get with {targetPlan.name}:
        </h4>
        <ul className="space-y-1">
          {recommendation.benefits.map((benefit, index) => (
            <li key={index} className="flex items-center text-sm text-gray-600">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          <span className="font-medium text-gray-900">
            ${targetPlan.price}/month
          </span>
          {targetPlan.orderLimit === -1 ? ' • Unlimited orders' : ` • ${targetPlan.orderLimit} orders`}
        </div>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
          Upgrade Now
        </button>
      </div>
    </div>
  );
}