
import React from 'react';
import { Notification } from '../types';
import { X, Sparkles, Activity, Clock, Trash2, CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react';

interface NotificationPaneProps {
  notifications: Notification[];
  onClose: () => void;
  onClear: () => void;
}

const NotificationPane: React.FC<NotificationPaneProps> = ({ notifications, onClose, onClear }) => {
  const getIcon = (type: Notification['type'], severity?: Notification['severity']) => {
    if (type === 'AI') return <Sparkles size={16} className="text-brand-primary" />;
    
    switch (severity) {
      case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'error': return <XCircle size={16} className="text-rose-500" />;
      default: return <Activity size={16} className="text-indigo-400" />;
    }
  };

  const getBackground = (severity?: Notification['severity']) => {
    switch (severity) {
      case 'success': return 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30';
      case 'warning': return 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30';
      case 'error': return 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30';
      default: return 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-start sm:justify-end sm:p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm sm:rounded-none" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 sm:rounded-[32px] rounded-t-[32px] shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden border border-white/10 animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-brand-primary">
              <BellIcon />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Notification Center</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Activity & Smart Tips</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClear}
              className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
              title="Clear All"
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-200 dark:text-slate-700">
                <BellOffIcon />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No notifications yet</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Activities and smart tips will appear here.</p>
              </div>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id}
                className={`p-4 rounded-2xl border transition-all flex gap-3 ${getBackground(notif.severity)}`}
              >
                <div className="flex-none mt-1">
                  {getIcon(notif.type, notif.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate pr-2">
                      {notif.title}
                    </h4>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                      <Clock size={8} /> {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-normal mt-1">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                      notif.type === 'AI' 
                      ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' 
                      : 'bg-slate-200/50 dark:bg-slate-700 text-slate-500 border-transparent'
                    }`}>
                      {notif.type}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
          <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">
            Synced with Cloud Security
          </span>
        </div>
      </div>
    </div>
  );
};

// Internal mini icons
const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const BellOffIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.89 17.89 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h9" /><path d="M18 8a6 6 0 0 0-9.33-5" /><line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default NotificationPane;
