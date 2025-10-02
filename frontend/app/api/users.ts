import { apiRequest } from './utils';

export interface User {
  id: string;
  email: string;
  full_name: string;
  organization?: string;
  phone_number?: string;
  role: 'ADMIN' | 'CREATOR';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  phone_number?: string;
  organization?: string;
}

export interface UserListParams {
  skip?: number;
  limit?: number;
  role?: 'ADMIN' | 'CREATOR';
  is_active?: boolean;
  search?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
}

export interface UserRoleUpdate {
  role: 'ADMIN' | 'CREATOR';
}

export interface UserStatusUpdate {
  is_active: boolean;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

class UsersAPI {
  async getUsers(params: UserListParams = {}): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();
    if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params.role) queryParams.append('role', params.role);
    if (params.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    const url = `/api/v1/users${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<UserListResponse>(url, {
      requireAuth: true,
    });
  }

  async updateUser(userId: string, data: UserUpdate): Promise<User> {
    return apiRequest<User>(`/api/v1/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requireAuth: true,
    });
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    return apiRequest<void>(`/api/v1/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
      requireAuth: true,
    });
  }

  async changeUserRole(userId: string, role: 'ADMIN' | 'CREATOR'): Promise<void> {
    return apiRequest<void>(`/api/v1/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
      requireAuth: true,
    });
  }

  async deleteUser(userId: string): Promise<void> {
    return apiRequest<void>(`/api/v1/users/${userId}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  }

  async changePassword(userId: string, data: PasswordChange): Promise<void> {
    return apiRequest<void>(`/api/v1/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requireAuth: true,
    });
  }
}

export const usersAPI = new UsersAPI();
