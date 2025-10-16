export interface WasteType {
  _id: string;
  type: 'food' | 'polythene' | 'paper' | 'hazardous' | 'ewaste'; // Updated to match backend
  name: string;
  description: string;
  baseCost: number;
  restrictions: string[];
  maxWeight?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WasteRequest {
  _id?: string;
  requestId: string;
  userId: string | {
    _id: string;
    name: string;
    email: string;
  };
  binId: string;
  collectionType: 'food' | 'polythene' | 'paper' | 'hazardous' | 'ewaste'; // Updated to match backend
  preferredDate: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  cost: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  notes?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateWasteRequestData {
  binId: string;
  collectionType: string;
  preferredDate: string;
  notes?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export interface CheckScheduleResponse {
  success: boolean;
  data: {
    binId: string;
    date: string;
    isAvailable: boolean;
    message: string;
  };
}

export interface UpdateRequestStatusData {
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  notes?: string;
}

export interface PaymentData {
  requestId: string;
  paymentMethod: string;
  cardNumber?: string;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data?: {
    paymentConfirmation?: {
      transactionId: string;
      amount: number;
      paymentMethod: string;
      status: string;
      timestamp: string;
    };
    wasteRequest?: WasteRequest;
    requestId?: string;
    amount?: number;
    status?: string;
  };
}

export interface NotificationData {
  requestId: string;
  type: 'confirmation' | 'approved' | 'completed' | 'payment_reminder';
  method: 'email' | 'sms' | 'both';
}

export interface WasteTypesResponse {
  success: boolean;
  count: number;
  data: {
    wasteTypes: WasteType[];
  };
}

export interface WasteRequestResponse {
  success: boolean;
  message: string;
  data: {
    wasteRequest: WasteRequest;
  };
}

export interface WasteRequestsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: {
    requests: WasteRequest[];
  };
}

export interface SingleRequestResponse {
  success: boolean;
  data: {
    wasteRequest: WasteRequest;
  };
}

export interface AdminStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  completedRequests: number;
  cancelledRequests: number;
  requestsByType: Array<{ _id: string; count: number }>;
  requestsByStatus: Array<{ _id: string; count: number }>;
  totalRevenue: number;
  recentRequests: WasteRequest[];
}

export interface AdminStatsResponse {
  success: boolean;
  data: AdminStats;
}
