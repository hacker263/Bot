import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings, 
  Building2,
  DollarSign,
  ShoppingCart,
  TrendingUp
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import MerchantManagement from '../components/admin/MerchantManagement';
import PlatformAnalytics from '../components/admin/PlatformAnalytics';
import PlatformSettings from '../components/admin/PlatformSettings';
import SystemHealth from '../components/admin/SystemHealth';
import FeatureFlags from '../components/admin/FeatureFlags';

export default function SuperAdminDashboard() {
  const location = useLocation();
  const { merchants, analytics, orders } = useData();

  const navigation = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Merchants', href: '/admin/merchants', icon: Building2 },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'System Health', href: '/admin/health', icon: Settings },
    { name: 'Feature Flags', href: '/admin/features', icon: Settings },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const platformStats = [
    {
      name: 'Active Merchants',
      stat: merchants.filter(m => m.isActive).length.toString(),
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Total Orders',
      stat: orders.length.toString(),
      icon: ShoppingCart,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Platform Revenue',
      stat: analytics ? `$${analytics.totalRevenue.toFixed(2)}` : '$0.00',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: 'Growth Rate',
      stat: '+12.3%',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-gray-200">
          <div className="flex items-center flex-shrink-0 px-4">
            <h2 className="text-lg font-semibold text-gray-900">Super Admin</h2>
          </div>
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/admin' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors`}
                  >
                    <item.icon
                      className={`${
                        isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 flex-shrink-0 h-5 w-5`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <Routes>
            <Route path="/" element={<AdminOverview stats={platformStats} />} />
            <Route path="/merchants" element={<MerchantManagement />} />
            <Route path="/analytics" element={<PlatformAnalytics />} />
            <Route path="/health" element={<SystemHealth />} />
            <Route path="/features" element={<FeatureFlags />} />
            <Route path="/settings" element={<PlatformSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function AdminOverview({ stats }: { stats: any[] }) {
  const { merchants, orders } = useData();

  const recentMerchants = merchants
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Platform Overview</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Stats */}
        <div className="mt-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
              <div key={item.name} className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow-sm rounded-lg overflow-hidden border border-gray-200">
                <dt>
                  <div className={`absolute ${item.bgColor} rounded-md p-3`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <p className="ml-16 text-sm font-medium text-gray-500 truncate">{item.name}</p>
                </dt>
                <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                  <p className="text-2xl font-semibold text-gray-900">{item.stat}</p>
                </dd>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Merchants */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Merchants</h3>
              <div className="mt-5">
                {recentMerchants.length > 0 ? (
                  <div className="flow-root">
                    <ul className="-my-4 divide-y divide-gray-200">
                      {recentMerchants.map((merchant) => (
                        <li key={merchant.id} className="py-4 flex items-center justify-between">
                          <div className="flex flex-col">
                            <p className="text-sm font-medium text-gray-900">
                              {merchant.businessName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {merchant.name} • {merchant.region}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              merchant.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {merchant.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recent merchants</p>
                )}
              </div>
              <div className="mt-6">
                <Link
                  to="/admin/merchants"
                  className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Manage merchants
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Orders</h3>
              <div className="mt-5">
                {recentOrders.length > 0 ? (
                  <div className="flow-root">
                    <ul className="-my-4 divide-y divide-gray-200">
                      {recentOrders.map((order) => {
                        const merchant = merchants.find(m => m.id === order.merchantId);
                        return (
                          <li key={order.id} className="py-4 flex items-center justify-between">
                            <div className="flex flex-col">
                              <p className="text-sm font-medium text-gray-900">
                                {merchant?.businessName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {order.customerName} • {order.currency} {order.totalAmount.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                order.status === 'fulfilled' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recent orders</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}