import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Plus,
  TrendingUp,
  DollarSign,
  Users,
  AlertCircle
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import UpgradePrompt from '../components/merchant/UpgradePrompt';
import QuickActions from '../components/merchant/QuickActions';
import UsageIndicator from '../components/common/UsageIndicator';
import ProductManagement from '../components/merchant/ProductManagement';
import OrderManagement from '../components/merchant/OrderManagement';
import Analytics from '../components/merchant/Analytics';
import MerchantSettings from '../components/merchant/MerchantSettings';

export default function MerchantDashboard() {
  const location = useLocation();
  const { user } = useAuth();
  const { products, orders, analytics, merchants } = useData();
  const [showProductForm, setShowProductForm] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(true);
  
  const merchant = merchants.find(m => m.id === user?.merchantId);

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/dashboard/products', icon: Package },
    { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const stats = [
    {
      name: 'Total Revenue',
      stat: analytics ? `$${analytics.totalRevenue.toFixed(2)}` : '$0.00',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Total Orders',
      stat: analytics ? analytics.totalOrders.toString() : '0',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Active Products',
      stat: products.filter(p => p.isActive).length.toString(),
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: 'Avg. Order Value',
      stat: analytics ? `$${analytics.averageOrderValue.toFixed(2)}` : '$0.00',
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
            <h2 className="text-lg font-semibold text-gray-900">Merchant Dashboard</h2>
          </div>
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
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
            <Route path="/" element={<DashboardOverview stats={stats} />} />
            <Route path="/products" element={<ProductManagement />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<MerchantSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function DashboardOverview({ stats }: { stats: any[] }) {
  const { orders, products, merchants } = useData();
  const { user } = useAuth();
  const [showProductForm, setShowProductForm] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(true);
  
  const merchant = merchants.find(m => m.id === user?.merchantId);

  const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const lowStockProducts = products.filter(p => p.stock < 10 && p.isActive);

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
        
        {/* Usage Indicator */}
        {merchant && (
          <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Monthly Usage</h3>
                <UsageIndicator merchant={merchant} showDetails={true} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Upgrade Prompt */}
        {merchant && showUpgradePrompt && (
          <div className="mt-6">
            <UpgradePrompt onClose={() => setShowUpgradePrompt(false)} />
          </div>
        )}
        
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

        {/* Recent Orders & Low Stock Alert */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <QuickActions 
              onOpenBot={() => {/* This would be passed from parent */}}
              onAddProduct={() => setShowProductForm(true)}
            />
          </div>
          
          {/* Recent Orders */}
          <div className="lg:col-span-1 bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Orders</h3>
              <div className="mt-5">
                {recentOrders.length > 0 ? (
                  <div className="flow-root">
                    <ul className="-my-4 divide-y divide-gray-200">
                      {recentOrders.map((order) => (
                        <li key={order.id} className="py-4 flex items-center justify-between">
                          <div className="flex flex-col">
                            <p className="text-sm font-medium text-gray-900">
                              {order.customerName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {order.items.length} item(s) • {order.currency} {order.totalAmount.toFixed(2)}
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
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recent orders</p>
                )}
              </div>
              <div className="mt-6">
                <Link
                  to="/dashboard/orders"
                  className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  View all orders
                </Link>
              </div>
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="lg:col-span-1 bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Stock Alerts</h3>
              <div className="mt-5">
                {lowStockProducts.length > 0 ? (
                  <div className="flow-root">
                    <ul className="-my-4 divide-y divide-gray-200">
                      {lowStockProducts.map((product) => (
                        <li key={product.id} className="py-4 flex items-center justify-between">
                          <div className="flex items-center">
                            <AlertCircle className="h-5 w-5 text-orange-500 mr-3" />
                            <div className="flex flex-col">
                              <p className="text-sm font-medium text-gray-900">
                                {product.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                Only {product.stock} left in stock
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    </div>
                    <p className="ml-3 text-sm text-gray-500">All products are well-stocked</p>
                  </div>
                )}
              </div>
              <div className="mt-6">
                <Link
                  to="/dashboard/products"
                  className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Manage products
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}