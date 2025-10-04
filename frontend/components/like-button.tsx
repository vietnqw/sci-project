import React, { useState } from 'react';
import { Competition } from '../app/api/competitions';

interface LikeButtonProps {
  competitionId: string;
  competition: Competition;
}

const LikeButton: React.FC<LikeButtonProps> = ({ competitionId, competition }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  return (
    <button
      onClick={handleLike}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        isLiked
          ? 'bg-red-100 text-red-700 hover:bg-red-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <svg
        className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`}
        fill={isLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span>{likeCount}</span>
    </button>
  );
};

export default LikeButton;
