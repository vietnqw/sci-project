import { useState } from 'react';
import {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  getUploadStatus,
  uploadUserAvatar,
  uploadCompetitionBackground,
  uploadCompetitionDetailImages,
  type UploadConfirmResponse,
  type UploadStatusResponse
} from '../api/upload';
import { ApiError } from '../api/utils';

export interface UseUploadOptions {
  onSuccess?: (response: UploadConfirmResponse) => void;
  onError?: (error: ApiError) => void;
  onProgress?: (progress: number) => void;
}

export interface UseUploadReturn {
  upload: (file: File, entity: 'user' | 'competition', entityId: string, purpose: 'avatar' | 'background' | 'detail') => Promise<UploadConfirmResponse>;
  uploadMultiple: (files: File[], entity: 'user' | 'competition', entityId: string, purpose: 'avatar' | 'background' | 'detail') => Promise<UploadConfirmResponse[]>;
  deleteFile: (s3Key: string) => Promise<void>;
  uploadUserAvatar: (file: File, userId: string) => Promise<UploadConfirmResponse>;
  uploadCompetitionBackground: (file: File, competitionId: string) => Promise<UploadConfirmResponse>;
  uploadCompetitionDetailImages: (files: File[], competitionId: string) => Promise<UploadConfirmResponse[]>;
  getStatus: () => Promise<UploadStatusResponse>;
  isLoading: boolean;
  error: ApiError | null;
  progress: number;
}

export function useUpload(options: UseUploadOptions = {}): UseUploadReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [progress, setProgress] = useState(0);

  const handleError = (err: ApiError) => {
    setError(err);
    options.onError?.(err);
  };

  const handleSuccess = (response: UploadConfirmResponse) => {
    setError(null);
    options.onSuccess?.(response);
  };

  const upload = async (
    file: File,
    entity: 'user' | 'competition',
    entityId: string,
    purpose: 'avatar' | 'background' | 'detail'
  ): Promise<UploadConfirmResponse> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate progress
      setProgress(25);
      const result = await uploadImage(file, entity, entityId, purpose);
      setProgress(100);
      handleSuccess(result);
      return result;
    } catch (err) {
      const error = err instanceof ApiError ? err : new ApiError('Upload failed', 0);
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const uploadMultiple = async (
    files: File[],
    entity: 'user' | 'competition',
    entityId: string,
    purpose: 'avatar' | 'background' | 'detail'
  ): Promise<UploadConfirmResponse[]> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      setProgress(25);
      const results = await uploadMultipleImages(files, entity, entityId, purpose);
      setProgress(100);
      results.forEach(handleSuccess);
      return results;
    } catch (err) {
      const error = err instanceof ApiError ? err : new ApiError('Batch upload failed', 0);
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const deleteFile = async (s3Key: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteImage(s3Key);
    } catch (err) {
      const error = err instanceof ApiError ? err : new ApiError('Delete failed', 0);
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadUserAvatarFile = async (file: File, userId: string): Promise<UploadConfirmResponse> => {
    return upload(file, 'user', userId, 'avatar');
  };

  const uploadCompetitionBackgroundFile = async (file: File, competitionId: string): Promise<UploadConfirmResponse> => {
    return upload(file, 'competition', competitionId, 'background');
  };

  const uploadCompetitionDetailImagesFiles = async (files: File[], competitionId: string): Promise<UploadConfirmResponse[]> => {
    return uploadMultiple(files, 'competition', competitionId, 'detail');
  };

  const getStatus = async (): Promise<UploadStatusResponse> => {
    try {
      return await getUploadStatus();
    } catch (err) {
      const error = err instanceof ApiError ? err : new ApiError('Status check failed', 0);
      handleError(error);
      throw error;
    }
  };

  return {
    upload,
    uploadMultiple,
    deleteFile,
    uploadUserAvatar: uploadUserAvatarFile,
    uploadCompetitionBackground: uploadCompetitionBackgroundFile,
    uploadCompetitionDetailImages: uploadCompetitionDetailImagesFiles,
    getStatus,
    isLoading,
    error,
    progress,
  };
}

// Convenience hooks for specific use cases
export function useUserAvatarUpload(options: UseUploadOptions = {}) {
  const { uploadUserAvatar, ...rest } = useUpload(options);

  return {
    uploadAvatar: uploadUserAvatar,
    ...rest,
  };
}

export function useCompetitionUpload(options: UseUploadOptions = {}) {
  const { uploadCompetitionBackground, uploadCompetitionDetailImages, ...rest } = useUpload(options);

  return {
    uploadBackground: uploadCompetitionBackground,
    uploadDetailImages: uploadCompetitionDetailImages,
    ...rest,
  };
}
