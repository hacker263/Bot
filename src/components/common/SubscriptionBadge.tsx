import React from 'react';
import { Crown, Zap, Star } from 'lucide-react';

interface SubscriptionBadgeProps {
  plan: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export default function SubscriptionBadge({ plan, size = 'md', showIcon = true }: SubscriptionBadgeProps) {
  const getPlanConfig = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'pro':
        return {
          icon: Crown,
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          label: 'Pro'
        };
      case 'starter':
        return {
          icon: Zap,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'Starter'
        };
      default:
        return {
          icon: Star,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          label: 'Free'
        };
    }
  };

  const config = getPlanConfig(plan);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  return (
    <span className={`inline-flex items-center ${sizeClasses[size]} rounded-full font-medium border ${config.color}`}>
      {showIcon && <Icon className={`${iconSizes[size]} mr-1`} />}
      {config.label}
    </span>
  );
}