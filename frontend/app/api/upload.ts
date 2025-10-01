import { ApiError } from './utils';

export interface UploadResponse {
  url: string;
  key: string;
  filename: string;
  content_type: string;
  size: number;
}

export interface UploadStatusResponse {
  status: 'ok' | 'unavailable';
  bucket?: string;
  region?: string;
}

export type UploadCategory = 'user-image' | 'competition-background' | 'competition-asset';

export interface UploadOptions {
  category?: UploadCategory;
  competitionId?: string;
}

export async function uploadImage(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResponse> {
  const { category = 'user-image', competitionId } = options;

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new ApiError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.', 400);
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new ApiError('File size too large. Maximum size is 10MB.', 400);
  }

  if ((category === 'competition-background' || category === 'competition-asset') && !competitionId) {
    throw new ApiError('Competition ID is required for competition-related uploads.', 400);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  if (competitionId) {
    formData.append('competition_id', competitionId);
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) {
    throw new ApiError('Authentication required', 401, 'AUTH_001');
  }

  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/upload/images`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));

      if ((errorData as any).error) {
        throw new ApiError(
          (errorData as any).error.message,
          response.status,
          (errorData as any).error.code
        );
      } else {
        throw new ApiError((errorData as any).detail || 'Upload failed', response.status);
      }
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('Upload failed:', error);
    throw new ApiError(
      error instanceof Error ? error.message : 'Upload failed',
      0
    );
  }
}

export async function deleteImage(key: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) {
    throw new ApiError('Authentication required', 401, 'AUTH_001');
  }

  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/upload/images/${encodeURIComponent(key)}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Delete failed' }));

      if ((errorData as any).error) {
        throw new ApiError(
          (errorData as any).error.message,
          response.status,
          (errorData as any).error.code
        );
      } else {
        throw new ApiError((errorData as any).detail || 'Delete failed', response.status);
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('Delete failed:', error);
    throw new ApiError(
      error instanceof Error ? error.message : 'Delete failed',
      0
    );
  }
}

export async function getUploadStatus(): Promise<UploadStatusResponse> {
  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/upload/images/status`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return { status: 'unavailable' };
    }

    return await response.json();
  } catch (error) {
    console.error('Upload status check failed:', error);
    return { status: 'unavailable' };
  }
}
