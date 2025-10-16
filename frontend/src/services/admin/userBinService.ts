import api from '../api';

export interface UserBinData {
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  bins: Array<{
    _id: string;
    binId: string;
    location: {
      address: string;
      coordinates: { lat: number; lng: number };
      area: string;
    };
    capacity: number;
    type: string;
    fillLevel: number;
    battery: number;
    status?: 'Empty' | 'Half-Full' | 'Full' | 'Overflow';
    isActive: boolean;
    approvedBy?: { _id: string; name: string };
    approvedAt?: string;
    rejectedBy?: { _id: string; name: string };
    rejectedAt?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  totalBins: number;
  activeBins: number;
  pendingBins: number;
  rejectedBins: number;
}

export interface UserBinResponse {
  success: boolean;
  message: string;
  data: UserBinData[];
}

class UserBinService {
  async getUserBinData(): Promise<UserBinResponse> {
    try {
      const response = await api.get('/bins/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching user bin data:', error);
      throw error;
    }
  }

  async getUserBinsByUserId(userId: string): Promise<UserBinResponse> {
    try {
      const response = await api.get(`/bins/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user bins by ID:', error);
      throw error;
    }
  }

  async searchUserBins(searchTerm: string): Promise<UserBinResponse> {
    try {
      const response = await api.get(`/bins/users/search?q=${encodeURIComponent(searchTerm)}`);
      return response.data;
    } catch (error) {
      console.error('Error searching user bins:', error);
      throw error;
    }
  }
}

const userBinService = new UserBinService();
export default userBinService;