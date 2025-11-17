import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import LoginPage from './pages/LoginPage';
import MerchantDashboard from './pages/MerchantDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import WhatsAppBot from './pages/WhatsAppBot';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <AppContent />
          </div>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [showBot, setShowBot] = useState(false);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Navbar onOpenBot={() => setShowBot(true)} />
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route 
          path="/" 
          element={
            user ? (
              user.role === 'super_admin' ? 
                <Navigate to="/admin" /> : 
                <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/dashboard/*" 
          element={
            user && user.role === 'merchant' ? 
              <MerchantDashboard /> : 
              <Navigate to="/login" />
          } 
        />
        <Route 
          path="/admin/*" 
          element={
            user && user.role === 'super_admin' ? 
              <SuperAdminDashboard /> : 
              <Navigate to="/login" />
          } 
        />
      </Routes>
      
      {showBot && <WhatsAppBot onClose={() => setShowBot(false)} />}
    </>
  );
}

export default App;