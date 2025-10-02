// Replace the hardcoded API_BASE_URL with a runtime configuration
export const getApiBaseUrl = (): string => {
  // Use window.location for runtime detection in browser
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;

    // If running on same host as frontend, use relative URL
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }

    // For Docker deployment, use the backend service name
    if (hostname === 'sci-frontend') {
      return 'http://sci-backend:8000';
    }

    // For external access, construct URL from current host
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`.replace(':3000', ':8000');
  }

  // Fallback for server-side rendering
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

export interface ApiErrorPayload {
  detail?: string;
  error?: {
    type: string;
    message: string;
    code: string;
    details: string;
    field_errors?: Record<string, string>;
  };
}

export interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean;
}

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, code?: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { requireAuth = false, ...requestOptions } = options;

  const url = `${getApiBaseUrl()}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (requireAuth) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      throw new ApiError('Authentication required', 401, 'AUTH_001');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    headers: {
      ...headers,
      ...requestOptions.headers,
    },
    ...requestOptions,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData: ApiErrorPayload = await response.json().catch(() => ({ detail: 'Network error' }));

      // Handle FastAPI 422 validation errors with array detail
      if (response.status === 422) {
        const rawDetail: any = (errorData as any).detail;
        let message = 'Validation error';
        if (Array.isArray(rawDetail)) {
          message = rawDetail
            .map((d: any) => {
              const loc = Array.isArray(d?.loc) ? d.loc.slice(1).join('.') : d?.loc;
              const msg = d?.msg || 'Invalid value';
              return loc ? `${loc}: ${msg}` : msg;
            })
            .join(', ');
        } else if (typeof rawDetail === 'string') {
          message = rawDetail;
        }
        throw new ApiError(message, response.status, 'VALIDATION_ERROR');
      }

      if (errorData.error) {
        if (errorData.error.type === 'validation_error' && errorData.error.field_errors) {
          throw new ApiError(
            `Validation failed: ${Object.entries(errorData.error.field_errors)
              .map(([field, message]) => `${field}: ${message}`)
              .join(', ')}`,
            response.status,
            errorData.error.code,
            errorData.error.field_errors
          );
        } else {
          throw new ApiError(
            errorData.error.message,
            response.status,
            errorData.error.code
          );
        }
      } else if (errorData.detail) {
        const detail = (errorData as any).detail;
        const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
        throw new ApiError(message, response.status);
      } else {
        throw new ApiError(`HTTP error! status: ${response.status}`, response.status);
      }
    }

    // Handle 204 No Content responses (no body to parse)
    if (response.status === 204) {
      return undefined as T;
    }

    // Check if response has content before parsing JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    // For non-JSON responses, return empty object
    return {} as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('API request failed:', error);
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

export function handleAuthError(error: ApiError): void {
  if (error.status === 401 || error.code?.startsWith('AUTH_')) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
  }
}

export function formatValidationErrors(fieldErrors: Record<string, string>): string {
  return Object.entries(fieldErrors)
    .map(([field, message]) => `${field}: ${message}`)
    .join(', ');
}

export function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    'CREATOR': 1,
    'ADMIN': 2,
  } as const;

  return (roleHierarchy as any)[userRole] >= (roleHierarchy as any)[requiredRole];
}
