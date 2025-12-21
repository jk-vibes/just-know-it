import React from 'react';
import { View } from '../types';
import { Plus } from 'lucide-react';

interface NavbarProps {
  currentView: View;
  remainingPercentage: number;
  onViewChange: (view: View) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, remainingPercentage, onViewChange }) => {
  // spentPercentage determines the transition point between red (bottom) and green (top)
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
              {/* x1=0, y1=1, x2=0, y2=0 defines a bottom-to-top gradient */}
              <linearGradient id="briefcaseFill" x1="0" y1="1" x2="0" y2="0">
                {/* Red for expense at the bottom */}
                <stop offset={`${spentPercentage}%`} stopColor="#ef4444" />
                {/* Green for left out money at the top */}
                <stop offset={`${spentPercentage}%`} stopColor="#22c55e" />
              </linearGradient>
            </defs>
            
            {/* Briefcase Body with dynamic red/green fill and white outline */}
            <path 
              d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" 
              fill="url(#briefcaseFill)" 
              stroke="white" 
              strokeWidth="1.5"
            />
            
            {/* Briefcase Handle with white outline */}
            <path 
              d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
            />
          </svg>
          
          {/* Percentage Text inside Briefcase Body */}
          <div className="absolute inset-0 flex items-center justify-center pt-3 pointer-events-none">
            <span className="text-[10px] font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
              {Math.round(spentPercentage)}%
            </span>
          </div>
          
          {/* Action Badge */}
          <div className="absolute -top-1 -right-1 bg-[#f14444] text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800">
            <Plus size={16} strokeWidth={4} />
          </div>
          
          {/* Tooltip for percentage info */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-800 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
            {Math.round(remainingPercentage)}% Left
          </div>
        </div>
      </button>
    </div>
  );
};

export default Navbar;