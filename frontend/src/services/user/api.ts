import api from '../api';
import type { 
  User,
  UserStats,
  GetUsersParams,
  GetUsersResponse,
  UserResponse,
  UserStatsResponse,
  DeleteUserResponse
} from './type';

class UserService {
  async getAllUsers(params?: GetUsersParams): Promise<GetUsersResponse> {
    const response = await api.get('/users', { params });
    return response.data;
  }

  async getUserById(id: string): Promise<UserResponse> {
    const response = await api.get(`/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<UserResponse> {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  }

  async deleteUser(id: string): Promise<DeleteUserResponse> {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }

  async getUserStats(): Promise<UserStatsResponse> {
    const response = await api.get('/users/stats');
    return response.data;
  }

  async getDashboardStats(): Promise<{
    success: boolean;
    data: {
      role: string;
      stats: any;
      [key: string]: any;
    };
  }> {
    const response = await api.get('/users/dashboard');
    return response.data;
  }
}

export default new UserService();
