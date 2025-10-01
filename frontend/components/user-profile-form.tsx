'use client';

import { useState, useEffect } from 'react';
import type { User } from '../lib/api/auth';
import type { UserUpdate } from '../lib/api/users';

interface UserProfileFormProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: UserUpdate) => Promise<void>;
  isLoading?: boolean;
}

const UserProfileForm = ({ user, isOpen, onClose, onUpdate, isLoading = false }: UserProfileFormProps) => {
  const [formData, setFormData] = useState<UserUpdate>({
    full_name: '',
    organization: '',
    phone_number: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        organization: user.organization || '',
        phone_number: user.phone_number || '',
      });
      setErrors({});
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name?.trim()) newErrors.full_name = 'Full name is required';
    if (!formData.organization?.trim()) newErrors.organization = 'Organization is required';
    if (!formData.phone_number?.trim()) {
      newErrors.phone_number = 'Phone number is required';
    } else if (!/^\+?[1-9]\d{1,19}$/.test(formData.phone_number)) {
      newErrors.phone_number = 'Please enter a valid phone number (e.g., +1234567890)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await onUpdate(formData);
    onClose();
  };

  const handleInputChange = (field: keyof UserUpdate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" disabled={isLoading}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              id="full_name"
              value={formData.full_name || ''}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.full_name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter your full name"
              required
              disabled={isLoading}
            />
            {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>}
          </div>

          <div>
            <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">Organization *</label>
            <input
              type="text"
              id="organization"
              value={formData.organization || ''}
              onChange={(e) => handleInputChange('organization', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.organization ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Your organization or institution"
              required
              disabled={isLoading}
            />
            {errors.organization && (
              <p className="mt-1 text-sm text-red-600">{errors.organization}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              id="phone_number"
              value={formData.phone_number || ''}
              onChange={(e) => handleInputChange('phone_number', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.phone_number ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="+1234567890"
              required
              disabled={isLoading}
            />
            {errors.phone_number && <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>}
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button type="submit" disabled={isLoading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
            <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfileForm;
