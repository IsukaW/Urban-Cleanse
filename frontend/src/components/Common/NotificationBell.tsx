import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

const NotificationBell: React.FC = () => {
  const { unreadCount, markAllAsRead } = useNotifications();

  if (unreadCount === 0) {
    return (
      <div className="relative">
        <Bell className="h-5 w-5 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={markAllAsRead}
        className="relative p-1 text-gray-400 hover:text-gray-600 transition-colors"
        title={`${unreadCount} unread notifications`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default NotificationBell;