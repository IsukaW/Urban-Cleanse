import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Settings, Trash2 } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'wc1':
        return 'Waste Collector - Category 1';
      case 'wc2':
        return 'Waste Collector - Category 2';
      case 'wc3':
        return 'Waste Collector - Category 3';
      default:
        return 'User';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Settings className="h-5 w-5" />;
      case 'wc1':
      case 'wc2':
      case 'wc3':
        return <Trash2 className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  return (
    <nav className="bg-white shadow-lg border-b-2 border-green-500">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <Trash2 className="h-8 w-8 text-green-600" />
              <span className="text-xl font-bold text-gray-800">UrbanCleanse</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-700">
              {user && getRoleIcon(user.role)}
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs text-gray-500">{user && getRoleDisplay(user.role)}</span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
