import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home,
  Users,
  Trash2,
  BarChart3,
  Settings,
  MapPin,
  Calendar,
  Bell,
  Plus,
  Clock,
  FileText,
  CreditCard,
  Package,
  CheckCircle
} from 'lucide-react';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: string;
  badgeColor?: string;
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: <Home className="h-5 w-5" />,
    roles: ['admin', 'user', 'wc1', 'wc2', 'wc3']
  },
  // User specific menu items
  {
    name: 'My Bins',
    path: '/my-bins',
    icon: <Package className="h-5 w-5" />,
    roles: ['user'],
    badge: 'View',
    badgeColor: 'bg-purple-100 text-purple-800'
  },
  {
    name: 'Request Collection',
    path: '/request-collection',
    icon: <Plus className="h-5 w-5" />,
    roles: ['user'],
    badge: 'New',
    badgeColor: 'bg-green-100 text-green-800'
  },
  {
    name: 'My Requests',
    path: '/my-requests',
    icon: <FileText className="h-5 w-5" />,
    roles: ['user']
  },
  // {
  //   name: 'Collection Schedule',
  //   path: '/schedule',
  //   icon: <Calendar className="h-5 w-5" />,
  //   roles: ['user']
  // },
  // {
  //   name: 'Payment History',
  //   path: '/payments',
  //   icon: <CreditCard className="h-5 w-5" />,
  //   roles: ['user']
  // },
  // {
  //   name: 'Register Bin',
  //   path: '/register-bin',
  //   icon: <Plus className="h-5 w-5" />,
  //   roles: ['user'],
  //   badge: 'New',
  //   badgeColor: 'bg-blue-100 text-blue-800'
  // },
  // Admin specific menu items
  {
    name: 'Users Management',
    path: '/dashboard/users',
    icon: <Users className="h-5 w-5" />,
    roles: ['admin']
  },
  {
    name: 'All Requests',
    path: '/dashboard/requests',
    icon: <FileText className="h-5 w-5" />,
    roles: ['admin'],
    badge: 'Admin',
    badgeColor: 'bg-red-100 text-red-800'
  },
  {
    name: 'Waste Types',
    path: '/dashboard/waste-types',
    icon: <Package className="h-5 w-5" />,
    roles: ['admin']
  },
  {
    name: 'Bin Approvals',
    path: '/dashboard/bin-approvals',
    icon: <CheckCircle className="h-5 w-5" />,
    roles: ['admin'],
    badge: 'Pending',
    badgeColor: 'bg-orange-100 text-orange-800'
  },
  {
    name: 'Bin Management',
    path: '/dashboard/bin-management',
    icon: <Package className="h-5 w-5" />,
    roles: ['admin'],
    badge: 'Users',
    badgeColor: 'bg-purple-100 text-purple-800'
  },
  {
    name: 'Route Management',
    path: '/dashboard/routes',
    icon: <MapPin className="h-5 w-5" />,
    roles: ['admin'],
    badge: 'New',
    badgeColor: 'bg-blue-100 text-blue-800'
  },
  // {
  //   name: 'Reports',
  //   path: '/dashboard/reports',
  //   icon: <BarChart3 className="h-5 w-5" />,
  //   roles: ['admin']
  // },
  // Worker specific menu items
  // {
  //   name: 'My Collections',
  //   path: '/worker/collections',
  //   icon: <Trash2 className="h-5 w-5" />,
  //   roles: ['wc1', 'wc2', 'wc3']
  // },
  // {
  //   name: 'Today\'s Schedule',
  //   path: '/worker/schedule',
  //   icon: <Clock className="h-5 w-5" />,
  //   roles: ['wc1', 'wc2', 'wc3']
  // },
  // {
  //   name: 'Route Tracking',
  //   path: '/worker/tracking',
  //   icon: <MapPin className="h-5 w-5" />,
  //   roles: ['wc1', 'wc2', 'wc3']
  // },
  {
    name: 'Collection Routes',
    path: '/worker/routes',
    icon: <MapPin className="h-5 w-5" />,
    roles: ['wc1', 'wc2', 'wc3'],
    badge: 'Today',
    badgeColor: 'bg-blue-100 text-blue-800'
  },
  {
    name: 'Perform Collection',
    path: '/worker/perform-collection',
    icon: <Trash2 className="h-5 w-5" />,
    roles: ['wc1', 'wc2', 'wc3'],
    badge: 'Active',
    badgeColor: 'bg-green-100 text-green-800'
  },
  // Common menu items
  {
    name: 'Notifications',
    path: '/notifications',
    icon: <Bell className="h-5 w-5" />,
    roles: ['admin', 'user', 'wc1', 'wc2', 'wc3']
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: <Settings className="h-5 w-5" />,
    roles: ['admin', 'user', 'wc1', 'wc2', 'wc3']
  }
];

// Group menu items by category
const getMenuGroups = (userRole: string) => {
  const filteredItems = menuItems.filter(item => item.roles.includes(userRole));
  
  const groups: { [key: string]: MenuItem[] } = {
    main: [],
    requests: [],
    management: [],
    worker: [],
    system: []
  };

  filteredItems.forEach(item => {
    if (item.path === '/dashboard') {
      groups.main.push(item);
    } else if (
      item.path.includes('request') || 
      item.path.includes('payment') || 
      item.path === '/my-requests' || 
      item.path === '/schedule' ||
      item.path === '/dashboard/requests' // Add this to include admin requests in management
    ) {
      if (userRole === 'admin' && item.path === '/dashboard/requests') {
        groups.management.push(item);
      } else if (userRole === 'user') {
        groups.requests.push(item);
      }
    } else if (
      item.path.includes('/dashboard/') || 
      item.path.includes('management') || 
      item.path.includes('reports') ||
      item.path.includes('waste-types') ||
      item.path.includes('users')
    ) {
      groups.management.push(item);
    } else if (item.path.includes('/worker/')) {
      groups.worker.push(item);
    } else {
      groups.system.push(item);
    }
  });

  return groups;
};

interface SidebarProps {
  onItemClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const menuGroups = getMenuGroups(user.role);

  const handleItemClick = () => {
    if (onItemClick) {
      onItemClick();
    }
  };

  const renderMenuGroup = (title: string, items: MenuItem[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {title}
        </h3>
        <nav className="space-y-1">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleItemClick}
                className={`group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-green-100 text-green-800 border-r-2 border-green-600'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 ${isActive ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    {item.icon}
                  </div>
                  <span className="truncate">{item.name}</span>
                </div>
                
                {item.badge && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.badgeColor || 'bg-gray-100 text-gray-800'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    );
  };

  const getRoleTitle = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator Panel';
      case 'wc1':
        return 'Residential Collector';
      case 'wc2':
        return 'Commercial Collector';
      case 'wc3':
        return 'Industrial Collector';
      default:
        return 'User Dashboard';
    }
  };

  return (
    <div className="bg-white border-r border-gray-200 w-64 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div className="p-4 h-full flex flex-col">
        {/* Role indicator */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              user.role === 'admin' ? 'bg-red-500' :
              user.role.startsWith('wc') ? 'bg-blue-500' : 'bg-green-500'
            }`}></div>
            <span className="text-sm font-medium text-gray-900">{getRoleTitle(user.role)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Welcome, {user.name}</p>
        </div>

        {/* Navigation groups */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {renderMenuGroup('Overview', menuGroups.main)}
          
          {user.role === 'user' && renderMenuGroup('Waste Collection', menuGroups.requests)}
          
          {user.role === 'admin' && renderMenuGroup('Management', menuGroups.management)}
          
          {user.role.startsWith('wc') && renderMenuGroup('Work Tasks', menuGroups.worker)}
          
          {renderMenuGroup('System', menuGroups.system)}
          
          {/* Quick stats or info */}
          {user.role === 'user' && (
            <div className="mt-6 p-3 bg-green-50 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-1">Quick Info</h4>
              <p className="text-xs text-green-600">Next collection: Tomorrow</p>
              <p className="text-xs text-green-600">Pending requests: 0</p>
            </div>
          )}

          {user.role.startsWith('wc') && (
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Today's Tasks</h4>
              <p className="text-xs text-blue-600">Collections: 8/12</p>
              <p className="text-xs text-blue-600">Route progress: 67%</p>
            </div>
          )}

          {user.role === 'admin' && (
            <div className="mt-6 p-3 bg-purple-50 rounded-lg">
              <h4 className="text-sm font-medium text-purple-800 mb-1">System Status</h4>
              <p className="text-xs text-purple-600">Active users: Online</p>
              <p className="text-xs text-purple-600">Pending requests: 5</p>
              <div className="mt-2 pt-2 border-t border-purple-200">
                <button 
                  onClick={() => navigate('/dashboard/requests')}
                  className="text-xs text-purple-700 hover:text-purple-900 font-medium"
                >
                  → View All Requests
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Version info - Fixed at bottom */}
        <div className="mt-auto pt-4 border-t border-gray-200 flex-shrink-0">
          <p className="text-xs text-gray-400 text-center">UrbanCleanse v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
