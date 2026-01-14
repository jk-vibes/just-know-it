import React, { useState, useRef } from 'react';
import { UserSettings, UserProfile, AppTheme, Category } from '../types';
import { SUPPORTED_CURRENCIES } from '../constants';
import { 
  LogOut, ChevronRight, Calculator, Moon, Sun, 
  Cloud, RefreshCw, Coins, Database, Eraser,
  X, Download, Check, Upload, Palette, Zap, Sparkles, Loader2, FileSpreadsheet, Bomb,
  ShieldAlert
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { parseSmsLocally } from '../utils/smsParser';

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
  onAddBulk: (items: any[]) => void;
  isSyncing: boolean;
  onLoadMockData: () => void;
  onPurgeMockData: () => void;
  onPurgeAllData?: () => void;
  onClearExpenses: () => void;
  wealthItems?: any[];
}

const NarutoSageEye = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
    <path d="M22 6C18 4 10 7 8 11C10 15 17 21 21 18C19 14 20 6 22 6Z" fill="#F97316" />
    <path d="M2 12C2 12 5 7 11 7C17 7 20 12 20 12C20 12 17 17 11 17C5 17 2 12 2 12Z" fill="white" stroke="black" strokeWidth="0.5" />
    <circle cx="11" cy="12" r="3.5" fill="#FACC15" />
    <rect x="9.5" y="11.5" width="3" height="1" rx="0.2" fill="black" />
  </svg>
);

const SpidermanIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
    <path d="M12 10.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm0 8.5c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm8-10.5c-1.5-.5-3.5-1-5-1 .3-.3.5-.7.5-1.1 0-.8-.7-1.4-1.5-1.4s-1.5.6-1.5 1.4c0 .4.2.8.5 1.1-1.5 0-3.5.5-5 1-1.5.5-2.5 1.5-2.5 3 0 .5.1.9.2 1.3L2 14c-.3.2-.4.6-.2.9.2.3.6.4.9.2l3.2-2.1c.3.5.7.9 1.1 1.3L4.5 19c-.2.3-.1.7.2.9.3.2.7.1.9-.2l2.4-4.5c.6.4 1.3.7 2 .9V22c0 .3.3.6.6.6s.6-.3.6-.6v-5.7c.4.1.8.1 1.2.1s.8 0 1.2-.1V22c0 .3.3.6.6.6s.6-.3.6-.6v-5.9c.7-.2 1.4-.5 2-.9l2.4 4.5c.2.3.6.4.9.2.3-.2.4-.6.2-.9l-2.5-4.7c.4-.4.8-.8 1.1-1.3l3.2 2.1c.3.2.7.1.9-.2.2-.3.1-.7-.2-.9l-3.2-2.1c.1-.4.2-.8.2-1.3 0-1.5-1-2.5-2.5-3z" />
  </svg>
);

const CaptainAmericaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
    <circle cx="12" cy="12" r="11" fill="#0369a1" />
    <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2" />
    <circle cx="12" cy="12" r="5" fill="#dc2626" />
    <path d="M12 9L12.8 10.8H14.8L13.2 12L13.8 14L12 12.8L10.2 14L10.8 12L9.2 10.8H11.2L12 9Z" fill="white" />
  </svg>
);

const BatmanIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
    <ellipse cx="12" cy="12" rx="11" ry="7" fill="#facc15" />
    <path d="M12 7.5C10.5 7.5 9.5 9 8 9C7.5 9 7 8.5 6.5 8C5.5 8.5 5 10.5 5 12C5 14 6.5 16 12 16.5C17.5 16 19 14 19 12C19 10.5 18.5 8.5 17.5 8C17 8.5 16.5 9 16 9C14.5 9 13.5 7.5 12 7.5Z" fill="black" />
    <path d="M11 7.5V6.5L10 7.5H11ZM13 7.5V6.5L14 7.5H13Z" fill="black" />
  </svg>
);

const McQueenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
    <rect width="22" height="12" x="1" y="6" rx="3" fill="#ef4444" />
    <path d="M5 11L7 8H17L19 11" stroke="white" strokeWidth="1.5" />
    <path d="M4 14L20 12" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
    <circle cx="6" cy="16" r="3" fill="black" />
    <circle cx="18" cy="16" r="3" fill="black" />
    <circle cx="6" cy="16" r="1" fill="#64748b" />
    <circle cx="18" cy="16" r="1" fill="#64748b" />
  </svg>
);

const FrozenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
    <path d="M12 2V22M2 12H22M5 5L19 19M19 5L5 19" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 6L10 4M12 6L14 4M12 18L10 20M12 18L14 20M6 12L4 10M6 12L4 14M18 12L20 10M18 12L20 14" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="12" r="3" fill="white" stroke="#0ea5e9" strokeWidth="0.5" />
  </svg>
);

const Settings: React.FC<SettingsProps> = ({ 
  settings, user, onLogout, onReset, onToggleTheme, onUpdateAppTheme, onUpdateCurrency, 
  onUpdateSplit, onSync, onExport, onImport, onAddBulk, isSyncing, onLoadMockData, onPurgeMockData, onPurgeAllData,
  wealthItems = []
}) => {
  const isDark = settings.theme === 'dark';
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [tempSplit, setTempSplit] = useState(settings.split);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const currentCurrency = SUPPORTED_CURRENCIES.find(c => c.code === settings.currency) || SUPPORTED_CURRENCIES[0];

  const themes: { id: AppTheme, icon: React.ReactNode }[] = [
    { id: 'Spiderman', icon: <SpidermanIcon /> },
    { id: 'CaptainAmerica', icon: <CaptainAmericaIcon /> },
    { id: 'Naruto', icon: <NarutoSageEye /> },
    { id: 'Batman', icon: <BatmanIcon /> },
    { id: 'McQueen', icon: <McQueenIcon /> },
    { id: 'Frozen', icon: <FrozenIcon /> }
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

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerHaptic();
    setIsReadingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      setIsReadingFile(false);
      alert("Error reading file.");
    };
    reader.readAsText(file);
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
  };

  const handleBatchImport = async () => {
    if (!importText.trim()) return;
    triggerHaptic();
    setIsAnalyzing(true);
    
    await new Promise(resolve => setTimeout(resolve, 1200));

    try {
      const results = parseSmsLocally(importText);
      if (results?.length > 0) {
        onAddBulk(results);
        setShowImportModal(false);
        setImportText('');
      } else {
        alert("Found no valid transaction or account data.");
      }
    } catch (err) { 
      alert("Parsing error.");
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const sectionClass = "bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl mb-3 overflow-hidden shadow-sm";
  const labelClass = "text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3 px-1";

  return (
    <div className="pb-12 pt-1 animate-slide-up">
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
            <h3 className={labelClass}><Palette size={10} /> Visual Identity</h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-500 uppercase">Ambience</p>
                <button 
                  onClick={() => { triggerHaptic(); onToggleTheme(); }} 
                  className={`w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-indigo-400' : 'bg-slate-50 border-slate-200 text-amber-500'
                  }`}
                >
                  {isDark ? <Moon size={18} strokeWidth={2.5} /> : <Sun size={18} strokeWidth={2.5} />}
                </button>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {themes.map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => { triggerHaptic(); onUpdateAppTheme(t.id); }} 
                    className={`aspect-square rounded-xl border-2 transition-all active:scale-90 flex items-center justify-center p-1 relative ${
                      settings.appTheme === t.id 
                        ? 'border-brand-primary bg-brand-primary/10 scale-110 shadow-md z-10' 
                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      {t.icon}
                    </div>
                    {settings.appTheme === t.id && (
                      <div className="absolute -top-1 -right-1 bg-brand-primary text-white p-0.5 rounded-full ring-1 ring-white dark:ring-slate-950">
                        <Check size={6} strokeWidth={5} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
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
              <button onClick={onSync} disabled={isSyncing || !user?.accessToken} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white shadow-md active:scale-95 transition-all disabled:opacity-50">
                {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Cloud size={14} />}
                <span className="text-[9px] font-black uppercase tracking-widest">{!user?.accessToken ? 'No Auth' : 'Vault Sync'}</span>
              </button>
              <button onClick={() => { triggerHaptic(); setShowImportModal(true); }} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white shadow-md active:scale-95 transition-all">
                <FileSpreadsheet size={14} className="text-indigo-300" />
                <span className="text-[9px] font-black uppercase tracking-widest">Import CSV</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={handleImportClick} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all">
                <Upload size={14} className="text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest dark:text-white">Restore</span>
              </button>
              <button onClick={() => { triggerHaptic(); onLoadMockData(); }} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all">
                <Zap size={14} className="text-amber-500" />
                <span className="text-[9px] font-black uppercase tracking-widest dark:text-white">Mock</span>
              </button>
              <button onClick={onExport} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all">
                <Download size={14} className="text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest dark:text-white">Backup</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>
            {settings.lastSynced && (
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest text-center mt-3">Vault Snapshot: {new Date(settings.lastSynced).toLocaleString()}</p>
            )}
          </div>
        </section>

        <section className="mb-8 space-y-2">
          <button onClick={() => { triggerHaptic(20); onPurgeMockData(); }} className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 dark:text-slate-600 hover:text-rose-500 transition-colors active:scale-95">
             <Eraser size={12} />
             <span className="text-[9px] font-black uppercase tracking-[0.2em]">Purge Simulated Data</span>
          </button>
          
          <button onClick={() => { triggerHaptic(30); onPurgeAllData?.(); }} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 text-rose-500 active:scale-95 transition-all">
            <Bomb size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Purge All Ledger Data</span>
          </button>

          <button onClick={onReset} className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 dark:text-slate-600 hover:text-rose-500 transition-colors active:scale-95">
            <ShieldAlert size={12} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Full Factory Reset</span>
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

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 z-[130] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 w-full rounded-t-[32px] shadow-2xl flex flex-col max-h-[85vh] animate-slide-up">
             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase dark:text-white tracking-widest">Import CSV</h3>
                <button onClick={() => { triggerHaptic(); setShowImportModal(false); }} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-400 active:scale-90 transition-transform"><X size={18} /></button>
             </div>
             <div className="p-6 overflow-y-auto no-scrollbar space-y-4">
                <div className="relative">
                  <textarea 
                    value={importText} 
                    onChange={(e) => setImportText(e.target.value)} 
                    placeholder="Paste CSV rows or banking financial logs here..." 
                    className="w-full h-44 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-[11px] font-medium outline-none border border-slate-100 dark:border-slate-800 dark:text-white resize-none transition-all focus:border-brand-primary" 
                  />
                </div>
                
                <button onClick={handleBatchImport} disabled={!importText || isAnalyzing} className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50 transition-all active:scale-[0.98]">
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Processing Ledger...
                    </>
                  ) : (
                    <>
                      <Zap size={18} /> Commit to Ledger
                    </>
                  )}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;