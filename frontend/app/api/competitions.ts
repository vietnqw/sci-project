import { apiRequest } from './utils';

export interface UserSummary {
  id: string;
  full_name: string;
  email: string;
}

export interface Competition {
  id: string;
  title: string;
  overview?: string;
  description?: string;
  competition_link?: string;
  registration_deadline?: string;
  background_image_url?: string;
  detail_image_urls?: string[];
  location_country?: string;
  location_city?: string;
  format?: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  scale?: 'PROVINCIAL' | 'REGIONAL' | 'INTERNATIONAL' | 'NATIONAL';
  min_age?: number;
  max_age?: number;
  owner_id: string;
  owner?: UserSummary;
  is_active: boolean;
  is_featured: boolean;
  is_approved: boolean;
  is_rejected: boolean;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CompetitionListResponse {
  competitions: Competition[];
  total: number;
  skip: number;
  limit: number;
}

export interface CompetitionCreate {
  title: string;
  overview?: string;
  description?: string;
  competition_link?: string;
  registration_deadline?: string;
  background_image_url?: string;
  detail_image_urls?: string[];
  location_country?: string;
  location_city?: string;
  format?: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  scale?: 'PROVINCIAL' | 'REGIONAL' | 'INTERNATIONAL' | 'NATIONAL';
  min_age?: number;
  max_age?: number;
}

export interface CompetitionUpdate {
  title?: string;
  overview?: string;
  description?: string;
  competition_link?: string | null;
  registration_deadline?: string;
  background_image_url?: string;
  detail_image_urls?: string[];
  location_country?: string;
  location_city?: string;
  format?: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  scale?: 'PROVINCIAL' | 'REGIONAL' | 'INTERNATIONAL' | 'NATIONAL';
  min_age?: number | null;
  max_age?: number | null;
}

class CompetitionsAPI {
  async getCompetitions(params?: {
    skip?: number;
    limit?: number;
    format?: 'ONLINE' | 'OFFLINE' | 'HYBRID';
    scale?: 'PROVINCIAL' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL';
    location_country?: string;
    location_city?: string;
    search?: string;
    is_active?: boolean;
    is_featured?: boolean;
    is_approved?: boolean;
  }): Promise<CompetitionListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, typeof value === 'boolean' ? String(value) : value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/v1/competitions${queryString ? `?${queryString}` : ''}`;

    return apiRequest<CompetitionListResponse>(endpoint, { requireAuth: true });
  }

  async getPublicCompetitions(params?: {
    skip?: number;
    limit?: number;
    format?: 'ONLINE' | 'OFFLINE' | 'HYBRID';
    scale?: 'PROVINCIAL' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL';
    location_country?: string;
    location_city?: string;
    search?: string;
    is_active?: boolean;
    is_featured?: boolean;
    is_approved?: boolean;
  }): Promise<CompetitionListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, typeof value === 'boolean' ? String(value) : value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/v1/competitions${queryString ? `?${queryString}` : ''}`;

    return apiRequest<CompetitionListResponse>(endpoint); // No requireAuth for public access
  }

  async getFeaturedCompetitions(params?: { skip?: number; limit?: number }): Promise<CompetitionListResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('is_featured', 'true');
    searchParams.append('is_approved', 'true'); // Only show approved competitions
    searchParams.append('is_active', 'true');   // Only show active competitions
    if (params) {
      if (params.skip !== undefined) searchParams.append('skip', String(params.skip));
      if (params.limit !== undefined) searchParams.append('limit', String(params.limit));
    }
    const endpoint = `/api/v1/competitions?${searchParams.toString()}`;
    return apiRequest<CompetitionListResponse>(endpoint);
  }

  async getCompetition(id: string): Promise<Competition> {
    return apiRequest<Competition>(`/api/v1/competitions/detail/${id}`, {
      requireAuth: true,
    });
  }

  async createCompetition(data: CompetitionCreate): Promise<Competition> {
    return apiRequest<Competition>('/api/v1/competitions', {
      method: 'POST',
      body: JSON.stringify(data),
      requireAuth: true,
    });
  }

  async updateCompetition(id: string, data: CompetitionUpdate): Promise<Competition> {
    return apiRequest<Competition>(`/api/v1/competitions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requireAuth: true,
    });
  }

  async deleteCompetition(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/v1/competitions/${id}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  }

  async getMyCompetitions(userId: string, params?: { skip?: number; limit?: number; }): Promise<CompetitionListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const queryString = searchParams.toString();
    const endpoint = `/api/v1/competitions/${userId}${queryString ? `?${queryString}` : ''}`;
    return apiRequest<CompetitionListResponse>(endpoint, { requireAuth: true });
  }

  async toggleCompetitionActiveStatus(id: string, isActive: boolean): Promise<void> {
    return apiRequest<void>(`/api/v1/competitions/${id}/status/active`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
      requireAuth: true,
    });
  }

  async getPendingCompetitions(params?: { skip?: number; limit?: number; }): Promise<CompetitionListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const queryString = searchParams.toString();
    const endpoint = `/api/v1/competitions/admin/pending${queryString ? `?${queryString}` : ''}`;
    return apiRequest<CompetitionListResponse>(endpoint, { requireAuth: true });
  }

  async approveCompetition(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/v1/competitions/admin/${id}/approve`, {
      method: 'PUT',
      requireAuth: true,
    });
  }

  async rejectCompetition(id: string, rejectionReason?: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/v1/competitions/admin/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejection_reason: rejectionReason }),
      requireAuth: true,
    });
  }

  async featureCompetition(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/v1/competitions/admin/${id}/feature`, {
      method: 'PUT',
      body: JSON.stringify({ is_featured: true }),
      requireAuth: true,
    });
  }

  async unfeatureCompetition(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/v1/competitions/admin/${id}/unfeature`, {
      method: 'PUT',
      requireAuth: true,
    });
  }

  async activateCompetition(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/v1/competitions/${id}/status/active`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: true }),
      requireAuth: true,
    });
  }

  async deactivateCompetition(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/v1/competitions/${id}/status/active`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: false }),
      requireAuth: true,
    });
  }

  async createCompetitionWithFiles(
    data: CompetitionCreate,
    backgroundImageFile?: File,
    detailImageFiles?: File[]
  ): Promise<Competition> {
    // Step 1: Create competition without images to get the ID
    const competitionWithoutImages = { ...data };
    delete competitionWithoutImages.background_image_url;
    delete competitionWithoutImages.detail_image_urls;

    const createdCompetition = await this.createCompetition(competitionWithoutImages);
    const competitionId = createdCompetition.id;

    // Step 2: Upload images if provided
    let backgroundImageUrl = data.background_image_url;
    let detailImageUrls = data.detail_image_urls || [];

    try {
      // Import upload service
      const { uploadImage, uploadMultipleImages } = await import('./upload');

      // Upload background image if provided as file
      if (backgroundImageFile) {
        const uploadResult = await uploadImage(
          backgroundImageFile,
          'competition',
          competitionId,
          'background'
        );
        backgroundImageUrl = uploadResult.url;
      }

      // Upload detail images if provided as files
      if (detailImageFiles && detailImageFiles.length > 0) {
        const uploadResults = await uploadMultipleImages(
          detailImageFiles,
          'competition',
          competitionId,
          'detail'
        );
        const newDetailUrls = uploadResults.map(result => result.url);
        detailImageUrls = [...detailImageUrls, ...newDetailUrls];
      }

      // Step 3: Update competition with image URLs if any were uploaded
      if (backgroundImageFile || (detailImageFiles && detailImageFiles.length > 0)) {
        const updateData: CompetitionUpdate = {};

        if (backgroundImageFile) {
          updateData.background_image_url = backgroundImageUrl;
        }

        if (detailImageFiles && detailImageFiles.length > 0) {
          updateData.detail_image_urls = detailImageUrls;
        }

        return await this.updateCompetition(competitionId, updateData);
      }

      return createdCompetition;
    } catch (error) {
      // If image upload fails, we should clean up the created competition
      // For now, just re-throw the error
      throw error;
    }
  }

  async updateCompetitionWithFiles(
    id: string,
    data: CompetitionUpdate,
    backgroundImageFile?: File,
    detailImageFiles?: File[],
    removeBackgroundImage?: boolean,
    removeDetailImages?: string[]
  ): Promise<Competition> {
    const formData = new FormData();

    // Add text fields
    if (data.title) formData.append('title', data.title);
    if (data.overview) formData.append('overview', data.overview);
    if (data.description !== undefined) formData.append('description', data.description ?? '');
    if (data.competition_link !== undefined) formData.append('competition_link', data.competition_link ?? '');
    if (data.registration_deadline) formData.append('registration_deadline', data.registration_deadline);
    if (data.location_country) formData.append('location_country', data.location_country);
    if (data.location_city) formData.append('location_city', data.location_city);
    if (data.format) formData.append('format', data.format);
    if (data.scale) formData.append('scale', data.scale);

    // Add files
    if (backgroundImageFile) {
      formData.append('background_image', backgroundImageFile);
    }

    if (detailImageFiles && detailImageFiles.length > 0) {
      detailImageFiles.forEach(file => {
        formData.append('detail_images', file);
      });
    }

    // Add removal flags
    if (removeBackgroundImage) {
      formData.append('remove_background_image', 'true');
    }

    if (removeDetailImages && removeDetailImages.length > 0) {
      formData.append('remove_detail_images', JSON.stringify(removeDetailImages));
    }

    return apiRequest<Competition>(`/api/v1/competitions/${id}/with-files`, {
      method: 'POST',
      body: formData,
      requireAuth: true,
    });
  }
}

// Helper function to format location for display
export const formatLocation = (competition: Competition): string => {
  if (competition.location_country && competition.location_city) {
    return `${competition.location_city}, ${competition.location_country}`;
  } else if (competition.location_country) {
    return competition.location_country;
  } else if (competition.location_city) {
    return competition.location_city;
  }
  return 'Unknown';
};

export const competitionsAPI = new CompetitionsAPI();
