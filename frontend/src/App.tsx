import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import NotificationList from './components/Common/NotificationList';
import { useNotifications } from './contexts/NotificationContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import RequestCollectionPage from './pages/RequestCollection/RequestCollectionPage';
import MyRequests from './pages/User/MyRequests';
import MyBins from './pages/User/MyBins';
import AdminRequests from './pages/Admin/AdminRequests';
import BinStatusDashboard from './pages/Admin/BinStatusDashboard';
import PerformCollectionPage from './pages/Worker/PerformCollectionPage';
import RegisterBin from './pages/User/RegisterBin';
import WasteTypeManagement from './pages/Admin/WasteTypeManagement';
import BinApprovals from './pages/Admin/BinApprovals';
import RouteManagement from './pages/Admin/RouteManagement';
import UserManagement from './pages/Admin/UserManagement';
import UserBinManagement from './pages/Admin/UserBinManagement';
import CollectionRoutes from './pages/Worker/CollectionRoutes';
import NotificationCenter from './pages/NotificationCenter';

// Component to display notifications
const NotificationDisplay: React.FC = () => {
  const { toastNotifications, removeToastNotification } = useNotifications();
  
  return (
    <NotificationList 
      notifications={toastNotifications} 
      onRemove={removeToastNotification} 
    />
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="App">
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  style: {
                    background: '#10B981',
                  },
                },
                error: {
                  duration: 5000,
                  style: {
                    background: '#EF4444',
                  },
                },
              }}
            />
            
            {/* Custom notification system */}
            <NotificationDisplay />
            
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes with Layout */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      {/* Dashboard - All users */}
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/notifications" element={<NotificationCenter />} />
                      
                      {/* User Routes */}
                      <Route path="/my-bins" element={
                        <ProtectedRoute requiredRoles={['user']}>
                          <MyBins />
                        </ProtectedRoute>
                      } />
                      <Route path="/request-collection" element={
                        <ProtectedRoute requiredRoles={['user']}>
                          <RequestCollectionPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/my-requests" element={
                        <ProtectedRoute requiredRoles={['user']}>
                          <MyRequests />
                        </ProtectedRoute>
                      } />
                      <Route path="/register-bin" element={
                        <ProtectedRoute requiredRoles={['user']}>
                          <RegisterBin />
                        </ProtectedRoute>
                      } />
                      
                      {/* Admin Routes */}
                      <Route path="/dashboard/requests" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <AdminRequests />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/bin-monitoring" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <BinStatusDashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/waste-types" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <WasteTypeManagement />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/bin-approvals" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <BinApprovals />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/routes" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <RouteManagement />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/users" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <UserManagement />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/bin-management" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <UserBinManagement />
                        </ProtectedRoute>
                      } />
                      
                      {/* Worker Routes */}
                      <Route path="/worker/routes" element={
                        <ProtectedRoute requiredRoles={['wc1', 'wc2', 'wc3']}>
                          <CollectionRoutes />
                        </ProtectedRoute>
                      } />
                      <Route path="/worker/perform-collection" element={
                        <ProtectedRoute requiredRoles={['wc1', 'wc2', 'wc3']}>
                          <PerformCollectionPage />
                        </ProtectedRoute>
                      } />
                      
                      {/* Default redirect to dashboard */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      
                      {/* Catch-all redirect */}
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
