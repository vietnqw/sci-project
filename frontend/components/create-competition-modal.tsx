'use client';

import { useState } from 'react';
import { competitionsAPI, type CompetitionCreate } from '../app/api/competitions';
import LocationSelector from './location-selector';

interface CreateCompetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCompetitionModal({ isOpen, onClose, onSuccess }: CreateCompetitionModalProps) {
  const [formData, setFormData] = useState<CompetitionCreate>({
    title: '',
    description: '',
    competition_link: '',
    registration_deadline: '',
    background_image_url: '',
    location_country: '',
    location_city: '',
    format: undefined,
    scale: undefined,
    min_age: undefined,
    max_age: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File upload states
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [detailImageFiles, setDetailImageFiles] = useState<File[]>([]);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);
  const [detailImagePreviews, setDetailImagePreviews] = useState<string[]>([]);


  if (!isOpen) return null;

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

    if (!formData.location_country?.trim()) {
      newErrors.location_country = 'Country is required';
    }
    if (!formData.location_city?.trim()) {
      newErrors.location_city = 'City/State is required';
    }

    if (!formData.format) {
      newErrors.format = 'Format is required';
    }
    if (!formData.scale) {
      newErrors.scale = 'Scale is required';
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

  const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDetailImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setDetailImageFiles(prev => [...prev, ...files]);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setDetailImagePreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeDetailImage = (index: number) => {
    setDetailImageFiles(prev => prev.filter((_, i) => i !== index));
    setDetailImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeBackgroundImage = () => {
    setBackgroundImageFile(null);
    setBackgroundImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();


    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Prepare data for submission
      const submitData: CompetitionCreate = {
        title: formData.title,
        description: formData.description || undefined,
        competition_link: formData.competition_link || undefined,
        registration_deadline: formData.registration_deadline ?
          new Date(formData.registration_deadline).toISOString() : undefined,
        background_image_url: formData.background_image_url || undefined,
        location_country: formData.location_country || undefined,
        location_city: formData.location_city || undefined,
        format: formData.format || undefined,
        scale: formData.scale || undefined,
        min_age: formData.min_age || undefined,
        max_age: formData.max_age || undefined,
      };

      // Use file upload API if files are provided, otherwise use regular API
      if (backgroundImageFile || detailImageFiles.length > 0) {
        await competitionsAPI.createCompetitionWithFiles(
          submitData,
          backgroundImageFile || undefined,
          detailImageFiles.length > 0 ? detailImageFiles : undefined
        );
      } else {
        await competitionsAPI.createCompetition(submitData);
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        competition_link: '',
        registration_deadline: '',
        background_image_url: '',
        location_country: '',
        location_city: '',
        format: undefined,
        scale: undefined,
        min_age: undefined,
        max_age: undefined,
      });
      setBackgroundImageFile(null);
      setDetailImageFiles([]);
      setBackgroundImagePreview(null);
      setDetailImagePreviews([]);
      setErrors({});

      onSuccess();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create competition';
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
      location_country: '',
      location_city: '',
      format: undefined,
      scale: undefined,
      min_age: undefined,
      max_age: undefined,
    });
    setBackgroundImageFile(null);
    setDetailImageFiles([]);
    setBackgroundImagePreview(null);
    setDetailImagePreviews([]);
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
              <h2 className="text-2xl font-bold text-gray-900">Create New Competition</h2>
              <p className="text-sm text-gray-600 mt-1">Fill in the details to create a new competition</p>
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

          {/* Row: Country and City */}
          <div>
            <LocationSelector
              country={formData.location_country || ''}
              city={formData.location_city || ''}
              onCountryChange={(country) => setFormData({ ...formData, location_country: country })}
              onCityChange={(city) => setFormData({ ...formData, location_city: city })}
            />
            {errors.location_country && <p className="mt-1 text-sm text-red-500">{errors.location_country}</p>}
            {errors.location_city && <p className="mt-1 text-sm text-red-500">{errors.location_city}</p>}
          </div>

          {/* Row: Format and Scale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="format" className="block text-sm font-semibold text-gray-700 mb-2">
                Format <span className="text-red-500">*</span>
              </label>
              <select
                id="format"
                value={formData.format || ''}
                onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white cursor-pointer ${
                  errors.format ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select format</option>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
                <option value="HYBRID">Hybrid</option>
              </select>
              {errors.format && <p className="mt-1 text-sm text-red-500">{errors.format}</p>}
            </div>

            <div>
              <label htmlFor="scale" className="block text-sm font-semibold text-gray-700 mb-2">
                Scale <span className="text-red-500">*</span>
              </label>
              <select
                id="scale"
                value={formData.scale || ''}
                onChange={(e) => setFormData({ ...formData, scale: e.target.value as any })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white cursor-pointer ${
                  errors.scale ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select scale</option>
                <option value="PROVINCIAL">Provincial</option>
                <option value="REGIONAL">Regional</option>
                <option value="NATIONAL">National</option>
                <option value="INTERNATIONAL">International</option>
              </select>
              {errors.scale && <p className="mt-1 text-sm text-red-500">{errors.scale}</p>}
            </div>
          </div>

          {/* Row: Min Age and Max Age */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="min_age" className="block text-sm font-semibold text-gray-700 mb-2">
                Minimum Age
              </label>
              <input
                id="min_age"
                type="number"
                min="0"
                max="100"
                value={formData.min_age || ''}
                onChange={(e) => setFormData({ ...formData, min_age: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="e.g., 16"
              />
            </div>

            <div>
              <label htmlFor="max_age" className="block text-sm font-semibold text-gray-700 mb-2">
                Maximum Age
              </label>
              <input
                id="max_age"
                type="number"
                min="0"
                max="100"
                value={formData.max_age || ''}
                onChange={(e) => setFormData({ ...formData, max_age: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="e.g., 25"
              />
            </div>
          </div>

          {/* Row: Registration Deadline */}
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

          {/* Background Image Upload */}
          <div>
            <label htmlFor="background_image" className="block text-sm font-semibold text-gray-700 mb-2">
              Background Image
            </label>
            <div className="space-y-3">
              <input
                id="background_image"
                type="file"
                accept="image/*"
                onChange={handleBackgroundImageChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
              {backgroundImagePreview && (
                <div className="relative">
                  <img
                    src={backgroundImagePreview}
                    alt="Background preview"
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={removeBackgroundImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">Optional: Upload an image for the competition background</p>
          </div>

          {/* Detail Images Upload */}
          <div>
            <label htmlFor="detail_images" className="block text-sm font-semibold text-gray-700 mb-2">
              Detail Images
            </label>
            <div className="space-y-3">
              <input
                id="detail_images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleDetailImagesChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
              {detailImagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {detailImagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Detail preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeDetailImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">Optional: Upload multiple images to showcase the competition</p>
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
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Competition
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
