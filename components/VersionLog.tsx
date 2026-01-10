
import React from 'react';
import { X, Milestone, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface VersionLogProps {
  onClose: () => void;
}

interface LogEntry {
  version: string;
  date: string;
  changes: string[];
}

const VERSION_HISTORY: LogEntry[] = [
  {
    version: '1.1.8',
    date: 'JAN 12, 2025',
    changes: [
      'Introduced "Budget Architect" module for granular monthly planning.',
      'Automatic integration of recurring expenses into the planning view.',
      'Category-specific allocation tracking (Needs, Wants, Savings).',
      'Income vs Plan visualization with deficit indicators.',
      'Tactile feedback for new navigation and planning tools.'
    ]
  },
  {
    version: '1.1.5',
    date: 'JAN 10, 2025',
    changes: [
      'Settings header unified with Dashboard/Transactions styling.',
      'Consolidated Aesthetics section (Theme + Dark/Light toggle).',
      'Unified Data Management block including Sync, Export, and Import.',
      'Streamlined settings layout for better high-density viewing.',
      'Removed Profile section for a purely utility-driven experience.'
    ]
  },
  {
    version: '1.1.2',
    date: 'JAN 04, 2025',
    changes: [
      'Refined Settings view with dedicated header and card-based profile.',
      'Native CSV data import capability for bulk migration.',
      'Enhanced high-density layout across all management units.',
      'Tactile feedback optimization for navigation.'
    ]
  },
  {
    version: '1.1.0',
    date: 'JAN 03, 2025',
    changes: [
      'Sectioned UI architecture with rounded-2xl containers.',
      'Universal "Compact" density for peak data visibility.',
      'Full-app haptic engine for tactile feedback.',
      'Enhanced active-state scale animations on all buttons.'
    ]
  },
  {
    version: '1.0.8',
    date: 'JAN 02, 2025',
    changes: [
      'Simulated Cloud Security (Google Drive) persistence.',
      'Real-time spend velocity analytics engine.',
      'High-fidelity Gemini-3 Flash integration.'
    ]
  },
  {
    version: '1.0.0',
    date: 'JAN 01, 2025',
    changes: [
      'Initial Genesis build.',
      'Smart SMS clipboard parsing.',
      'Rule-based categorization logic.'
    ]
  }
];

const VersionLog: React.FC<VersionLogProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="absolute inset-0 bg-black/40" onClick={() => { triggerHaptic(); onClose(); }} />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[70dvh] animate-slide-up border border-white/10">
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 text-white rounded-xl">
              <Milestone size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">Build History</h3>
              <p className="text-[8px] font-black text-slate-400 uppercase mt-0.5">Deployment Registry</p>
            </div>
          </div>
          <button 
            onClick={() => { triggerHaptic(); onClose(); }}
            className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-transform"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          {VERSION_HISTORY.map((entry, idx) => (
            <div key={entry.version} className="relative pl-6">
              {idx !== VERSION_HISTORY.length - 1 && (
                <div className="absolute left-[7px] top-4 bottom-[-32px] w-0.5 bg-slate-100 dark:bg-slate-800" />
              )}
              <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 bg-white dark:bg-slate-900 ${idx === 0 ? 'border-indigo-500 ring-4 ring-indigo-50 dark:ring-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`} />
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${idx === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:border-slate-800 text-slate-500'}`}>
                    v{entry.version}
                  </span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{entry.date}</span>
                </div>
                <ul className="space-y-1.5 pt-1">
                  {entry.changes.map((change, cIdx) => (
                    <li key={cIdx} className="flex gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-snug">
                      <CheckCircle2 size={10} className="mt-0.5 text-slate-300 dark:text-slate-700 shrink-0" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => { triggerHaptic(); onClose(); }}
            className="w-full py-3 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-transform"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionLog;
