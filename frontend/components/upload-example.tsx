'use client';

import React, { useState } from 'react';
import { useUpload, useUserAvatarUpload, useCompetitionUpload } from '../app/hooks/useUpload';

/**
 * Example component showing how to use the new upload system
 */
export function UploadExample() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [userId, setUserId] = useState('123');
  const [competitionId, setCompetitionId] = useState('456');

  // General upload hook
  const { upload, uploadMultiple, deleteFile, isLoading, error, progress } = useUpload({
    onSuccess: (response) => {
      console.log('Upload successful:', response);
      alert(`Upload successful! URL: ${response.url}`);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    },
  });

  // User avatar upload hook
  const { uploadAvatar } = useUserAvatarUpload({
    onSuccess: (response) => {
      console.log('Avatar upload successful:', response);
      alert(`Avatar uploaded! URL: ${response.url}`);
    },
  });

  // Competition upload hook
  const { uploadBackground, uploadDetailImages } = useCompetitionUpload({
    onSuccess: (response) => {
      console.log('Competition upload successful:', response);
      alert(`Competition image uploaded! URL: ${response.url}`);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) return;

    try {
      await uploadAvatar(selectedFile, userId);
    } catch (error) {
      console.error('Avatar upload failed:', error);
    }
  };

  const handleUploadCompetitionBackground = async () => {
    if (!selectedFile) return;

    try {
      await uploadBackground(selectedFile, competitionId);
    } catch (error) {
      console.error('Competition background upload failed:', error);
    }
  };

  const handleUploadCompetitionDetails = async () => {
    if (selectedFiles.length === 0) return;

    try {
      await uploadDetailImages(selectedFiles, competitionId);
    } catch (error) {
      console.error('Competition detail images upload failed:', error);
    }
  };

  const handleGeneralUpload = async () => {
    if (!selectedFile) return;

    try {
      await upload(selectedFile, 'user', userId, 'avatar');
    } catch (error) {
      console.error('General upload failed:', error);
    }
  };

  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      await uploadMultiple(selectedFiles, 'competition', competitionId, 'detail');
    } catch (error) {
      console.error('Batch upload failed:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Upload System Example</h2>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error.message}
        </div>
      )}

      {/* Progress Display */}
      {isLoading && (
        <div className="mb-4">
          <div className="bg-blue-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">Uploading... {progress}%</p>
        </div>
      )}

      {/* User ID Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          User ID:
        </label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter user ID"
        />
      </div>

      {/* Competition ID Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Competition ID:
        </label>
        <input
          type="text"
          value={competitionId}
          onChange={(e) => setCompetitionId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter competition ID"
        />
      </div>

      {/* Single File Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select a file:
        </label>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {selectedFile && (
          <p className="text-sm text-gray-600 mt-1">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      {/* Multiple Files Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select multiple files:
        </label>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleFilesSelect}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {selectedFiles.length > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            Selected {selectedFiles.length} files
          </p>
        )}
      </div>

      {/* Upload Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700">User Avatar</h3>
          <button
            onClick={handleUploadAvatar}
            disabled={!selectedFile || isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Upload Avatar
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700">Competition Background</h3>
          <button
            onClick={handleUploadCompetitionBackground}
            disabled={!selectedFile || isLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Upload Background
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700">Competition Details</h3>
          <button
            onClick={handleUploadCompetitionDetails}
            disabled={selectedFiles.length === 0 || isLoading}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Upload Detail Images
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700">General Upload</h3>
          <button
            onClick={handleGeneralUpload}
            disabled={!selectedFile || isLoading}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            General Upload
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700">Batch Upload</h3>
          <button
            onClick={handleBatchUpload}
            disabled={selectedFiles.length === 0 || isLoading}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Batch Upload
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <h3 className="font-semibold text-gray-700 mb-2">How to use:</h3>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
          <li>Enter a User ID and Competition ID</li>
          <li>Select one or more image files (JPEG, PNG, WebP)</li>
          <li>Click any upload button to test different upload scenarios</li>
          <li>Files will be uploaded directly to S3 using presigned URLs</li>
          <li>Backend will be notified and database will be updated</li>
        </ol>
      </div>
    </div>
  );
}
