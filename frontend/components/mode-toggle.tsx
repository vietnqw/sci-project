'use client';

import React from 'react';
import { useMode } from '../app/contexts/ModeContext';
import { useAuth } from '../app/contexts/AuthContext';

const ModeToggle: React.FC = () => {
  const { toggleMode, isCreatorsMode } = useMode();
  const { user } = useAuth();

  if (!user || user.role === 'ADMIN') {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Mode:</span>
      <button
        onClick={toggleMode}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          isCreatorsMode ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        aria-label={`Switch to ${isCreatorsMode ? 'normal' : 'creators'} mode`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
            isCreatorsMode ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span className="text-sm text-gray-600 min-w-[60px]">
        {isCreatorsMode ? 'Creators' : 'Normal'}
      </span>
    </div>
  );
};

export default ModeToggle;
