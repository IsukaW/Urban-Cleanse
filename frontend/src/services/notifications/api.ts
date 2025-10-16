import api from '../api';

export interface NotificationData {
  _id: string;
  userId: string;
  type: 'waste_request_approved' | 'waste_request_completed' | 'waste_request_cancelled' |
        'new_waste_request' | 'route_assigned' | 'route_created' | 'bin_approved' | 
        'bin_rejected' | 'new_bin_request' | 'payment_confirmed';
  title: string;
  message: string;
  relatedId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  notifications: NotificationData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

const notificationApi = {
  // Get user notifications
  getUserNotifications: async (page = 1, limit = 7, unreadOnly = false): Promise<NotificationResponse> => {
    const response = await api.get(`/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch notifications');
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<NotificationData> => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to mark notification as read');
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    const response = await api.put('/notifications/read-all');
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to mark all notifications as read');
    }
  },

  // Create notification for waste request status change
  notifyWasteRequestStatusChange: async (requestId: string, status: string, userId?: string): Promise<NotificationData> => {
    const response = await api.post('/notifications/waste-request', {
      requestId,
      status,
      userId
    });
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to create notification');
  },

  // Notify admins of new waste request
  notifyAdminsNewRequest: async (requestId: string): Promise<void> => {
    const response = await api.post('/notifications/admin/new-request', { requestId });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to notify admins');
    }
  },

  // Notify worker of route assignment
  notifyWorkerRouteAssigned: async (routeId: string, workerId: string): Promise<NotificationData> => {
    const response = await api.post('/notifications/worker/route-assigned', {
      routeId,
      workerId
    });
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to notify worker');
  }
};

export default notificationApi;