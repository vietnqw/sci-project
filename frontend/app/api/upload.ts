import { ApiError } from './utils';

export interface PresignedUrlResponse {
  presignedUrl: string;
  s3Key: string;
  publicUrl: string;
}

export interface BatchPresignedUrlResponse {
  presignedUrls: PresignedUrlResponse[];
}

export interface UploadConfirmResponse {
  message: string;
  url: string;
  s3Key: string;
}

export interface UploadStatusResponse {
  status: 'ok' | 'unavailable';
  bucket?: string;
  cloudfront?: string;
}

export type EntityType = 'user' | 'competition';
export type PurposeType = 'avatar' | 'background' | 'detail';

export interface PresignedUrlRequest {
  entity: EntityType;
  entity_id: string;
  purpose: PurposeType;
  filename: string;
  content_type: string;
  expiration?: number;
}

export interface BatchPresignedUrlRequest {
  entity: EntityType;
  entity_id: string;
  purpose: PurposeType;
  filenames: string[];
  content_types: string[];
  expiration?: number;
}

export interface UploadConfirmRequest {
  entity: EntityType;
  entity_id: string;
  purpose: PurposeType;
  s3_key: string;
  mime_type: string;
  size: number;
}

/**
 * Generate a presigned URL for direct S3 upload
 */
export async function generatePresignedUrl(
  request: PresignedUrlRequest
): Promise<PresignedUrlResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) {
    throw new ApiError('Authentication required', 401, 'AUTH_001');
  }

  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/uploads/presigned-url`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to generate presigned URL' }));

      // Handle FastAPI validation errors (422)
      if (response.status === 422 && Array.isArray(errorData.detail)) {
        const validationErrors = errorData.detail
          .map((err: any) => `${err.loc?.join('.') || 'field'}: ${err.msg}`)
          .join('; ');
        throw new ApiError(validationErrors || 'Validation error', response.status);
      }

      throw new ApiError((errorData as any).detail || 'Failed to generate presigned URL', response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('Presigned URL generation failed:', error);
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to generate presigned URL',
      0
    );
  }
}

/**
 * Generate multiple presigned URLs for batch uploads
 */
export async function generateBatchPresignedUrls(
  request: BatchPresignedUrlRequest
): Promise<BatchPresignedUrlResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) {
    throw new ApiError('Authentication required', 401, 'AUTH_001');
  }

  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/uploads/presigned-urls/batch`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to generate presigned URLs' }));
      throw new ApiError((errorData as any).detail || 'Failed to generate presigned URLs', response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('Batch presigned URL generation failed:', error);
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to generate presigned URLs',
      0
    );
  }
}

/**
 * Confirm that an upload was successful and update the database
 */
export async function confirmUpload(
  request: UploadConfirmRequest
): Promise<UploadConfirmResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) {
    throw new ApiError('Authentication required', 401, 'AUTH_001');
  }

  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/uploads/confirm`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to confirm upload' }));
      throw new ApiError((errorData as any).detail || 'Failed to confirm upload', response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('Upload confirmation failed:', error);
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to confirm upload',
      0
    );
  }
}

/**
 * Upload a file directly to S3 using presigned URL
 */
export async function uploadFileToS3(
  file: File,
  presignedUrl: string
): Promise<void> {
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`S3 upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
  } catch (error) {
    console.error('S3 upload failed:', error);
    throw new ApiError(
      error instanceof Error ? error.message : 'S3 upload failed',
      0
    );
  }
}

/**
 * Complete upload flow: generate presigned URL, upload to S3, confirm with backend
 */
export async function uploadImage(
  file: File,
  entity: EntityType,
  entityId: string,
  purpose: PurposeType
): Promise<UploadConfirmResponse> {
  // Validate file
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new ApiError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.', 400);
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new ApiError('File size too large. Maximum size is 10MB.', 400);
  }

  try {
    // Step 1: Generate presigned URL
    const presignedResponse = await generatePresignedUrl({
      entity,
      entity_id: entityId,
      purpose,
      filename: file.name,
      content_type: file.type,
    });

    // Step 2: Upload file directly to S3
    await uploadFileToS3(file, presignedResponse.presignedUrl);

    // Step 3: Confirm upload with backend
    const confirmResponse = await confirmUpload({
      entity,
      entity_id: entityId,
      purpose,
      s3_key: presignedResponse.s3Key,
      mime_type: file.type,
      size: file.size,
    });

    return confirmResponse;
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

/**
 * Upload multiple files (batch upload)
 */
export async function uploadMultipleImages(
  files: File[],
  entity: EntityType,
  entityId: string,
  purpose: PurposeType
): Promise<UploadConfirmResponse[]> {
  // Validate all files
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  for (const file of files) {
    if (!allowedTypes.includes(file.type)) {
      throw new ApiError(`Invalid file type for ${file.name}. Only JPEG, PNG, and WebP images are allowed.`, 400);
    }
    if (file.size > maxSize) {
      throw new ApiError(`File ${file.name} is too large. Maximum size is 10MB.`, 400);
    }
  }

  try {
    // Step 1: Generate batch presigned URLs
    const batchResponse = await generateBatchPresignedUrls({
      entity,
      entity_id: entityId,
      purpose,
      filenames: files.map(f => f.name),
      content_types: files.map(f => f.type),
    });

    const results: UploadConfirmResponse[] = [];

    // Step 2: Upload each file to S3 and confirm
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const presignedData = batchResponse.presignedUrls[i];

      // Upload to S3
      await uploadFileToS3(file, presignedData.presignedUrl);

      // Confirm upload
      const confirmResponse = await confirmUpload({
        entity,
        entity_id: entityId,
        purpose,
        s3_key: presignedData.s3Key,
        mime_type: file.type,
        size: file.size,
      });

      results.push(confirmResponse);
    }

    return results;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('Batch upload failed:', error);
    throw new ApiError(
      error instanceof Error ? error.message : 'Batch upload failed',
      0
    );
  }
}

/**
 * Delete an uploaded file
 */
export async function deleteImage(s3Key: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) {
    throw new ApiError('Authentication required', 401, 'AUTH_001');
  }

  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/uploads/${encodeURIComponent(s3Key)}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Delete failed' }));
      throw new ApiError((errorData as any).detail || 'Delete failed', response.status);
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

/**
 * Get upload service status
 */
export async function getUploadStatus(): Promise<UploadStatusResponse> {
  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/uploads/status`;

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

// Convenience functions for common use cases
export async function uploadUserAvatar(file: File, userId: string): Promise<UploadConfirmResponse> {
  return uploadImage(file, 'user', userId, 'avatar');
}

export async function uploadCompetitionBackground(file: File, competitionId: string): Promise<UploadConfirmResponse> {
  return uploadImage(file, 'competition', competitionId, 'background');
}

export async function uploadCompetitionDetailImages(files: File[], competitionId: string): Promise<UploadConfirmResponse[]> {
  return uploadMultipleImages(files, 'competition', competitionId, 'detail');
}
