import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Order, Merchant, Analytics, SubscriptionPlan } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from './AuthContext';

interface DataContextType {
  products: Product[];
  orders: Order[];
  merchants: Merchant[];
  analytics: Analytics | null;
  subscriptionPlans: SubscriptionPlan[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  addMerchant: (merchant: Omit<Merchant, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMerchant: (id: string, updates: Partial<Merchant>) => void;
  deleteMerchant: (id: string) => void;
  refreshData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [subscriptionPlans] = useState<SubscriptionPlan[]>(dataService.getSubscriptionPlans());

  const refreshData = () => {
    if (!user) return;

    if (user.role === 'merchant') {
      setProducts(dataService.getProducts(user.merchantId!));
      setOrders(dataService.getOrders(user.merchantId!));
      setAnalytics(dataService.getAnalytics(user.merchantId!));
    } else if (user.role === 'super_admin') {
      setMerchants(dataService.getMerchants());
      setAnalytics(dataService.getPlatformAnalytics());
      setOrders(dataService.getAllOrders());
    }
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.merchantId) return;
    const product = dataService.createProduct(user.merchantId, productData);
    setProducts(prev => [...prev, product]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    dataService.updateProduct(id, updates);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProduct = (id: string) => {
    dataService.deleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const updateOrder = (id: string, updates: Partial<Order>) => {
    dataService.updateOrder(id, updates);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    refreshData(); // Refresh analytics
  };

  const addMerchant = (merchantData: Omit<Merchant, 'id' | 'createdAt' | 'updatedAt'>) => {
    const merchant = dataService.createMerchant(merchantData);
    setMerchants(prev => [...prev, merchant]);
  };

  const updateMerchant = (id: string, updates: Partial<Merchant>) => {
    dataService.updateMerchant(id, updates);
    setMerchants(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const deleteMerchant = (id: string) => {
    dataService.deleteMerchant(id);
    setMerchants(prev => prev.filter(m => m.id !== id));
  };

  return (
    <DataContext.Provider value={{
      products,
      orders,
      merchants,
      analytics,
      subscriptionPlans,
      addProduct,
      updateProduct,
      deleteProduct,
      updateOrder,
      addMerchant,
      updateMerchant,
      deleteMerchant,
      refreshData
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}