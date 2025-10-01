'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Mode = 'normal' | 'creators';

interface ModeContextType {
  mode: Mode;
  toggleMode: () => void;
  setMode: (mode: Mode) => void;
  isCreatorsMode: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const useMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};

interface ModeProviderProps {
  children: React.ReactNode;
}

export const ModeProvider: React.FC<ModeProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<Mode>('normal');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedMode = localStorage.getItem('user_mode');
    if (savedMode === 'creators' || savedMode === 'normal') {
      setModeState(savedMode);
    }
  }, []);

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_mode', newMode);
    }
  };

  const toggleMode = () => {
    const newMode = mode === 'normal' ? 'creators' : 'normal';
    setMode(newMode);
  };

  const isCreatorsMode = mode === 'creators';

  const value: ModeContextType = {
    mode,
    toggleMode,
    setMode,
    isCreatorsMode,
  };

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
};
