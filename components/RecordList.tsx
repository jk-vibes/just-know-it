
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Expense, Income, Category, UserSettings, WealthItem, Notification } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { Trash2, Search, X, Sparkles, Loader2, Landmark, Edit2, ChevronLeft, ChevronRight, FileUp, FileText, Briefcase, CreditCard, ClipboardPaste, MessageSquare } from 'lucide-react';
import { parseBulkTransactions } from '../services/geminiService';

interface RecordListProps {
  expenses: Expense[];
  incomes: Income[];
  wealthItems: WealthItem[];
  settings: UserSettings;
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  onDeleteWealth: (id: string) => void;
  onConfirm: (id: string, category: Category) => void;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  onEditRecord: (record: Expense | Income | WealthItem) => void;
  onAddBulk: (expenses: Omit<Expense, 'id'>[]) => void;
  viewDate: Date;
  onMonthChange: (direction: number) => void;
  onGoToDate: (year: number, month: number) => void;
  addNotification: (notif: Omit<Notification, 'timestamp' | 'read'> & { id?: string }) => void;
}

const parseCSVRow = (row: string) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += char;
  }
  result.push(current);
  return result;
};

const SwipeableItem: React.FC<{
  item: Expense | Income | WealthItem;
  recordType: 'expense' | 'income' | 'wealth';
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (item: any) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
}> = ({ item, recordType, currencySymbol, onDelete, onEdit }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    if (e.touches.length > 0) { touchStartX.current = e.touches[0].clientX; setIsSwiping(true); }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting || touchStartX.current === null || e.touches.length === 0) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff < 0) setOffsetX(diff);
  };

  const handleTouchEnd = () => {
    if (isDeleting) return;
    if (offsetX < -75) {
      setOffsetX(-1000);
      setIsDeleting(true);
      setTimeout(() => onDelete(item.id), 300);
    } else { setOffsetX(0); }
    setIsSwiping(false);
    touchStartX.current = null;
  };

  const amount = (item as any).amount || (item as any).value;
  const label = recordType === 'wealth' ? (item as WealthItem).category : recordType === 'income' ? (item as Income).type : (item as Expense).category;
  const name = (item as any).merchant || (item as any).note || (item as any).name || 'Entry';
  const isLiability = recordType === 'wealth' && (item as WealthItem).type === 'Liability';

  return (
    <div className={`relative overflow-hidden group transition-all duration-300 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'} animate-slide-up`}>
      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end px-5"><Trash2 className="text-white animate-pulse" size={20} /></div>
      <div 
        className={`relative z-10 py-3 px-1 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 transition-transform`}
        style={{ transform: `translateX(${offsetX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[9px] shadow-sm`} style={{ backgroundColor: recordType === 'income' ? '#4f46e5' : recordType === 'wealth' ? (isLiability ? '#f59e0b' : '#10b981') : CATEGORY_COLORS[(item as Expense).category] }}>
              {recordType === 'income' ? <Landmark size={12} /> : recordType === 'wealth' ? (isLiability ? <CreditCard size={12} /> : <Briefcase size={12} />) : label[0]}
            </div>
            <div className="min-w-0">
              <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs truncate max-w-[140px]">{name}</h4>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">{label}</p>
            </div>
          </div>
          <div className="text-right flex items-center gap-2">
            <div className="flex flex-col items-end">
              <p className={`font-black text-sm ${recordType === 'income' ? 'text-indigo-600' : isLiability ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                {recordType === 'income' ? '+' : recordType === 'wealth' ? '' : '-'}{currencySymbol}{amount.toLocaleString()}
              </p>
              <p className="text-[7px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">{recordType}</p>
            </div>
            <button onClick={() => onEdit(item)} className="p-1 text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all"><Edit2 size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecordList: React.FC<RecordListProps> = ({ 
  expenses, incomes, wealthItems, settings, onDeleteExpense, onDeleteIncome, onDeleteWealth, onEditRecord, onAddBulk, viewDate, addNotification
}) => {
  const [activeTab, setActiveTab] = useState<'activity' | 'portfolio'>('activity');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importSource, setImportSource] = useState<'text' | 'file'>('text');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currencySymbol = getCurrencySymbol(settings.currency);
  const monthLabelCompact = `${viewDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}'${viewDate.getFullYear().toString().slice(-2)}`;

  const activityRecords = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const exps = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y; }).map(e => ({ ...e, recordType: 'expense' as const }));
    const incs = incomes.filter(i => { const d = new Date(i.date); return d.getMonth() === m && d.getFullYear() === y; }).map(i => ({ ...i, recordType: 'income' as const }));
    return [...exps, ...incs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, incomes, viewDate]);

  const filteredRecords = useMemo(() => {
    const list = activeTab === 'activity' ? activityRecords : wealthItems.map(w => ({ ...w, recordType: 'wealth' as const }));
    return list.filter(rec => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const note = ((rec as any).note || (rec as any).merchant || (rec as any).name || '').toLowerCase();
      return note.includes(q) || (rec as any).amount?.toString().includes(q) || (rec as any).value?.toString().includes(q);
    });
  }, [activeTab, activityRecords, wealthItems, searchQuery]);

  const handleBatchImport = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    
    const importId = 'batch-import-' + Date.now();
    setShowImportModal(false);
    setImportText('');
    setIsAnalyzing(true);
    
    addNotification({
      id: importId,
      type: 'Activity',
      title: 'Import Started',
      message: 'Processing your transactions (0%)...',
      severity: 'info'
    });

    try {
      const lines = textToProcess.split('\n').filter(l => l.trim().length > 10);
      let totalImported = 0;
      const CHUNK_SIZE = 12;
      const totalChunks = Math.ceil(lines.length / CHUNK_SIZE);

      for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
        const chunk = lines.slice(i, i + CHUNK_SIZE).join('\n');
        const chunkResults = await parseBulkTransactions(chunk, settings.currency);
        
        if (chunkResults && Array.isArray(chunkResults) && chunkResults.length > 0) {
          onAddBulk(chunkResults);
          totalImported += chunkResults.length;
        }
        
        const currentChunk = Math.floor(i / CHUNK_SIZE) + 1;
        const progress = Math.min(100, Math.round((currentChunk / totalChunks) * 100));
        addNotification({
          id: importId,
          type: 'Activity',
          title: 'Import Progress',
          message: `Processing your transactions (${progress}%)...`,
          severity: 'info'
        });
      }
      
      if (totalImported > 0) {
        addNotification({
          id: importId,
          type: 'Activity',
          title: 'Import Complete',
          message: `Successfully processed and added ${totalImported} records.`,
          severity: 'success'
        });
      } else {
        addNotification({
          id: importId,
          type: 'Activity',
          title: 'Import Result',
          message: 'No clear financial transactions were found in the text provided.',
          severity: 'warning'
        });
      }
    } catch (err) {
      console.error("Import error", err);
      addNotification({
        id: importId,
        type: 'Activity',
        title: 'Import Error',
        message: 'The AI encountered an error processing this batch.',
        severity: 'error'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const rows = content.split('\n');
      if (rows.length < 2) return;

      const headers = rows[0].toLowerCase().split(',');
      const bodyIdx = headers.findIndex(h => h.includes('body') || h.includes('content') || h.includes('msg') || h.includes('sms') || h.includes('text'));
      
      if (bodyIdx === -1) {
        alert("CSV format not recognized. Ensure there is a 'Content' or 'Body' column.");
        return;
      }

      const extractedMessages = rows.slice(1)
        .map(row => {
          const cols = parseCSVRow(row);
          return cols[bodyIdx]?.trim();
        })
        .filter(msg => {
          if (!msg) return false;
          const m = msg.toLowerCase();
          return m.includes('spent') || m.includes('debited') || m.includes('credited') || m.includes('salary') || m.includes('paid') || m.includes('upi') || m.includes('rs.') || m.includes('inr');
        })
        .join('\n');

      if (!extractedMessages) {
        alert("No transaction-like messages found in this CSV.");
        return;
      }
      
      setImportText(extractedMessages);
      setImportSource('text');
    };
    reader.readAsText(file);
  };

  return (
    <div className="pb-32 pt-1 min-h-full">
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-1.5 -mx-4 px-4 border-b border-slate-100 dark:border-slate-800 transition-colors">
        <div className="flex items-center justify-between mb-2">
           <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{activeTab === 'activity' ? monthLabelCompact : 'PORTFOLIO'}</h2>
           <div className="flex items-center gap-1">
             <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`p-1.5 rounded-lg ${isSearchOpen ? 'text-brand-primary' : 'text-slate-400'}`}><Search size={16} /></button>
             {activeTab === 'activity' && (
               <button onClick={() => setShowImportModal(true)} className="p-1.5 text-slate-400 hover:text-brand-primary relative">
                 <Sparkles size={16} />
                 {isAnalyzing && (
                   <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full animate-pulse border border-white dark:border-slate-900"></span>
                 )}
               </button>
             )}
           </div>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button onClick={() => setActiveTab('activity')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'activity' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}>Transactions</button>
          <button onClick={() => setActiveTab('portfolio')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'portfolio' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}>Assets & Debts</button>
        </div>

        {isSearchOpen && (
          <div className="mt-2 animate-kick">
            <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter entries..." className="w-full bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-[10px] font-bold outline-none dark:text-white" />
          </div>
        )}
      </div>

      <div className="mt-2">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-20 bg-slate-50/20 rounded-2xl border border-dashed border-slate-100 dark:border-slate-800">
            <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest">No matching entries</p>
          </div>
        ) : (
          filteredRecords.map((rec) => (
            <SwipeableItem 
              key={rec.id} 
              item={rec as any} 
              recordType={rec.recordType} 
              currencySymbol={currencySymbol} 
              onDelete={rec.recordType === 'income' ? onDeleteIncome : rec.recordType === 'wealth' ? onDeleteWealth : onDeleteExpense} 
              onEdit={onEditRecord}
            />
          ))
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[32px] animate-slide-up shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
             <div className="flex justify-between items-center px-6 py-4 border-b dark:border-slate-800">
                <div className="flex items-center gap-2">
                   <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl text-indigo-600"><Sparkles size={18} /></div>
                   <h3 className="text-sm font-black uppercase dark:text-white tracking-widest">Batch AI Import</h3>
                </div>
                <button onClick={() => setShowImportModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"><X size={18} /></button>
             </div>

             <div className="p-1.5 bg-slate-50 dark:bg-slate-800/50 flex gap-1 border-b dark:border-slate-800">
                <button onClick={() => setImportSource('text')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${importSource === 'text' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                  <MessageSquare size={12} /> Paste Text
                </button>
                <button onClick={() => setImportSource('file')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${importSource === 'file' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                  <FileUp size={12} /> Upload CSV
                </button>
             </div>
             
             <div className="p-6 flex-1 overflow-y-auto no-scrollbar space-y-6">
                {importSource === 'text' ? (
                  <div className="space-y-4">
                    <textarea 
                      value={importText} 
                      onChange={(e) => setImportText(e.target.value)} 
                      placeholder="Paste SMS messages, bank alerts, or transaction logs here..." 
                      className="w-full h-64 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-xs font-medium outline-none border border-slate-100 dark:border-slate-700 focus:border-indigo-500 dark:text-white resize-none transition-colors" 
                    />
                    <div className="flex gap-2">
                       <button onClick={async () => {
                         try { const text = await navigator.clipboard.readText(); setImportText(text); } catch(e) { alert("Clipboard access denied."); }
                       }} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                         <ClipboardPaste size={14} /> Paste
                       </button>
                       <button onClick={() => setImportText('')} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-full text-indigo-600"><FileText size={32} /></div>
                    <div>
                       <p className="text-xs font-black text-slate-900 dark:text-white uppercase">Upload SMS Export</p>
                       <p className="text-[10px] font-bold text-slate-400 mt-1">Supports standard CSV formats</p>
                    </div>
                    <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all">Select File</button>
                  </div>
                )}

                <button 
                  onClick={() => handleBatchImport(importText)} 
                  disabled={!importText || isAnalyzing} 
                  className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <><Sparkles size={18} /> Run AI Extraction</>}
                </button>
                
                <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest opacity-60">AI processes in batches for accuracy</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordList;
