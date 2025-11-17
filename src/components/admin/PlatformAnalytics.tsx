import React from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Building2, Users, Globe } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

export default function PlatformAnalytics() {
  const { merchants, orders, analytics } = useData();

  const platformStats = [
    {
      name: 'Total Merchants',
      stat: merchants.length.toString(),
      icon: Building2,
      change: '+2 this month',
      changeType: 'increase'
    },
    {
      name: 'Active Merchants',
      stat: merchants.filter(m => m.isActive).length.toString(),
      icon: Users,
      change: `${Math.round((merchants.filter(m => m.isActive).length / merchants.length) * 100)}% active`,
      changeType: 'neutral'
    },
    {
      name: 'Total Orders',
      stat: orders.length.toString(),
      icon: ShoppingCart,
      change: '+12% this month',
      changeType: 'increase'
    },
    {
      name: 'Platform Revenue',
      stat: analytics ? `$${analytics.totalRevenue.toFixed(2)}` : '$0.00',
      icon: DollarSign,
      change: '+8.2% this month',
      changeType: 'increase'
    }
  ];

  // Regional distribution
  const regionalStats = merchants.reduce((acc, merchant) => {
    acc[merchant.region] = (acc[merchant.region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Subscription distribution
  const subscriptionStats = merchants.reduce((acc, merchant) => {
    acc[merchant.subscriptionPlan] = (acc[merchant.subscriptionPlan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Monthly growth
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  });

  const lastMonthOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const year = currentMonth === 0 ? currentYear - 1 : currentYear;
    return orderDate.getMonth() === lastMonth && orderDate.getFullYear() === year;
  });

  const orderGrowth = lastMonthOrders.length > 0 
    ? ((thisMonthOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100 
    : 0;

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Platform Analytics</h1>

        {/* Stats Grid */}
        <div className="mt-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {platformStats.map((item) => (
              <div key={item.name} className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow-sm rounded-lg overflow-hidden border border-gray-200">
                <dt>
                  <div className="absolute bg-blue-500 rounded-md p-3">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="ml-16 text-sm font-medium text-gray-500 truncate">{item.name}</p>
                </dt>
                <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                  <p className="text-2xl font-semibold text-gray-900">{item.stat}</p>
                  <p className={`ml-2 flex items-baseline text-sm font-semibold ${
                    item.changeType === 'increase' ? 'text-green-600' : 
                    item.changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {item.change}
                  </p>
                </dd>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Regional Distribution */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Regional Distribution
            </h3>
            <div className="space-y-4">
              {Object.entries(regionalStats).map(([region, count]) => (
                <div key={region} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-gray-700">
                      {region === 'ZW' ? 'Zimbabwe' : 'South Africa'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                    <div className="w-16 h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 bg-blue-500 rounded-full"
                        style={{ width: `${(count / merchants.length) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 w-10">
                      {Math.round((count / merchants.length) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Distribution */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Subscription Plans
            </h3>
            <div className="space-y-4">
              {Object.entries(subscriptionStats).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      plan === 'pro' ? 'bg-purple-500' :
                      plan === 'starter' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {plan}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                    <div className="w-16 h-2 bg-gray-200 rounded-full">
                      <div
                        className={`h-2 rounded-full ${
                          plan === 'pro' ? 'bg-purple-500' :
                          plan === 'starter' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${(count / merchants.length) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 w-10">
                      {Math.round((count / merchants.length) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Growth */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Monthly Growth
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Order Growth</span>
                  <span className={`font-semibold ${orderGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {orderGrowth >= 0 ? '+' : ''}{orderGrowth.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${orderGrowth >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(Math.abs(orderGrowth), 100)}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {thisMonthOrders.length} orders this month vs {lastMonthOrders.length} last month
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Active Merchants</span>
                  <span className="font-semibold text-blue-600">
                    {merchants.filter(m => m.isActive).length} / {merchants.length}
                  </span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(merchants.filter(m => m.isActive).length / merchants.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Platform Health</span>
                  <span className="font-semibold text-green-600">Excellent</span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {orders
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((order) => {
                  const merchant = merchants.find(m => m.id === order.merchantId);
                  return (
                    <div key={order.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <ShoppingCart className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          New order from {merchant?.businessName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.currency} {order.totalAmount.toFixed(2)} • {order.customerName}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}