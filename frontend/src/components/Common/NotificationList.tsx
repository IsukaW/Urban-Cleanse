import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info, Clock } from 'lucide-react';
import type { ToastNotification } from '../../services/notifications/types';

interface NotificationListProps {
  notifications: ToastNotification[];
  onRemove: (id: string) => void;
}

const NotificationList: React.FC<NotificationListProps> = ({ notifications, onRemove }) => {
  const getIcon = (type: ToastNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = (type: ToastNotification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 shadow-green-100';
      case 'error':
        return 'bg-red-50 border-red-200 shadow-red-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 shadow-yellow-100';
      case 'info':
        return 'bg-blue-50 border-blue-200 shadow-blue-100';
      default:
        return 'bg-gray-50 border-gray-200 shadow-gray-100';
    }
  };

  const getProgressBarColor = (type: ToastNotification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes shrink-width {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        
        .animate-shrink-width {
          animation-duration: var(--duration, 5000ms);
          animation-name: shrink-width;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
      `}</style>
      
      <div className="fixed top-20 right-4 z-50 space-y-3 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`relative p-4 rounded-lg border shadow-lg animate-in slide-in-from-right duration-300 ${getBackgroundColor(notification.type)} backdrop-blur-sm`}
          >
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 h-1 bg-gray-200 rounded-b-lg w-full overflow-hidden">
              <div 
                className={`h-full ${getProgressBarColor(notification.type)} animate-shrink-width`}
                style={{
                  '--duration': `${notification.duration || 5000}ms`
                } as React.CSSProperties}
              />
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 pt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                    {notification.title}
                  </h4>
                  <button
                    onClick={() => onRemove(notification.id)}
                    className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                  {notification.message}
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {notification.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default NotificationList;