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

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  organization: string;
  phone_number: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

class AuthAPI {
  async signUp(data: SignUpData): Promise<User> {
    return apiRequest<User>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(): Promise<User> {
    return apiRequest<User>('/api/v1/auth/me', {
      requireAuth: true,
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }
}

export const authAPI = new AuthAPI();
