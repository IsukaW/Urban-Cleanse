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

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
}