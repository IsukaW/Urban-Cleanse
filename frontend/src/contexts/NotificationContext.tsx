import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import notificationApi from '../services/notifications/api';
import type { NotificationData } from '../services/notifications/api';
import type { ToastNotification } from '../services/notifications/types';

interface NotificationContextType {
  // Toast notifications (temporary)
  toastNotifications: ToastNotification[];
  addToastNotification: (type: ToastNotification['type'], title: string, message: string, duration?: number) => void;
  removeToastNotification: (id: string) => void;
  clearAllToastNotifications: () => void;
  
  // Persistent notifications
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // Toast notifications state
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);
  
  // Persistent notifications state
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true);
  
  // Track which notifications have already been shown as toasts to prevent duplicates
  const [shownToastIds, setShownToastIds] = useState<Set<string>>(new Set());

  // Add toast notification
  const addToastNotification = useCallback((
    type: ToastNotification['type'], 
    title: string, 
    message: string, 
    duration = 5000
  ) => {
    // Check if a toast with the same title and message already exists
    const isDuplicate = toastNotifications.some(
      toast => toast.title === title && toast.message === message
    );
    
    if (isDuplicate) {
      console.log('Duplicate toast prevented:', { title, message });
      return; // Don't add duplicate toasts
    }
    
    const notification: ToastNotification = {
      id: Date.now().toString() + Math.random().toString(36),
      type,
      title,
      message,
      timestamp: new Date(),
      duration
    };
    
    setToastNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications
    
    // Auto-remove after specified duration
    setTimeout(() => {
      setToastNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, duration);
  }, [toastNotifications]);

  // Remove toast notification
  const removeToastNotification = useCallback((id: string) => {
    setToastNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all toast notifications
  const clearAllToastNotifications = useCallback(() => {
    setToastNotifications([]);
  }, []);

  // Fetch persistent notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      setIsLoading(true);
      const response = await notificationApi.getUserNotifications(1, 50, false);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
      
      // On first load (login), show ALL unread notifications as toasts
      if (isFirstLoad) {
        const unreadNotifications = response.notifications.filter(
          notification => !notification.isRead && !shownToastIds.has(notification._id)
        );
        
        // Show toast notifications for all unread notifications
        unreadNotifications.forEach((notification, index) => {
          const toastType = getToastTypeFromNotificationType(notification.type);
          // Stagger the notifications slightly so they don't all appear at once
          setTimeout(() => {
            addToastNotification(toastType, notification.title, notification.message, 7000); // Longer duration for login notifications
          }, index * 500); // 500ms delay between each toast
        });
        
        // Mark these notifications as shown
        const newShownIds = new Set([...shownToastIds, ...unreadNotifications.map(n => n._id)]);
        setShownToastIds(newShownIds);
        
        setIsFirstLoad(false);
      } else {
        // For subsequent fetches (polling), only show very recent notifications that haven't been shown
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const recentUnreadNotifications = response.notifications.filter(
          notification => !notification.isRead && 
                         new Date(notification.createdAt) > twoMinutesAgo &&
                         !shownToastIds.has(notification._id)
        );
        
        recentUnreadNotifications.forEach(notification => {
          const toastType = getToastTypeFromNotificationType(notification.type);
          addToastNotification(toastType, notification.title, notification.message);
        });
        
        // Mark these new notifications as shown
        if (recentUnreadNotifications.length > 0) {
          const newShownIds = new Set([...shownToastIds, ...recentUnreadNotifications.map(n => n._id)]);
          setShownToastIds(newShownIds);
        }
      }
      
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, addToastNotification, isFirstLoad, shownToastIds]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, isRead: true, readAt: new Date().toISOString() }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      addToastNotification('error', 'Error', 'Failed to mark notification as read');
    }
  }, [addToastNotification]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ 
          ...notification, 
          isRead: true, 
          readAt: new Date().toISOString() 
        }))
      );
      setUnreadCount(0);
      addToastNotification('success', 'Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      addToastNotification('error', 'Error', 'Failed to mark all notifications as read');
    }
  }, [addToastNotification]);

  // Helper function to convert notification type to toast type
  const getToastTypeFromNotificationType = (notificationType: NotificationData['type']): ToastNotification['type'] => {
    switch (notificationType) {
      case 'waste_request_approved':
      case 'waste_request_completed':
      case 'bin_approved':
      case 'payment_confirmed':
        return 'success';
      case 'waste_request_cancelled':
      case 'bin_rejected':
        return 'error';
      case 'new_waste_request':
      case 'new_bin_request':
      case 'route_assigned':
      case 'route_created':
        return 'info';
      default:
        return 'info';
    }
  };

  // Fetch notifications on login and every 2 minutes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
      
      const interval = setInterval(() => {
        fetchNotifications();
      }, 2 * 60 * 1000); // 2 minutes
      
      return () => clearInterval(interval);
    } else {
      // Reset state when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setToastNotifications([]);
      setIsFirstLoad(true); // Reset for next login
      setShownToastIds(new Set()); // Clear shown toast tracking
    }
  }, [isAuthenticated, user, fetchNotifications]);

  const value = {
    toastNotifications,
    addToastNotification,
    removeToastNotification,
    clearAllToastNotifications,
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};