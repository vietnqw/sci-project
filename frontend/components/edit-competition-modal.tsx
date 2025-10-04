'use client';

import { useState, useEffect } from 'react';
import { competitionsAPI, type CompetitionUpdate, type Competition } from '../app/api/competitions';

interface EditCompetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  competition: Competition | null;
}

export default function EditCompetitionModal({ isOpen, onClose, onSuccess, competition }: EditCompetitionModalProps) {
  const [formData, setFormData] = useState<CompetitionUpdate>({
    title: '',
    description: '',
    competition_link: '',
    registration_deadline: '',
    background_image_url: '',
    location: '',
    format: undefined,
    scale: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form data when competition changes
  useEffect(() => {
    if (competition && isOpen) {
      setFormData({
        title: competition.title || '',
        description: competition.description || '',
        competition_link: competition.competition_link || '',
        registration_deadline: competition.registration_deadline ?
          new Date(competition.registration_deadline).toISOString().slice(0, 16) : '',
        background_image_url: competition.background_image_url || '',
        location: competition.location || '',
        format: competition.format || undefined,
        scale: competition.scale || undefined,
      });
      setErrors({});
    }
  }, [competition, isOpen]);

  if (!isOpen || !competition) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Title must be 255 characters or less';
    }

    if (formData.description && formData.description.length > 2000) {
      newErrors.description = 'Description must be 2000 characters or less';
    }

    if (formData.competition_link && !isValidUrl(formData.competition_link)) {
      newErrors.competition_link = 'Please enter a valid URL (e.g., https://example.com)';
    }

    if (formData.background_image_url && !isValidUrl(formData.background_image_url)) {
      newErrors.background_image_url = 'Please enter a valid URL';
    }

    if (formData.location && formData.location.length > 100) {
      newErrors.location = 'Location must be 100 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Prepare data for submission
      const submitData: CompetitionUpdate = {
        title: formData.title,
        description: formData.description || undefined,
        competition_link: formData.competition_link || undefined,
        registration_deadline: formData.registration_deadline ?
          new Date(formData.registration_deadline).toISOString() : undefined,
        background_image_url: formData.background_image_url || undefined,
        location: formData.location || undefined,
        format: formData.format || undefined,
        scale: formData.scale || undefined,
      };

      await competitionsAPI.updateCompetition(competition.id, submitData);

      onSuccess();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update competition';
      setErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      competition_link: '',
      registration_deadline: '',
      background_image_url: '',
      location: '',
      format: undefined,
      scale: undefined,
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Edit Competition</h2>
              <p className="text-sm text-gray-600 mt-1">Update the details of your competition</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title - Required */}
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
              Competition Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., International Math Olympiad 2025"
              maxLength={255}
            />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors min-h-[120px] ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Provide a brief description of the competition..."
              maxLength={2000}
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
              <p className="text-xs text-gray-500 ml-auto">{formData.description?.length || 0}/2000</p>
            </div>
          </div>

          {/* Row: Location and Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                Location
              </label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.location ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Online, Singapore, USA"
                maxLength={100}
              />
              {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location}</p>}
            </div>

            <div>
              <label htmlFor="format" className="block text-sm font-semibold text-gray-700 mb-2">
                Format
              </label>
              <select
                id="format"
                value={formData.format || ''}
                onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white cursor-pointer"
              >
                <option value="">Select format</option>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Row: Scale and Registration Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="scale" className="block text-sm font-semibold text-gray-700 mb-2">
                Scale
              </label>
              <select
                id="scale"
                value={formData.scale || ''}
                onChange={(e) => setFormData({ ...formData, scale: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white cursor-pointer"
              >
                <option value="">Select scale</option>
                <option value="REGIONAL">Regional</option>
                <option value="INTERNATIONAL">International</option>
              </select>
            </div>

            <div>
              <label htmlFor="registration_deadline" className="block text-sm font-semibold text-gray-700 mb-2">
                Registration Deadline
              </label>
              <input
                id="registration_deadline"
                type="datetime-local"
                value={formData.registration_deadline}
                onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Competition Link */}
          <div>
            <label htmlFor="competition_link" className="block text-sm font-semibold text-gray-700 mb-2">
              Competition Website
            </label>
            <input
              id="competition_link"
              type="url"
              value={formData.competition_link}
              onChange={(e) => setFormData({ ...formData, competition_link: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.competition_link ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="https://example.com"
            />
            {errors.competition_link && <p className="mt-1 text-sm text-red-500">{errors.competition_link}</p>}
          </div>

          {/* Background Image URL */}
          <div>
            <label htmlFor="background_image_url" className="block text-sm font-semibold text-gray-700 mb-2">
              Background Image URL
            </label>
            <input
              id="background_image_url"
              type="url"
              value={formData.background_image_url}
              onChange={(e) => setFormData({ ...formData, background_image_url: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.background_image_url ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="https://example.com/image.jpg"
            />
            {errors.background_image_url && <p className="mt-1 text-sm text-red-500">{errors.background_image_url}</p>}
            <p className="mt-1 text-xs text-gray-500">Optional: Provide a URL to an image for the competition background</p>
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Update Competition
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
