import { Merchant, SubscriptionPlan } from '../types';

export interface UsageStats {
  currentOrders: number;
  orderLimit: number;
  percentageUsed: number;
  daysUntilReset: number;
  canCreateOrder: boolean;
}

export interface SubscriptionFeature {
  id: string;
  name: string;
  description: string;
  availableIn: string[];
}

class SubscriptionService {
  private features: SubscriptionFeature[] = [
    {
      id: 'whatsapp_bot',
      name: 'WhatsApp Bot',
      description: 'Automated order taking via WhatsApp',
      availableIn: ['free', 'starter', 'pro']
    },
    {
      id: 'payment_integration',
      name: 'Payment Integration',
      description: 'Accept payments via mobile money and bank transfers',
      availableIn: ['starter', 'pro']
    },
    {
      id: 'advanced_analytics',
      name: 'Advanced Analytics',
      description: 'Detailed sales reports and customer insights',
      availableIn: ['starter', 'pro']
    },
    {
      id: 'export_data',
      name: 'Data Export',
      description: 'Export orders and customer data to CSV',
      availableIn: ['starter', 'pro']
    },
    {
      id: 'custom_branding',
      name: 'Custom Branding',
      description: 'Customize bot messages and appearance',
      availableIn: ['pro']
    },
    {
      id: 'multi_location',
      name: 'Multi-location Support',
      description: 'Manage multiple business locations',
      availableIn: ['pro']
    },
    {
      id: 'api_access',
      name: 'API Access',
      description: 'Integrate with external systems via REST API',
      availableIn: ['pro']
    },
    {
      id: 'priority_support',
      name: 'Priority Support',
      description: '24/7 priority customer support',
      availableIn: ['starter', 'pro']
    }
  ];

  checkUsageLimit(merchant: Merchant): UsageStats {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysUntilReset = endOfMonth.getDate() - now.getDate();

    const currentOrders = merchant.orderCount;
    const orderLimit = merchant.orderLimit;
    const percentageUsed = orderLimit > 0 ? (currentOrders / orderLimit) * 100 : 0;
    const canCreateOrder = orderLimit === -1 || currentOrders < orderLimit;

    return {
      currentOrders,
      orderLimit,
      percentageUsed,
      daysUntilReset,
      canCreateOrder
    };
  }

  canAccessFeature(merchant: Merchant, featureId: string): boolean {
    const feature = this.features.find(f => f.id === featureId);
    if (!feature) return false;
    
    return feature.availableIn.includes(merchant.subscriptionPlan);
  }

  getAvailableFeatures(planId: string): SubscriptionFeature[] {
    return this.features.filter(f => f.availableIn.includes(planId));
  }

  calculateUpgradeBenefits(currentPlan: string, targetPlan: string): {
    newFeatures: SubscriptionFeature[];
    orderLimitIncrease: number;
  } {
    const currentFeatures = this.getAvailableFeatures(currentPlan);
    const targetFeatures = this.getAvailableFeatures(targetPlan);
    
    const newFeatures = targetFeatures.filter(
      tf => !currentFeatures.some(cf => cf.id === tf.id)
    );

    const planLimits = {
      free: 20,
      starter: 200,
      pro: -1
    };

    const currentLimit = planLimits[currentPlan as keyof typeof planLimits] || 0;
    const targetLimit = planLimits[targetPlan as keyof typeof planLimits] || 0;
    const orderLimitIncrease = targetLimit === -1 ? Infinity : targetLimit - currentLimit;

    return {
      newFeatures,
      orderLimitIncrease
    };
  }

  getUsageWarnings(merchant: Merchant): Array<{
    type: 'warning' | 'danger' | 'info';
    message: string;
    action?: string;
  }> {
    const usage = this.checkUsageLimit(merchant);
    const warnings = [];

    if (usage.percentageUsed >= 90 && usage.orderLimit > 0) {
      warnings.push({
        type: 'danger' as const,
        message: `You've used ${usage.percentageUsed.toFixed(0)}% of your monthly order limit`,
        action: 'Upgrade plan to avoid service interruption'
      });
    } else if (usage.percentageUsed >= 75 && usage.orderLimit > 0) {
      warnings.push({
        type: 'warning' as const,
        message: `You've used ${usage.percentageUsed.toFixed(0)}% of your monthly order limit`,
        action: 'Consider upgrading your plan'
      });
    }

    if (usage.daysUntilReset <= 3 && usage.percentageUsed > 50) {
      warnings.push({
        type: 'info' as const,
        message: `Your usage will reset in ${usage.daysUntilReset} days`,
      });
    }

    return warnings;
  }

  generateUpgradeRecommendation(merchant: Merchant): {
    shouldUpgrade: boolean;
    recommendedPlan: string;
    reason: string;
    benefits: string[];
  } {
    const usage = this.checkUsageLimit(merchant);
    const currentPlan = merchant.subscriptionPlan;

    if (currentPlan === 'free' && usage.percentageUsed > 80) {
      return {
        shouldUpgrade: true,
        recommendedPlan: 'starter',
        reason: 'You\'re approaching your free plan limit',
        benefits: [
          '200 orders per month (10x increase)',
          'Payment integrations',
          'Advanced analytics',
          'Data export capabilities',
          'Priority support'
        ]
      };
    }

    if (currentPlan === 'starter' && usage.percentageUsed > 80) {
      return {
        shouldUpgrade: true,
        recommendedPlan: 'pro',
        reason: 'You\'re approaching your starter plan limit',
        benefits: [
          'Unlimited orders',
          'Custom branding',
          'Multi-location support',
          'API access',
          'Advanced integrations'
        ]
      };
    }

    return {
      shouldUpgrade: false,
      recommendedPlan: currentPlan,
      reason: 'Your current plan meets your needs',
      benefits: []
    };
  }
}

export const subscriptionService = new SubscriptionService();