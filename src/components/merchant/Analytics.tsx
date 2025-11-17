import React from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Package, Calendar } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

export default function Analytics() {
  const { analytics, orders } = useData();

  if (!analytics) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center">
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Revenue',
      stat: `$${analytics.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      change: '+12.3%',
      changeType: 'increase'
    },
    {
      name: 'Total Orders',
      stat: analytics.totalOrders.toString(),
      icon: ShoppingCart,
      change: '+5.2%',
      changeType: 'increase'
    },
    {
      name: 'Average Order Value',
      stat: `$${analytics.averageOrderValue.toFixed(2)}`,
      icon: TrendingUp,
      change: '+2.1%',
      changeType: 'increase'
    },
    {
      name: 'Top Product Sales',
      stat: analytics.topProducts[0]?.sales.toString() || '0',
      icon: Package,
      change: '+8.7%',
      changeType: 'increase'
    }
  ];

  const recentOrdersByStatus = {
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    fulfilled: orders.filter(o => o.status === 'fulfilled').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>

        {/* Stats Grid */}
        <div className="mt-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
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
                    item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.change}
                  </p>
                </dd>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Sales Chart */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Daily Sales (Last 7 Days)
            </h3>
            <div className="space-y-3">
              {analytics.dailySales.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                      {new Date(day.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium">{day.orders} orders</span>
                    <span className="text-sm font-semibold text-green-600">
                      ${day.revenue.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Status Distribution */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Order Status Distribution
            </h3>
            <div className="space-y-4">
              {Object.entries(recentOrdersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      status === 'fulfilled' ? 'bg-blue-500' :
                      status === 'confirmed' ? 'bg-green-500' :
                      status === 'cancelled' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                    <div className={`w-16 h-2 rounded-full ${
                      status === 'fulfilled' ? 'bg-blue-100' :
                      status === 'confirmed' ? 'bg-green-100' :
                      status === 'cancelled' ? 'bg-red-100' :
                      'bg-yellow-100'
                    }`}>
                      <div
                        className={`h-2 rounded-full ${
                          status === 'fulfilled' ? 'bg-blue-500' :
                          status === 'confirmed' ? 'bg-green-500' :
                          status === 'cancelled' ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`}
                        style={{ width: `${Math.max((count / Math.max(...Object.values(recentOrdersByStatus))) * 100, 5)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Top Products
            </h3>
            <div className="space-y-4">
              {analytics.topProducts.slice(0, 5).map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-600">
                        {index + 1}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {product.productName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.sales} sold
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    ${product.revenue.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Growth */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Performance Summary
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Revenue Growth</span>
                  <span className="font-semibold text-green-600">+12.3%</span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Order Volume</span>
                  <span className="font-semibold text-blue-600">+5.2%</span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer Satisfaction</span>
                  <span className="font-semibold text-purple-600">92%</span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}