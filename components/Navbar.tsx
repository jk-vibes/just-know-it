
import React from 'react';
import { View } from '../types';
import { Plus } from 'lucide-react';

interface NavbarProps {
  currentView: View;
  remainingPercentage: number;
  onViewChange: (view: View) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, remainingPercentage, onViewChange }) => {
  const spentPercentage = Math.max(0, Math.min(100, 100 - remainingPercentage));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-6 px-6 flex justify-end">
      <button
        onClick={() => onViewChange('Add')}
        className="pointer-events-auto flex items-center justify-center transition-all active:scale-90 hover:scale-105 group relative"
      >
        <div className="relative">
          <svg 
            width="64" 
            height="64" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className="group-hover:rotate-3 transition-transform duration-300 drop-shadow-xl"
          >
            <defs>
              <linearGradient id="briefcaseFill" x1="0" y1="1" x2="0" y2="0">
                <stop offset={`${spentPercentage}%`} stopColor="var(--brand-accent)" />
                <stop offset={`${spentPercentage}%`} stopColor="#22c55e" />
              </linearGradient>
            </defs>
            <path 
              d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" 
              fill="url(#briefcaseFill)" 
              className="stroke-slate-900 dark:stroke-white transition-colors"
              strokeWidth="1.5"
            />
            <path 
              d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" 
              className="stroke-slate-900 dark:stroke-white transition-colors"
              strokeWidth="2" 
              strokeLinecap="round" 
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pt-3 pointer-events-none">
            <span className="text-[10px] font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
              {Math.round(spentPercentage)}%
            </span>
          </div>
          <div className="absolute -top-1 -right-1 bg-brand-primary text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800 transition-colors">
            <Plus size={16} strokeWidth={4} />
          </div>
        </div>
      </button>
    </div>
  );
};

export default Navbar;
