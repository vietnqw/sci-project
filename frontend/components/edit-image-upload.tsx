'use client';

import { useState, useRef, useCallback } from 'react';

interface EditImageUploadProps {
  label: string;
  currentImageUrl?: string;
  newFile: File | null;
  newPreview: string | null;
  onFileChange: (file: File | null) => void;
  onPreviewChange: (preview: string | null) => void;
  onRemoveCurrent: () => void;
  onRemoveNew: () => void;
  isRemovingCurrent: boolean;
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
  error?: string;
  helpText?: string;
}

export default function EditImageUpload({
  label,
  currentImageUrl,
  newFile,
  newPreview,
  onFileChange,
  onPreviewChange,
  onRemoveCurrent,
  onRemoveNew,
  isRemovingCurrent,
  maxSize = 10,
  className = "",
  disabled = false,
  error,
  helpText
}: EditImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    onFileChange(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      onPreviewChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [onFileChange, onPreviewChange, maxSize]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveNew = () => {
    onFileChange(null);
    onPreviewChange(null);
    onRemoveNew();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>

      {/* Current Image */}
      {currentImageUrl && !isRemovingCurrent && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Current image:</p>
          <div className="relative group">
            <img
              src={currentImageUrl}
              alt="Current image"
              className="w-full h-48 object-cover rounded-lg border"
            />
            <button
              type="button"
              onClick={onRemoveCurrent}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-lg"
              disabled={disabled}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* New Image Upload */}
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Upload new image:</p>

        <div
          className={`
            relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer
            ${isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
            }
            ${error ? 'border-red-300' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />

          {newPreview ? (
            // New Image Preview
            <div className="relative p-4">
              <div className="relative group">
                <img
                  src={newPreview}
                  alt="New image preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveNew();
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-lg"
                  disabled={disabled}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* File Info */}
              {newFile && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span className="font-medium">{newFile.name}</span>
                    <span>{formatFileSize(newFile.size)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Upload Prompt
            <div className="p-6 text-center">
              <div className="mx-auto w-10 h-10 text-gray-400 mb-3">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {isDragOver ? 'Drop your image here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, JPEG, WebP up to {maxSize}MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Help Text */}
      {helpText && !error && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
}
