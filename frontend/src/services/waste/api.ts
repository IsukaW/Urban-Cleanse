import api from '../api';
import type { 
  WasteType, 
  WasteRequest, 
  CreateWasteRequestData,
  CheckScheduleResponse,
  UpdateRequestStatusData
} from './type';

class WasteService {
  async getWasteTypes(): Promise<{ success: boolean; data: { wasteTypes: WasteType[] } }> {
    const response = await api.get('/waste/types');
    return response.data;
  }

  async checkSchedule(binId: string, date: string): Promise<CheckScheduleResponse> {
    const response = await api.get(`/waste/check-schedule?binId=${binId}&date=${date}`);
    return response.data;
  }

  async createWasteRequest(data: CreateWasteRequestData): Promise<{ 
    success: boolean; 
    message: string; 
    data: { wasteRequest: WasteRequest } 
  }> {
    const response = await api.post('/waste/request', data);
    return response.data;
  }

  async getUserRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{
    success: boolean;
    count: number;
    total: number;
    page: number;
    pages: number;
    data: { requests: WasteRequest[] };
  }> {
    const response = await api.get('/waste/requests', { params });
    return response.data;
  }

  async getAllRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
    collectionType?: string;
  }): Promise<{
    success: boolean;
    count: number;
    total: number;
    page: number;
    pages: number;
    data: { requests: WasteRequest[] };
  }> {
    const response = await api.get('/waste/admin/requests', { params });
    return response.data;
  }

  async updateRequestStatus(
    requestId: string, 
    data: UpdateRequestStatusData
  ): Promise<{ 
    success: boolean; 
    message: string; 
    data: { wasteRequest: WasteRequest } 
  }> {
    const response = await api.put(`/waste/admin/requests/${requestId}`, data);
    return response.data;
  }

  async getRequestById(requestId: string): Promise<{
    success: boolean;
    data: { wasteRequest: WasteRequest };
  }> {
    const response = await api.get(`/waste/requests/${requestId}`);
    return response.data;
  }

  async getAdminStats(): Promise<{
    success: boolean;
    data: {
      totalRequests: number;
      pendingRequests: number;
      approvedRequests: number;
      completedRequests: number;
      cancelledRequests: number;
      requestsByType: Array<{ _id: string; count: number }>;
      requestsByStatus: Array<{ _id: string; count: number }>;
      totalRevenue: number;
      recentRequests: WasteRequest[];
    };
  }> {
    const response = await api.get('/waste/admin/stats');
    return response.data;
  }

  async processPayment(data: {
    requestId: string;
    paymentMethod: string;
    cardNumber?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: {
      paymentConfirmation: {
        transactionId: string;
        amount: number;
        paymentMethod: string;
        status: string;
        timestamp: string;
        requestId: string;
      };
      wasteRequest: WasteRequest;
    };
  }> {
    const response = await api.post('/payment/process', data);
    return response.data;
  }

  async retryPayment(data: {
    requestId: string;
    paymentMethod: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    const response = await api.post('/payment/retry', data);
    return response.data;
  }

  async getPaymentStatus(requestId: string): Promise<{
    success: boolean;
    data: {
      requestId: string;
      paymentStatus: string;
      amount: number;
      collectionType: string;
    };
  }> {
    const response = await api.get(`/payment/status/${requestId}`);
    return response.data;
  }

  async getAllWasteTypesAdmin(): Promise<{
    success: boolean;
    count: number;
    data: { wasteTypes: WasteType[] };
  }> {
    const response = await api.get('/waste/admin/types');
    return response.data;
  }

  async createWasteType(data: {
    type: string;
    name: string;
    description: string;
    baseCost: number;
    restrictions?: string[];
    maxWeight?: number;
    isActive?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    data: { wasteType: WasteType };
  }> {
    const response = await api.post('/waste/types', data);
    return response.data;
  }

  async updateWasteType(id: string, data: Partial<{
    type: string;
    name: string;
    description: string;
    baseCost: number;
    restrictions: string[];
    maxWeight: number;
    isActive: boolean;
  }>): Promise<{
    success: boolean;
    message: string;
    data: { wasteType: WasteType };
  }> {
    const response = await api.put(`/waste/types/${id}`, data);
    return response.data;
  }

  async deleteWasteType(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.delete(`/waste/types/${id}`);
    return response.data;
  }

  async createDefaultWasteTypes(): Promise<{
    success: boolean;
    message: string;
    data: { wasteTypes: WasteType[]; count: number };
  }> {
    const response = await api.post('/waste/admin/initialize-defaults');
    return response.data;
  }

  async resetAllWasteTypes(confirmReset: string): Promise<{
    success: boolean;
    message: string;
    data: { deletedCount: number };
  }> {
    const response = await api.delete('/waste/admin/reset-all', {
      data: { confirmReset }
    });
    return response.data;
  }
}

export default new WasteService();
