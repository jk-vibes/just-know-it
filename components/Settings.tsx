
import React, { useState } from 'react';
import { UserSettings, UserProfile, AppTheme, Category } from '../types';
import { SUPPORTED_CURRENCIES } from '../constants';
import { 
  LogOut, Shield, Bell, HelpCircle, 
  ChevronRight, Calculator, Moon, Sun, 
  Cloud, RefreshCw, Coins, Trash2, Check, Database, Eraser,
  History, Shield as ShieldIcon, Edit3, X, Palette
} from 'lucide-react';

interface SettingsProps {
  settings: UserSettings;
  user: UserProfile | null;
  onLogout: () => void;
  onReset: () => void;
  onToggleTheme: () => void;
  onUpdateAppTheme: (theme: AppTheme) => void;
  onUpdateCurrency: (code: string) => void;
  onUpdateDataFilter: (filter: 'all' | 'user' | 'mock') => void;
  onUpdateSplit: (split: UserSettings['split']) => void;
  onUpdateBaseIncome: (income: number) => void;
  onSync: () => void;
  isSyncing: boolean;
  onLoadMockData: () => void;
  onClearExpenses: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, 
  user, 
  onLogout, 
  onReset, 
  onToggleTheme, 
  onUpdateAppTheme,
  onUpdateCurrency, 
  onUpdateDataFilter,
  onUpdateSplit,
  onUpdateBaseIncome,
  onSync, 
  isSyncing,
  onLoadMockData,
  onClearExpenses
}) => {
  const isDark = settings.theme === 'dark';
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [tempSplit, setTempSplit] = useState(settings.split);
  const [tempIncome, setTempIncome] = useState(settings.monthlyIncome);

  const currentCurrency = SUPPORTED_CURRENCIES.find(c => c.code === settings.currency) || SUPPORTED_CURRENCIES[0];

  const lastSyncedDate = settings.lastSynced 
    ? new Date(settings.lastSynced).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Never';

  const themes: { id: AppTheme | 'Vibrant', label: string, icon: React.ReactNode }[] = [
    { 
      id: 'Standard', 
      label: 'Standard', 
      icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="4" /></svg> 
    },
    { 
      id: 'Vibrant', 
      label: 'Vibrant', 
      icon: <Palette size={18} strokeWidth={2.5} /> 
    },
    { 
      id: 'Spiderman', 
      label: 'Spidey', 
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 2L4.5 9V15L12 22L19.5 15V9L12 2ZM12 4.5L17.5 9.5H15L12 6.5L9 9.5H6.5L12 4.5ZM7 11V13.5L12 18.5L17 13.5V11H7Z" />
        </svg>
      ) 
    },
    { 
      id: 'CaptainAmerica', 
      label: 'Cap', 
      icon: <ShieldIcon size={18} strokeWidth={2.5} /> 
    },
    { 
      id: 'Naruto', 
      label: 'Naruto', 
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 12C12 12 15 11 15 8C15 5 12 5 12 5C12 5 9 5 9 8C9 11 12 12 12 12Z" />
          <path d="M12 12C12 12 11 15 8 15C5 15 5 12 5 12C5 12 5 9 8 9C11 9 12 12 12 12Z" />
        </svg>
      ) 
    }
  ];

  const handleUpdateTempSplit = (cat: Category, val: number) => {
    const categories = ['Needs', 'Wants', 'Savings'] as const;
    const others = categories.filter(c => c !== cat);
    const remaining = 100 - val;
    const splitRest = remaining / 2;
    setTempSplit({
      ...tempSplit,
      [cat]: val,
      [others[0]]: Math.round(splitRest),
      [others[1]]: 100 - val - Math.round(splitRest),
    });
  };

  const saveSplitSettings = () => {
    onUpdateSplit(tempSplit);
    onUpdateBaseIncome(tempIncome);
    setShowSplitModal(false);
  };

  return (
    <div className="pb-32 pt-6 space-y-6 dark:text-slate-100">
      
      {/* Theme Selection */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Experience Theme</h3>
        <div className="bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-[28px] flex overflow-x-auto no-scrollbar gap-1 border border-slate-100 dark:border-slate-800 shadow-sm">
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => onUpdateAppTheme(t.id as AppTheme)}
              className={`flex-none min-w-[70px] flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all ${
                settings.appTheme === t.id 
                  ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-lg scale-[1.05]' 
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            >
              {t.icon}
              <span className="text-[8px] font-black uppercase tracking-widest">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Settings Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={onToggleTheme}
          className="bg-white dark:bg-slate-800 p-4 rounded-3xl flex flex-col items-center gap-2 transition-all active:scale-95 shadow-sm border border-slate-50 dark:border-slate-800"
        >
          <div className={`p-2.5 rounded-2xl ${isDark ? 'bg-indigo-900/50 text-indigo-400' : 'bg-amber-50 text-amber-500'}`}>
            {isDark ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-tight">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
        <button 
          onClick={onSync}
          disabled={isSyncing}
          className="bg-white dark:bg-slate-800 p-4 rounded-3xl flex flex-col items-center gap-2 transition-all active:scale-95 shadow-sm border border-slate-50 dark:border-slate-800 disabled:opacity-50"
        >
          <div className={`p-2.5 rounded-2xl ${isSyncing ? 'animate-spin' : ''} bg-indigo-50 dark:bg-indigo-900/50 text-indigo-500`}>
            {isSyncing ? <RefreshCw size={20} /> : <Cloud size={20} />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-tight">{isSyncing ? 'Syncing...' : 'Cloud Backup'}</span>
        </button>
      </div>

      {/* Cloud Status Card with Gradient */}
      <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-900 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2">
            <History size={16} className="text-brand-primary" />
            <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Storage Status</h3>
          </div>
          <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-lg tracking-widest border border-emerald-100 dark:border-emerald-900">Connected</span>
        </div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Google Drive Backup</span>
            <span className="text-xs font-black text-slate-900 dark:text-white mt-1">{lastSyncedDate}</span>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Auto-Sync</span>
             <span className="text-[10px] font-black text-brand-primary dark:text-indigo-400 mt-1 uppercase tracking-tighter">Enabled</span>
          </div>
        </div>
      </div>

      {/* Target Allocation Card with Deep Gradient */}
      <div className="bg-gradient-to-br from-brand-primary to-brand-secondary rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden transition-colors">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <Calculator size={18} className="opacity-70" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">Target Allocation</h3>
          </div>
          <button 
            onClick={() => setShowSplitModal(true)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-sm"
          >
            <Edit3 size={16} />
          </button>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          {Object.entries(settings.split).map(([cat, val]) => (
            <div key={cat} className="flex-1 text-center bg-white/10 rounded-2xl py-3 border border-white/10 backdrop-blur-sm shadow-inner">
              <p className="text-[9px] font-black uppercase opacity-70 mb-1">{cat}</p>
              <div className="text-xl font-black">
                {val}<span className="text-xs opacity-70 ml-0.5">%</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center relative z-10">
          <span className="text-[10px] font-black uppercase opacity-60 tracking-widest">Base Monthly Expected</span>
          <span className="text-sm font-black">{currentCurrency.symbol}{settings.monthlyIncome.toLocaleString()}</span>
        </div>
      </div>

      {/* Data Source Switcher */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Data Source</h3>
        <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl flex border border-slate-100 dark:border-slate-800 shadow-inner">
          {(['all', 'user', 'mock'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => onUpdateDataFilter(filter)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                settings.dataFilter === filter 
                  ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-md' 
                  : 'text-slate-400 dark:text-slate-500 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">App Preferences</h3>
        <div className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-50 dark:border-slate-800">
          <button onClick={() => setShowCurrencyModal(true)} className="w-full flex items-center justify-between p-4 active:bg-slate-50 dark:active:bg-slate-900/50 transition-colors border-b dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="bg-red-50 dark:bg-red-900/20 p-2.5 rounded-2xl text-brand-accent"><Coins size={18} /></div>
              <div className="text-left">
                <p className="font-black text-slate-900 dark:text-white text-xs">Currency</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{currentCurrency.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[11px] font-black text-brand-primary dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">{settings.currency}</span>
               <ChevronRight className="text-slate-300" size={16} />
            </div>
          </button>
          <button onClick={() => onLoadMockData()} className="w-full flex items-center justify-between p-4 active:bg-slate-50 dark:active:bg-slate-900/50 transition-colors border-b dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2.5 rounded-2xl text-indigo-500"><Database size={18} /></div>
              <div className="text-left">
                <p className="font-black text-slate-900 dark:text-white text-xs">Mock Data</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Populate 6 months history</p>
              </div>
            </div>
            <ChevronRight className="text-slate-300" size={16} />
          </button>
          <button onClick={() => onClearExpenses()} className="w-full flex items-center justify-between p-4 active:bg-slate-50 dark:active:bg-slate-900/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-2xl text-amber-500"><Eraser size={18} /></div>
              <div className="text-left"><p className="font-black text-slate-900 dark:text-white text-xs">Purge History</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Clear all transactions</p></div>
            </div>
            <ChevronRight className="text-slate-300" size={16} />
          </button>
        </div>
      </div>

      {/* Split Modal with Gradient Header */}
      {showSplitModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center p-0 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[40px] animate-slide-up shadow-2xl border-t border-white/10 p-6 space-y-8">
            <div className="flex justify-between items-center bg-gradient-to-r from-transparent via-slate-50/50 dark:via-slate-800/20 to-transparent py-2 rounded-2xl px-2">
              <h3 className="text-base font-black text-brand-primary dark:text-white uppercase tracking-tight">Adjust Allocation</h3>
              <button onClick={() => setShowSplitModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 shadow-inner">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Base Expected Income</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">{currentCurrency.symbol}</span>
                  <input type="number" value={tempIncome} onChange={(e) => setTempIncome(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-4 rounded-2xl text-xl font-black outline-none border border-transparent focus:border-brand-primary dark:text-white shadow-inner" />
                </div>
              </div>
              <div className="space-y-6">
                {(['Needs', 'Wants', 'Savings'] as const).map(cat => (
                  <div key={cat} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{cat}</span>
                      <span className="text-sm font-black text-brand-primary dark:text-white">{tempSplit[cat]}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={tempSplit[cat]} onChange={(e) => handleUpdateTempSplit(cat, Number(e.target.value))} className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-primary" />
                  </div>
                ))}
              </div>
              <div className="pt-4">
                <button onClick={saveSplitSettings} className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-black py-5 rounded-[28px] flex items-center justify-center gap-2 shadow-xl uppercase tracking-widest text-xs">
                  Save Budget Rule <Check size={18} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout/Reset buttons */}
      <div className="space-y-3 pt-2">
        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-4 text-brand-primary dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-900/20 rounded-[28px] text-xs uppercase tracking-widest transition-all active:scale-95 border border-indigo-100/50 dark:border-indigo-900/50 shadow-sm">
          <LogOut size={16} /> Sign Out
        </button>
        <button onClick={onReset} className="w-full flex items-center justify-center gap-2 p-4 text-rose-500 font-black bg-rose-50 dark:bg-rose-900/20 rounded-[28px] border border-rose-100 dark:border-rose-900/30 text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm">
          <Trash2 size={16} /> Wipe App Data
        </button>
      </div>
    </div>
  );
};

export default Settings;
