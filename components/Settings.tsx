import React, { useState, useRef } from 'react';
import { UserSettings, UserProfile, AppTheme, Category } from '../types';
import { SUPPORTED_CURRENCIES } from '../constants';
import { 
  LogOut, ChevronRight, Calculator, Moon, Sun, 
  Cloud, RefreshCw, Coins, Database, Eraser,
  Edit3, X, Download, Check, Upload, Layout, ShieldAlert, Palette, Zap, Trash
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

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
  onExport: () => void;
  onImport: (file: File) => void;
  isSyncing: boolean;
  onLoadMockData: () => void;
  onPurgeMockData: () => void;
  onClearExpenses: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, user, onLogout, onReset, onToggleTheme, onUpdateAppTheme, onUpdateCurrency, 
  onUpdateSplit, onUpdateBaseIncome, onSync, onExport, onImport, isSyncing, onLoadMockData, onPurgeMockData, onClearExpenses
}) => {
  const isDark = settings.theme === 'dark';
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [tempSplit, setTempSplit] = useState(settings.split);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentCurrency = SUPPORTED_CURRENCIES.find(c => c.code === settings.currency) || SUPPORTED_CURRENCIES[0];

  const themes: { id: AppTheme, label: string, color: string }[] = [
    { id: 'Spiderman', label: 'Spidey', color: 'bg-rose-500' },
    { id: 'CaptainAmerica', label: 'Cap', color: 'bg-blue-600' },
    { id: 'Naruto', label: 'Naruto', color: 'bg-orange-500' }
  ];

  const handleUpdateTempSplit = (cat: Category, val: number) => {
    const categories = ['Needs', 'Wants', 'Savings'] as const;
    const others = categories.filter(c => c !== cat);
    const splitRest = (100 - val) / 2;
    setTempSplit({ 
      ...tempSplit, 
      [cat]: val, 
      [others[0]]: Math.round(splitRest), 
      [others[1]]: 100 - val - Math.round(splitRest) 
    });
  };

  const saveSplitSettings = () => { 
    triggerHaptic(); 
    onUpdateSplit(tempSplit); 
    setShowSplitModal(false); 
  };

  const handleImportClick = () => { 
    triggerHaptic(); 
    fileInputRef.current?.click(); 
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sectionClass = "bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl mb-3 overflow-hidden shadow-sm";
  const labelClass = "text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3 px-1";

  return (
    <div className="pb-32 pt-1">
      {/* HEADER CARD - CONSISTENT WITH DASHBOARD */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-950 dark:from-slate-900 dark:to-black px-5 py-4 rounded-2xl mb-2 shadow-md">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Settings</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Configuration Protocol</p>
          </div>
          <button onClick={onLogout} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all active:scale-90">
             <LogOut size={14} />
          </button>
        </div>
      </div>
      
      <div>
        <section className={sectionClass}>
          <div className="p-4">
            <h3 className={labelClass}><Palette size={10} /> Visual Aesthetics</h3>
            <div className="flex gap-2 mb-4">
              <button onClick={onToggleTheme} className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-between transition-all active:scale-[0.98] ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                <span className="text-[10px] font-black uppercase">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                {isDark ? <Moon size={14} className="text-indigo-400" /> : <Sun size={14} className="text-amber-500" />}
              </button>
            </div>
            <div className="flex gap-2">
              {themes.map(t => (
                <button key={t.id} onClick={() => onUpdateAppTheme(t.id)} className={`flex-1 py-2.5 rounded-xl border transition-all active:scale-95 flex flex-col items-center gap-1.5 ${settings.appTheme === t.id ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${t.color}`} />
                  <span className="text-[8px] font-black uppercase tracking-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="p-4">
            <h3 className={labelClass}><Calculator size={10} /> Core Logic</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { triggerHaptic(); setShowSplitModal(true); }} className="flex flex-col items-start gap-1 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 active:bg-slate-100 transition-all text-left">
                <span className="text-[8px] font-black text-slate-400 uppercase">Allocation</span>
                <span className="text-[11px] font-black dark:text-white">{settings.split.Needs}/{settings.split.Wants}/{settings.split.Savings}</span>
              </button>
              <button onClick={() => { triggerHaptic(); setShowCurrencyModal(true); }} className="flex flex-col items-start gap-1 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 active:bg-slate-100 transition-all text-left">
                <span className="text-[8px] font-black text-slate-400 uppercase">Currency</span>
                <span className="text-[11px] font-black dark:text-white uppercase">{settings.currency}</span>
              </button>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="p-4">
            <h3 className={labelClass}><Database size={10} /> Data Management</h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button onClick={onSync} disabled={isSyncing} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white shadow-md active:scale-95 transition-all disabled:opacity-50">
                {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Cloud size={14} />}
                <span className="text-[9px] font-black uppercase tracking-widest">Vault Sync</span>
              </button>
              <button onClick={onExport} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all">
                <Download size={14} className="text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest dark:text-white">Export</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={handleImportClick} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all">
                <Upload size={14} className="text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest dark:text-white">Import</span>
              </button>
              <button onClick={() => { triggerHaptic(); onLoadMockData(); }} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all">
                <Zap size={14} className="text-amber-500" />
                <span className="text-[9px] font-black uppercase tracking-widest dark:text-white">Sample</span>
              </button>
              <button onClick={() => { triggerHaptic(); onPurgeMockData(); }} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all">
                <Trash size={14} className="text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest dark:text-white">Purge</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            </div>
          </div>
        </section>

        <section className="mb-12 space-y-2">
          <button onClick={() => { triggerHaptic(20); onClearExpenses(); }} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 text-rose-500 active:scale-95 transition-all">
            <Eraser size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Flush User History</span>
          </button>
          <button onClick={onReset} className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 dark:text-slate-600 hover:text-rose-500 transition-colors active:scale-95">
            <ShieldAlert size={12} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Reset All System Defaults</span>
          </button>
        </section>
      </div>

      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black/60 z-[130] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-t-[32px] animate-slide-up shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase dark:text-white tracking-widest">Select Currency</h3>
              <button onClick={() => { triggerHaptic(); setShowCurrencyModal(false); }} className="p-2 bg-slate-50 dark:bg-slate-900 rounded-full text-slate-400 active:scale-90 transition-transform"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-1 max-h-[50vh] overflow-y-auto no-scrollbar">
              {SUPPORTED_CURRENCIES.map(curr => (
                <button key={curr.code} onClick={() => { triggerHaptic(); onUpdateCurrency(curr.code); setShowCurrencyModal(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl transition-all active:scale-95 ${settings.currency === curr.code ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <div className="flex items-center gap-4"><p className="font-black text-[11px] dark:text-white">{curr.code}</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">{curr.name}</p></div>
                  {settings.currency === curr.code && <Check className="text-brand-primary" size={14} strokeWidth={4} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSplitModal && (
        <div className="fixed inset-0 bg-black/60 z-[130] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-t-[32px] animate-slide-up shadow-2xl p-6 space-y-6">
              <div className="flex justify-between items-center"><h3 className="text-xs font-black uppercase dark:text-white tracking-widest">Allocation Protocols</h3><button onClick={() => { triggerHaptic(); setShowSplitModal(false); }}><X size={16} className="text-slate-400 active:scale-90 transition-transform" /></button></div>
              <div className="space-y-5">
                {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
                  <div key={cat} className="space-y-2">
                    <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 tracking-widest"><span>{cat}</span><span>{tempSplit[cat]}%</span></div>
                    <input type="range" min="0" max="100" value={tempSplit[cat]} onChange={(e) => handleUpdateTempSplit(cat, parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                  </div>
                ))}
              </div>
              <button onClick={saveSplitSettings} className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all">Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;