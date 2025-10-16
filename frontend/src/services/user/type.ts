import type { User } from '../auth/type';

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByRole: Array<{ _id: string; count: number }>;
  recentUsers: User[];
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
  search?: string;
}

export interface GetUsersResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: { users: User[] };
}

export interface UserResponse {
  success: boolean;
  data: { user: User };
}

export interface UserStatsResponse {
  success: boolean;
  data: UserStats;
}

export interface DeleteUserResponse {
  success: boolean;
  message: string;
}

// Re-export User type for convenience
export type { User };
