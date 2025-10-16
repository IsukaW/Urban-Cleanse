import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Trash2, User, Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationBell from '../Common/NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Left side - Mobile menu button + Logo */}
            <div className="flex items-center space-x-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
              >
                {sidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
              
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="bg-green-100 p-1.5 sm:p-2 rounded-lg">
                  <Trash2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">UrbanCleanse</h1>
              </div>
            </div>

            {/* Right side - User info and logout */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notification Bell */}
              <NotificationBell />
              
              {/* User info */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="bg-gray-100 p-1 sm:p-1.5 rounded-full">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                </div>
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-32">{user?.name}</div>
                  <div className="text-xs text-gray-500 truncate max-w-32">{user?.email}</div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 uppercase">
                  {user?.role}
                </span>
              </div>
              
              {/* Separator - hidden on mobile */}
              <div className="h-6 sm:h-8 w-px bg-gray-300 hidden sm:block"></div>
              
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-gray-600 bg-opacity-75" 
              onClick={() => setSidebarOpen(false)} 
            />
            
            {/* Sidebar */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white h-full">
              {/* Close button */}
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
              
              {/* Sidebar content */}
              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <div className="flex-shrink-0 flex items-center px-4 mb-6">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Trash2 className="h-6 w-6 text-green-600" />
                  </div>
                  <h1 className="ml-2 text-xl font-bold text-gray-900">UrbanCleanse</h1>
                </div>
                <Sidebar onItemClick={() => setSidebarOpen(false)} />
              </div>
            </div>
          </div>
        )}
        
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64">
            <Sidebar />
          </div>
        </div>
        
        <main className="flex-1 p-3 sm:p-4 lg:p-6 min-w-0 h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
