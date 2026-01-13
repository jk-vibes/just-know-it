
import React from 'react';
import { View } from '../types';
import { Plus } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface NavbarProps {
  currentView: View;
  remainingPercentage: number;
  netWorth: number;
  categoryPercentages: {
    Needs: number;
    Wants: number;
    Savings: number;
    totalSpent?: number;
    totalPlanned?: number;
  };
  onViewChange: (view: View) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, remainingPercentage, netWorth, categoryPercentages, onViewChange }) => {
  const spentPercentage = Math.max(0, Math.min(100, 100 - remainingPercentage));
  const savingsRate = Math.max(0, Math.min(100, remainingPercentage));
  const isNegativePortfolio = netWorth < 0;

  const handleClick = () => {
    triggerHaptic(20);
    onViewChange('Add');
  };

  const renderIcon = () => {
    // Shared Plus Badge
    const PlusBadge = ({ colorClass = "bg-brand-primary" }) => (
      <div className={`absolute -top-1 -right-1 ${colorClass} text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800 transition-colors z-20`}>
        <Plus size={14} strokeWidth={4} />
      </div>
    );

    // Briefcase SVG Path Helper for Accounts and Dashboard
    const BriefcasePath = ({ fillId, label }: { fillId: string, label: string | number }) => (
      <div className="relative animate-kick group">
        <svg 
          width="64" 
          height="64" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="transition-transform duration-300 drop-shadow-xl"
        >
          <path 
            d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" 
            fill={`url(#${fillId})`} 
            className="stroke-slate-900 dark:stroke-white transition-colors"
            strokeWidth="1.2"
          />
          <path 
            d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" 
            className="stroke-slate-900 dark:stroke-white transition-colors"
            strokeWidth="2" 
            strokeLinecap="round" 
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pt-3 pointer-events-none">
          <span className="text-[10px] font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            {label}%
          </span>
        </div>
      </div>
    );

    if (currentView === 'Budget') {
      const rNeeds = 10;
      const rWants = 7.2;
      const rSavings = 4.4;
      const cNeeds = 2 * Math.PI * rNeeds;
      const cWants = 2 * Math.PI * rWants;
      const cSavings = 2 * Math.PI * rSavings;
      const trackOpacity = 0.25;

      return (
        <div className="relative w-16 h-16 flex items-center justify-center animate-kick group">
          <svg 
            width="64" 
            height="64" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className="drop-shadow-xl overflow-visible rotate-[-90deg]"
          >
            {/* Needs Circle: Light Blue Track -> Light Blue Stroke */}
            <circle cx="12" cy="12" r={rNeeds} stroke="#60a5fa" strokeWidth="2.4" strokeOpacity={trackOpacity} />
            <circle 
              cx="12" cy="12" r={rNeeds} 
              stroke="#60a5fa" 
              strokeWidth="2.4" 
              strokeLinecap="round" 
              style={{ 
                strokeDasharray: `${cNeeds} ${cNeeds}`, 
                strokeDashoffset: cNeeds - (cNeeds * (Math.min(100, categoryPercentages.Needs) / 100)) 
              }} 
              className="transition-all duration-1000 ease-out"
            />
            
            {/* Wants Circle: Orange Track -> Orange Stroke */}
            <circle cx="12" cy="12" r={rWants} stroke="#f97316" strokeWidth="2.4" strokeOpacity={trackOpacity} />
            <circle 
              cx="12" cy="12" r={rWants} 
              stroke="#f97316" 
              strokeWidth="2.4" 
              strokeLinecap="round" 
              style={{ 
                strokeDasharray: `${cWants} ${cWants}`, 
                strokeDashoffset: cWants - (cWants * (Math.min(100, categoryPercentages.Wants) / 100)) 
              }} 
              className="transition-all duration-1000 ease-out"
            />
            
            {/* Savings Circle: Green Track -> Green Stroke */}
            <circle cx="12" cy="12" r={rSavings} stroke="#22c55e" strokeWidth="2.4" strokeOpacity={trackOpacity} />
            <circle 
              cx="12" cy="12" r={rSavings} 
              stroke="#22c55e" 
              strokeWidth="2.4" 
              strokeLinecap="round" 
              style={{ 
                strokeDasharray: `${cSavings} ${cSavings}`, 
                strokeDashoffset: cSavings - (cSavings * (Math.min(100, categoryPercentages.Savings) / 100)) 
              }} 
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          <PlusBadge colorClass="bg-blue-600" />
        </div>
      );
    }

    if (currentView === 'Accounts') {
      const statusColor = isNegativePortfolio ? "#ef4444" : "#22c55e";
      return (
        <div className="relative">
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id="accountBriefcaseFill" x1="0" y1="1" x2="0" y2="0">
                <stop offset={`${savingsRate}%`} stopColor={statusColor} />
                <stop offset={`${savingsRate}%`} stopColor="#cbd5e1" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>
          <BriefcasePath fillId="accountBriefcaseFill" label={Math.round(savingsRate)} />
          <PlusBadge colorClass={isNegativePortfolio ? "bg-rose-600" : "bg-emerald-600"} />
        </div>
      );
    }

    return (
      <div className="relative">
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="briefcaseFill" x1="0" y1="1" x2="0" y2="0">
              <stop offset={`${spentPercentage}%`} stopColor="var(--brand-accent)" />
              <stop offset={`${spentPercentage}%`} stopColor="#22c55e" />
            </linearGradient>
          </defs>
        </svg>
        <BriefcasePath fillId="briefcaseFill" label={Math.round(spentPercentage)} />
        <PlusBadge />
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-6 px-6 flex justify-end">
      <button
        onClick={handleClick}
        className="pointer-events-auto flex items-center justify-center transition-all active:scale-90 hover:scale-105 group relative"
      >
        {renderIcon()}
      </button>
    </div>
  );
};

export default Navbar;
