
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
    version: '1.1.9',
    date: 'JAN 14, 2025',
    changes: [
      'Removed Audit Ingestion step for accelerated financial ledger updates.',
      'Refined CSV ingestion for direct mapping of Accounts, Transfers, and Income.',
      'Improved account binding heuristics for imported transactions.',
      'Renamed Data Management trigger to "Import CSV" for clarity.',
      'Aesthetic layout refinements and stability patches.'
    ]
  },
  {
    version: '1.1.8',
    date: 'JAN 12, 2025',
    changes: [
      'Introduced "Budget Architect" module for granular monthly planning.',
      'Automatic integration of recurring expenses into planning view.',
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
      
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[75dvh] animate-slide-up border border-white/10">
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
          <button onClick={() => { triggerHaptic(); onClose(); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 transition-all active:scale-90">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          {VERSION_HISTORY.map((entry, idx) => (
            <div key={entry.version} className="relative pl-6">
              {/* Timeline Line */}
              {idx !== VERSION_HISTORY.length - 1 && (
                <div className="absolute left-[7px] top-4 bottom-[-32px] w-[2px] bg-slate-100 dark:bg-slate-800" />
              )}
              
              <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-4 ${idx === 0 ? 'bg-brand-primary border-blue-100 dark:border-blue-900/30' : 'bg-slate-200 dark:bg-slate-700 border-white dark:border-slate-900'}`} />

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">v{entry.version}</h4>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{entry.date}</span>
                </div>
                
                <div className="space-y-1.5">
                  {entry.changes.map((change, cIdx) => (
                    <div key={cIdx} className="flex gap-2">
                      <CheckCircle2 size={10} className="text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed uppercase tracking-tight">
                        {change}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-center">
           <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">just keep it tracking protocols</p>
        </div>
      </div>
    </div>
  );
};

export default VersionLog;
