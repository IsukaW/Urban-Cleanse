import api from '../api';

class BinService {
  // Find nearest bin
  async findNearestBin(coordinates: { lat: number; lng: number }): Promise<{
    success: boolean;
    data: { bin: any };
  }> {
    const response = await api.get(`/bins/nearest?lat=${coordinates.lat}&lng=${coordinates.lng}`);
    return response.data;
  }

  // Get bin by ID
  async getBinById(binId: string): Promise<{
    success: boolean;
    data: { bin: any };
  }> {
    const response = await api.get(`/bins/${binId}`);
    return response.data;
  }

  // Register a new bin
  async registerBin(data: {
    address: string;
    area: string;
    coordinates: { lat: number; lng: number };
    capacity: number;
    type: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: { bin: any };
  }> {
    const response = await api.post('/bins/register', data);
    return response.data;
  }

  // Get user's registered bins
  async getUserRegisteredBins(): Promise<{ success: boolean; data: any }> {
    const response = await api.get('/bins/user/registered');
    return response.data;
  }

  // Update user's bin data (fill status and battery)
  async updateUserBinData(binId: string, data: {
    status: string;
    battery: number;
  }): Promise<{
    success: boolean;
    message: string;
    data: { bin: any };
  }> {
    const response = await api.put(`/bins/user/${binId}/update`, data);
    return response.data;
  }

  // Get bin status
  async getBinStatus(binId: string): Promise<{
    success: boolean;
    data: { bin: any };
  }> {
    const response = await api.get(`/bins/${binId}/status`);
    return response.data;
  }

  // Update bin data (admin only)
  async updateBinData(binId: string, data: {
    fillLevel?: number;
    battery?: number;
    status?: string;
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
  }): Promise<{
    success: boolean;
    message: string;
    data: { bin: any };
  }> {
    const response = await api.put(`/bins/${binId}`, data);
    return response.data;
  }

  // Create bin (admin only)
  async createBin(data: {
    binId: string;
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
    capacity: number;
    type: string;
    status?: string;
    fillLevel?: number;
    battery?: number;
  }): Promise<{
    success: boolean;
    message: string;
    data: { bin: any };
  }> {
    const response = await api.post('/bins', data);
    return response.data;
  }

  // Get all bins (admin only)
  async getAllBins(params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    count: number;
    total: number;
    page: number;
    pages: number;
    data: { bins: any[] };
  }> {
    const response = await api.get('/bins', { params });
    return response.data;
  }

  // Get active alerts (admin only)
  async getActiveAlerts(): Promise<{
    success: boolean;
    count: number;
    data: { alerts: any[] };
  }> {
    const response = await api.get('/bins/alerts/active');
    return response.data;
  }

  // Acknowledge alert (admin only)
  async acknowledgeAlert(binId: string, alertId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.put(`/bins/${binId}/alerts/${alertId}/acknowledge`);
    return response.data;
  }

  // Get pending bin registrations (admin only)
  async getPendingBins(): Promise<{
    success: boolean;
    count: number;
    data: { bins: any[] };
  }> {
    const response = await api.get('/bins/admin/pending');
    return response.data;
  }

  // Approve bin registration (admin only)
  async approveBin(binId: string, data: {
    approved: boolean;
    notes?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: { bin: any };
  }> {
    const response = await api.put(`/bins/admin/${binId}/approve`, data);
    return response.data;
  }

  // Delete bin (admin only)
  async deleteBin(binId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.delete(`/bins/${binId}`);
    return response.data;
  }

  // Get bin statistics (admin only)
  async getBinStats(): Promise<{
    success: boolean;
    data: {
      totalBins: number;
      activeBins: number;
      pendingBins: number;
      fullBins: number;
      binsByType: Array<{ _id: string; count: number }>;
      binsByStatus: Array<{ _id: string; count: number }>;
      recentBins: any[];
    };
  }> {
    const response = await api.get('/bins/admin/stats');
    return response.data;
  }
}

export default new BinService();
