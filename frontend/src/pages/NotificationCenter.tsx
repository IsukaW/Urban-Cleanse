import React, { useState, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import notificationApi from '../services/notifications/api';
import { Bell, Check, CheckCheck, Clock, AlertCircle, Info, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { NotificationData, NotificationResponse } from '../services/notifications/api';

const NotificationCenter: React.FC = () => {
  const { 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    addToastNotification 
  } = useNotifications();
  
  // Local state for paginated notifications
  const [paginatedNotifications, setPaginatedNotifications] = useState<NotificationData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Fetch paginated notifications
  const fetchPaginatedNotifications = async (page: number = 1, filterUnread: boolean = false) => {
    try {
      setIsLoading(true);
      const response: NotificationResponse = await notificationApi.getUserNotifications(page, 7, filterUnread);
      setPaginatedNotifications(response.notifications);
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.pages);
      setTotalNotifications(response.pagination.total);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      addToastNotification('error', 'Error', 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Load notifications on component mount and filter change
  useEffect(() => {
    fetchPaginatedNotifications(1, filter === 'unread');
  }, [filter]);

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchPaginatedNotifications(page, filter === 'unread');
  };

  const filteredNotifications = paginatedNotifications;

  const getIcon = (type: string) => {
    switch (type) {
      case 'waste_request_approved':
      case 'waste_request_completed':
      case 'bin_approved':
      case 'payment_confirmed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'waste_request_cancelled':
      case 'bin_rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'new_waste_request':
      case 'new_bin_request':
      case 'route_assigned':
      case 'route_created':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  // Handle local mark as read and refresh data
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      // Refresh current page data
      await fetchPaginatedNotifications(currentPage, filter === 'unread');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      // Refresh current page data
      await fetchPaginatedNotifications(currentPage, filter === 'unread');
      addToastNotification('success', 'Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Demo function to test notifications
  const createTestNotification = () => {
    const types = ['success', 'error', 'warning', 'info'] as const;
    const type = types[Math.floor(Math.random() * types.length)];
    const messages = [
      'This is a test notification',
      'Your waste collection has been scheduled',
      'New route assigned to you',
      'Payment confirmation received'
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    addToastNotification(type, 'Test Notification', message);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-6 h-6 text-gray-700" />
              <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Test button for development */}
              <button
                onClick={createTestNotification}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Test Toast
              </button>
              
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Filter tabs */}
          <div className="mt-4 flex space-x-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All ({totalNotifications})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="divide-y divide-gray-200">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-gray-500">
                {filter === 'unread' 
                  ? 'All caught up! You have no unread notifications.' 
                  : 'Notifications will appear here when you have activity.'
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification: any) => (
              <div
                key={notification._id}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 pt-1">
                    {getIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {notification.title}
                      </h4>
                      <div className="flex items-center space-x-2 ml-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(notification.createdAt).toLocaleString()}
                        </div>
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                      {notification.message}
                    </p>
                    
                    {notification.relatedId && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          ID: {notification.relatedId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {currentPage} of {totalPages} ({totalNotifications} total)
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                    currentPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 text-sm rounded-md transition-colors ${
                          currentPage === pageNum
                            ? 'bg-green-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                    currentPage === totalPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;