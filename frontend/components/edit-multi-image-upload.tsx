'use client';

import { useState, useRef, useCallback } from 'react';

interface EditMultiImageUploadProps {
  label: string;
  currentImageUrls: string[];
  newFiles: File[];
  newPreviews: string[];
  onFilesChange: (files: File[]) => void;
  onPreviewsChange: (previews: string[]) => void;
  onRemoveCurrent: (url: string) => void;
  onRemoveNew: (index: number) => void;
  removedCurrentUrls: string[];
  maxFiles?: number;
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
  error?: string;
  helpText?: string;
}

export default function EditMultiImageUpload({
  label,
  currentImageUrls,
  newFiles,
  newPreviews,
  onFilesChange,
  onPreviewsChange,
  onRemoveCurrent,
  onRemoveNew,
  removedCurrentUrls,
  maxFiles = 5,
  maxSize = 10,
  className = "",
  disabled = false,
  error,
  helpText
}: EditMultiImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList) => {
    const additionalFiles: File[] = [];
    const additionalPreviews: string[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`Please select image files only. ${file.name} is not an image.`);
        return;
      }

      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is ${maxSize}MB.`);
        return;
      }

      // Check total file count
      const totalCurrentImages = currentImageUrls.filter(url => !removedCurrentUrls.includes(url)).length;
      if (totalCurrentImages + newFiles.length + additionalFiles.length >= maxFiles) {
        alert(`Maximum ${maxFiles} files allowed.`);
        return;
      }

      additionalFiles.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        additionalPreviews.push(e.target?.result as string);
        if (additionalPreviews.length === additionalFiles.length) {
          onFilesChange([...newFiles, ...additionalFiles]);
          onPreviewsChange([...newPreviews, ...additionalPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [newFiles, newPreviews, onFilesChange, onPreviewsChange, maxFiles, maxSize, currentImageUrls, removedCurrentUrls]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
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

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleRemoveNew = (index: number) => {
    const updatedFiles = newFiles.filter((_, i) => i !== index);
    const updatedPreviews = newPreviews.filter((_, i) => i !== index);
    onFilesChange(updatedFiles);
    onPreviewsChange(updatedPreviews);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalCurrentImages = currentImageUrls.filter(url => !removedCurrentUrls.includes(url)).length;
  const totalImages = totalCurrentImages + newFiles.length;
  const canAddMore = totalImages < maxFiles;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
        <span className="text-xs text-gray-500">
          {totalImages}/{maxFiles} images
        </span>
      </div>

      {/* Current Images */}
      {currentImageUrls.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Current images:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {currentImageUrls
              .filter(url => !removedCurrentUrls.includes(url))
              .map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Current image ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveCurrent(url)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    disabled={disabled}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* New Images Upload */}
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Upload new images:</p>

        <div
          className={`
            relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer
            ${isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
            }
            ${error ? 'border-red-300' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${!canAddMore ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && canAddMore && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled || !canAddMore}
          />

          <div className="p-6 text-center">
            <div className="mx-auto w-10 h-10 text-gray-400 mb-3">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              {isDragOver ? 'Drop your images here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, JPEG, WebP up to {maxSize}MB each
            </p>
          </div>
        </div>
      </div>

      {/* New Images Preview */}
      {newPreviews.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">New images:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {newPreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`New image ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border"
                />

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveNew(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                  disabled={disabled}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* File Info */}
                {newFiles[index] && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg">
                    <div className="truncate">{newFiles[index].name}</div>
                    <div className="text-right">{formatFileSize(newFiles[index].size)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
