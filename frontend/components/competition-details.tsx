'use client';

import React, { useState } from 'react';
import { Competition, formatLocation } from '../app/api/competitions';
import { formatDateOnlyInUserTimeZone } from '../lib/date';
import { useAuth } from '../app/contexts/AuthContext';
import Breadcrumb from './breadcrumb';
import CountdownClock from './countdown-clock';
import ImageModal from './image-modal';
import EditCompetitionModal from './edit-competition-modal';

interface CompetitionDetailsProps {
  competition: Competition;
}

const CompetitionDetails: React.FC<CompetitionDetailsProps> = ({ competition }) => {
  const { user } = useAuth();
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [selectedImageAlt, setSelectedImageAlt] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSingleImageMode, setIsSingleImageMode] = useState(false);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not specified';
    return formatDateOnlyInUserTimeZone(dateString);
  };

  const formatAgeRange = (min?: number, max?: number) => {
    if (!min && !max) return 'All ages';
    if (min && max) return `${min}-${max}`;
    if (min) return `${min}+`;
    if (max) return `Under ${max + 1}`;
    return 'All ages';
  };

  const getFormatDisplay = (format?: string) => {
    if (!format) return 'Not specified';
    return format.charAt(0).toUpperCase() + format.slice(1).toLowerCase();
  };

  const getScaleDisplay = (scale?: string) => {
    if (!scale) return 'Not specified';
    return scale.charAt(0).toUpperCase() + scale.slice(1).toLowerCase();
  };


  const isDeadlineInFuture = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    return deadlineDate.getTime() > now.getTime();
  };

  const handleEditCompetition = () => {
    setEditingCompetition(competition);
    setIsEditFormOpen(true);
  };

  const handleUpdateCompetition = () => {
    // Refresh the page to show updated data
    window.location.reload();
  };

  const handleImageClick = (imageUrl: string, alt: string, single = false) => {
    setSelectedImageUrl(imageUrl);
    setSelectedImageAlt(alt);
    setIsSingleImageMode(single);
    setIsImageModalOpen(true);
  };

  const handleModalPrevious = () => {
    if (competition.detail_image_urls && competition.detail_image_urls.length > 0) {
      const newIndex = currentImageIndex === 0 ? competition.detail_image_urls.length - 1 : currentImageIndex - 1;
      setCurrentImageIndex(newIndex);
      setSelectedImageUrl(competition.detail_image_urls[newIndex]);
      setSelectedImageAlt(`${competition.title} detail ${newIndex + 1}`);
    }
  };

  const handleModalNext = () => {
    if (competition.detail_image_urls && competition.detail_image_urls.length > 0) {
      const newIndex = currentImageIndex === competition.detail_image_urls.length - 1 ? 0 : currentImageIndex + 1;
      setCurrentImageIndex(newIndex);
      setSelectedImageUrl(competition.detail_image_urls[newIndex]);
      setSelectedImageAlt(`${competition.title} detail ${newIndex + 1}`);
    }
  };

  const handlePreviousImage = () => {
    if (competition.detail_image_urls && competition.detail_image_urls.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? competition.detail_image_urls!.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (competition.detail_image_urls && competition.detail_image_urls.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === competition.detail_image_urls!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImageUrl('');
    setSelectedImageAlt('');
  };

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setTimeout(() => setToastMessage(''), 300);
    }, 3000);
  };

  const handleShare = async () => {
    const shareData = {
      title: competition.title,
      text: competition.description || `Check out this competition: ${competition.title}`,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        showToastNotification('Shared successfully!');
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        showToastNotification('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Final fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToastNotification('Link copied to clipboard!');
      } catch (clipboardError) {
        showToastNotification('Unable to share. Please copy the URL manually.');
      }
    }
  };

  const canEditCompetition = user && user.id === competition.owner_id;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Competitions', href: '/competitions' },
              { label: competition.title }
            ]}
          />
        </div>

        {/* Header Section */}
        <div className="rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="relative">
            {/* Hero Image */}
            {competition.background_image_url && (
              <div className="h-64 relative cursor-pointer" onClick={() => handleImageClick(competition.background_image_url!, competition.title, true)}>
                <img
                  src={competition.background_image_url}
                  alt={competition.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                {/* Featured Star */}
                {competition.is_featured && (
                  <div className="absolute top-4 right-4 z-20" title="Featured Competition">
                    <div className="relative flex h-10 w-10 items-center justify-center transform transition-all duration-300 hover:scale-110 animate-pulse-slow">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 opacity-75 blur-md"></div>
                      <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 shadow-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Header Content */}
            <div className="p-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                    {competition.title}
                  </h1>

                  {/* Status Display */}
                  {!competition.is_approved && (
                    <div className="flex items-center gap-2 text-orange-600 mb-4">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className="text-lg font-medium">Pending</span>
                    </div>
                  )}

                  {(competition.location_country || competition.location_city) && (
                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-lg">{formatLocation(competition)}</span>
                    </div>
                  )}

                  {competition.overview && (
                    <div className="text-gray-600 text-lg leading-relaxed mb-4">
                      {competition.overview}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col gap-3">
                  {competition.competition_link && (
                    <a
                      href={competition.competition_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Visit Official Site
                    </a>
                  )}

                  {canEditCompetition && (
                    <button
                      onClick={handleEditCompetition}
                      className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Competition
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Detail Images */}
            {competition.detail_image_urls && competition.detail_image_urls.length > 0 && (
              <div className="rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Competition Images</h2>
                <div className="relative">
                  {/* Main Image Display */}
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={competition.detail_image_urls[currentImageIndex]}
                      alt={`${competition.title} detail ${currentImageIndex + 1}`}
                      className="w-full h-80 object-cover cursor-pointer transition-transform duration-300 hover:scale-105"
                      onClick={() => handleImageClick(competition.detail_image_urls![currentImageIndex], `${competition.title} detail ${currentImageIndex + 1}`, false)}
                    />

                    {/* Navigation Arrows */}
                    {competition.detail_image_urls.length > 1 && (
                      <>
                        {/* Left Arrow */}
                        <button
                          onClick={handlePreviousImage}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110 group"
                          aria-label="Previous image"
                        >
                          <svg className="w-6 h-6 text-gray-700 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        {/* Right Arrow */}
                        <button
                          onClick={handleNextImage}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110 group"
                          aria-label="Next image"
                        >
                          <svg className="w-6 h-6 text-gray-700 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}

                    {/* Image Counter */}
                    {competition.detail_image_urls.length > 1 && (
                      <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {currentImageIndex + 1} / {competition.detail_image_urls.length}
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Strip */}
                  {competition.detail_image_urls.length > 1 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                      {competition.detail_image_urls.map((imageUrl, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                            index === currentImageIndex
                              ? 'border-blue-500 shadow-lg'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={imageUrl}
                            alt={`${competition.title} thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Competition Information */}
            {competition.description && (
              <div className="rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">About this competition</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                    <div className="prose prose-lg max-w-none text-gray-700">
                      <p className="leading-relaxed">{competition.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Countdown Clock */}
            {competition.registration_deadline && isDeadlineInFuture(competition.registration_deadline) && (
              <CountdownClock deadline={competition.registration_deadline} />
            )}

            {/* Quick Facts */}
            <div className="rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quick facts</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm text-gray-500">Format</p>
                    <p className="font-semibold text-gray-900">{getFormatDisplay(competition.format)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm text-gray-500">Scale</p>
                    <p className="font-semibold text-gray-900">{getScaleDisplay(competition.scale)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="text-sm text-gray-500">Deadline</p>
                    <p className="font-semibold text-gray-900">
                      {formatDate(competition.registration_deadline)}
                    </p>
                  </div>
                </div>

                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <div>
                      <p className="text-sm text-gray-500">Age</p>
                      <p className="font-semibold text-gray-900">
                        {formatAgeRange(competition.min_age, competition.max_age)}
                      </p>
                    </div>
                  </div>
              </div>
            </div>

            {/* Contact & Links */}
            <div className="rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Links & information</h3>
              <div className="space-y-3">
                {competition.competition_link && (
                  <a
                    href={competition.competition_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">Official Website</span>
                  </a>
                )}
              </div>
            </div>

            {/* Share */}
            <div className="rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Share</h3>
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Share Competition
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={closeImageModal}
        imageUrl={selectedImageUrl}
        alt={selectedImageAlt}
        allImages={isSingleImageMode ? [] : (competition.detail_image_urls || [])}
        currentIndex={currentImageIndex}
        onPrevious={!isSingleImageMode && competition.detail_image_urls && competition.detail_image_urls.length > 1 ? handleModalPrevious : undefined}
        onNext={!isSingleImageMode && competition.detail_image_urls && competition.detail_image_urls.length > 1 ? handleModalNext : undefined}
      />

      {/* Edit Competition Modal */}
      <EditCompetitionModal
        isOpen={isEditFormOpen}
        onClose={() => {
          setIsEditFormOpen(false);
          setEditingCompetition(null);
        }}
        onSuccess={handleUpdateCompetition}
        competition={editingCompetition}
      />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitionDetails;
