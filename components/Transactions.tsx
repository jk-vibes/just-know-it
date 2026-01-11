import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Expense, Income, Category, UserSettings, WealthItem, Notification } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  Trash2, Search, X, Sparkles, Loader2, Edit2, 
  Banknote, History, Wallet, Star, Shield, 
  Zap, HeartPulse, ShoppingBag, Coffee, 
  Trophy, TrendingUp, Landmark, CreditCard, 
  Globe, Bitcoin, Gem, Home, Activity,
  Plane, Utensils, Gift, Dumbbell, Car,
  ChevronLeft, ChevronRight, ArrowRightLeft,
  ArrowDownCircle, ArrowUpCircle, Wifi, Smartphone, 
  Briefcase, Scissors, User, Building2, PiggyBank,
  BookOpen, Construction, FilterX
} from 'lucide-react';
import { parseBulkTransactions, auditTransaction } from '../services/geminiService';
import { triggerHaptic } from '../utils/haptics';

interface TransactionsProps {
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

const getCategoryIcon = (category: string, subCategory?: string, type?: string) => {
  const sc = subCategory?.toLowerCase() || '';
  const c = category.toLowerCase();
  
  if (sc === 'transfer') return <ArrowRightLeft size={16} />;
  
  if (c === 'needs') {
    if (sc.includes('rent') || sc.includes('mortgage') || sc.includes('home')) return <Home size={16} />;
    if (sc.includes('fuel') || sc.includes('transport') || sc.includes('car')) return <Car size={16} />;
    if (sc.includes('grocer')) return <ShoppingBag size={16} />;
    if (sc.includes('util') || sc.includes('electricity') || sc.includes('water')) return <Zap size={16} />;
    if (sc.includes('health') || sc.includes('insur') || sc.includes('hospital')) return <HeartPulse size={16} />;
    if (sc.includes('internet') || sc.includes('wifi')) return <Wifi size={16} />;
    if (sc.includes('mobile') || sc.includes('phone')) return <Smartphone size={16} />;
    if (sc.includes('edu') || sc.includes('school')) return <BookOpen size={16} />;
    if (sc.includes('house') || sc.includes('mainten')) return <Construction size={16} />;
    return <Shield size={16} />;
  }
  
  if (c === 'wants') {
    if (sc.includes('din') || sc.includes('eat') || sc.includes('rest')) return <Utensils size={16} />;
    if (sc.includes('travel') || sc.includes('flight') || sc.includes('hotel')) return <Plane size={16} />;
    if (sc.includes('ent') || sc.includes('movie') || sc.includes('game')) return <Zap size={16} />;
    if (sc.includes('gift')) return <Gift size={16} />;
    if (sc.includes('hobb') || sc.includes('gym')) return <Dumbbell size={16} />;
    if (sc.includes('coffee') || sc.includes('cafe')) return <Coffee size={16} />;
    if (sc.includes('apparel') || sc.includes('cloth') || sc.includes('fashion')) return <ShoppingBag size={16} />;
    if (sc.includes('beauty') || sc.includes('groom') || sc.includes('salon')) return <Scissors size={16} />;
    return <Star size={16} />;
  }
  
  if (c === 'savings') {
    if (sc.includes('stock') || sc.includes('fund') || sc.includes('sip')) return <TrendingUp size={16} />;
    if (sc.includes('gold')) return <Gem size={16} />;
    if (sc.includes('crypto') || sc.includes('bitcoin')) return <Bitcoin size={16} />;
    if (sc.includes('emergency')) return <Shield size={16} />;
    if (sc.includes('real estate')) return <Building2 size={16} />;
    if (sc.includes('retire') || sc.includes('pension')) return <PiggyBank size={16} />;
    return <Trophy size={16} />;
  }
  
  if (type === 'Salary') return <Banknote size={16} />;
  if (type === 'Freelance') return <Briefcase size={16} />;
  if (type === 'Investment') return <TrendingUp size={16} />;
  if (type === 'Gift') return <Gift size={16} />;

  return <Sparkles size={16} />;
};

const SwipeableItem: React.FC<{
  item: Expense | Income;
  recordType: 'expense' | 'income' | 'transfer';
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (item: any) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  density: string;
}> = ({ item, recordType, currencySymbol, onDelete, onEdit, onUpdateExpense, density }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const touchStartX = useRef<number | null>(null);
  const totalMovementRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    if (e.touches.length > 0) { 
      touchStartX.current = e.touches[0].clientX; 
      totalMovementRef.current = 0;
      setIsSwiping(true); 
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting || touchStartX.current === null || e.touches.length === 0) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    totalMovementRef.current = Math.max(totalMovementRef.current, Math.abs(diff));
    if (diff < 0) setOffsetX(diff);
  };
  const handleTouchEnd = () => {
    if (isDeleting) return;
    if (offsetX < -75) { 
      triggerHaptic(20);
      setOffsetX(-1000); 
      setIsDeleting(true); 
      setTimeout(() => onDelete(item.id), 300); 
    }
    else setOffsetX(0);
    setIsSwiping(false);
    touchStartX.current = null;
  };

  const amount = (item as any).amount;
  const label = recordType === 'income' ? (item as Income).type : recordType === 'transfer' ? 'Transfer' : (item as Expense).category;
  const subCategory = (item as any).subCategory;
  const name = (item as any).merchant || (item as any).note || 'Entry';
  const themeColor = recordType === 'income' ? '#10b981' : recordType === 'transfer' ? '#6366f1' : CATEGORY_COLORS[(item as Expense).category];
  
  const isDiscretionary = recordType === 'expense' && (item as Expense).category === 'Wants';

  const handleAudit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    if (recordType !== 'expense' || auditLoading) return;
    setAuditLoading(true);
    const result = await auditTransaction(item as Expense, currencySymbol);
    setAuditResult(result);
    setAuditLoading(false);
  };

  const applyAuditCategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    if (auditResult?.suggestedCategory && onUpdateExpense) {
      onUpdateExpense(item.id, { category: auditResult.suggestedCategory as Category });
      setAuditResult(null);
    }
  };

  const handleItemClick = () => {
    if (totalMovementRef.current < 5) {
      triggerHaptic();
      onEdit(item);
    }
  };

  return (
    <div className={`relative overflow-hidden transition-all duration-300 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-[300px] opacity-100'} animate-slide-up`}>
      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-end px-6">
        <Trash2 className="text-slate-400 dark:text-slate-500" size={18} />
      </div>
      
      <div 
        onClick={handleItemClick}
        className={`relative z-10 px-4 py-2.5 border-b border-slate-50 dark:border-slate-800/40 bg-white dark:bg-slate-950 transition-transform active:bg-slate-50 dark:active:bg-slate-900 cursor-pointer`} 
        style={{ 
          transform: `translateX(${offsetX}px)`, 
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        }} 
        onTouchStart={handleTouchStart} 
        onTouchMove={handleTouchMove} 
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div 
              className="w-10 h-10 flex items-center justify-center shrink-0 rounded-xl" 
              style={{ 
                backgroundColor: `${themeColor}15`,
                color: themeColor
              }}
            >
              {getCategoryIcon(label, subCategory, recordType === 'income' ? (item as Income).type : undefined)}
            </div>
            
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-[13px] truncate leading-tight">
                  {name}
                </h4>
              </div>
              
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {subCategory || label}
                </span>
                <span className="text-[7px] text-slate-300 dark:text-slate-600 font-black">•</span>
                <p className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                  {new Date((item as any).date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                {isDiscretionary && (
                  <Star size={8} className="text-amber-400 fill-amber-400 shrink-0 ml-1" />
                )}
                {recordType === 'expense' && !auditResult && (
                  <button onClick={handleAudit} className="text-indigo-400 opacity-50 hover:opacity-100 transition-transform active:scale-90 shrink-0 ml-0.5">
                    {auditLoading ? <Loader2 size={8} className="animate-spin" /> : <Sparkles size={8} />}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right shrink-0 ml-2">
            <p className={`font-black text-[15px] tracking-tight ${recordType === 'income' ? 'text-emerald-500' : recordType === 'transfer' ? 'text-indigo-500' : 'text-slate-900 dark:text-white'}`}>
              {recordType === 'income' ? '+' : recordType === 'transfer' ? '⇅' : '-'}{currencySymbol}{Math.round(amount).toLocaleString()}
            </p>
          </div>
        </div>
        
        {auditResult && (
          <div className="mt-2 p-1.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30 animate-kick">
            <p className="text-[7px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{auditResult.insight}</p>
            {!auditResult.isCorrect && (
              <button onClick={applyAuditCategory} className="mt-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-[6px] font-black text-indigo-600 uppercase tracking-widest">Apply AI Suggestion</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Transactions: React.FC<TransactionsProps> = ({ 
  expenses, incomes, wealthItems, settings, onDeleteExpense, onDeleteIncome, onEditRecord, onAddBulk, viewDate, onMonthChange, addNotification, onUpdateExpense
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const currencySymbol = getCurrencySymbol(settings.currency);
  const monthLabelCompact = `${viewDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}'${viewDate.getFullYear().toString().slice(-2)}`;

  const filteredRecords = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const q = searchQuery.toLowerCase().trim();

    const exps = expenses
      .filter(e => e.subCategory !== 'Transfer' && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y)
      .map(e => ({ ...e, recordType: 'expense' as const }));
    
    const incs = incomes
      .filter(i => new Date(i.date).getMonth() === m && new Date(i.date).getFullYear() === y)
      .map(i => ({ ...i, recordType: 'income' as const }));
    
    const transfers = expenses
      .filter(e => e.subCategory === 'Transfer' && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y)
      .map(e => ({ ...e, recordType: 'transfer' as const }));

    let list: any[] = [];
    if (filterType === 'all') list = [...exps, ...incs, ...transfers];
    else if (filterType === 'expense') list = exps;
    else if (filterType === 'income') list = incs;
    else if (filterType === 'transfer') list = transfers;

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!q) return list;
    return list.filter(rec => {
      const name = (rec.merchant || rec.note || rec.name || '').toLowerCase();
      const cat = (rec.category || rec.type || '').toLowerCase();
      const sub = (rec.subCategory || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || sub.includes(q) || rec.amount?.toString().includes(q);
    });
  }, [filterType, expenses, incomes, viewDate, searchQuery]);

  const handleBatchImport = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    triggerHaptic();
    setIsAnalyzing(true);
    try {
      const chunkResults = await parseBulkTransactions(textToProcess, settings.currency);
      if (chunkResults?.length > 0) {
        onAddBulk(chunkResults);
        addNotification({ type: 'Activity', title: 'Import Successful', message: `Added ${chunkResults.length} records.`, severity: 'success' });
      }
      setShowImportModal(false);
    } catch (err) { } finally { setIsAnalyzing(false); }
  };

  const toggleFilter = (type: typeof filterType) => {
    triggerHaptic();
    setFilterType(prev => prev === type ? 'all' : type);
  };

  const handleMonthNav = (dir: number) => {
    triggerHaptic();
    onMonthChange(dir);
  };

  const density = settings.density || 'Compact';

  return (
    <div className="pb-32 pt-1 animate-slide-up">
      {/* BRAND HEADER CARD: Unified with other pages */}
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-4 rounded-2xl mb-1 shadow-md">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Transactions</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Activity Ledger</p>
          </div>
          <div className="flex gap-2">
             <button onClick={() => { triggerHaptic(); setIsSearchOpen(!isSearchOpen); }} className={`p-2 rounded-xl transition-all ${isSearchOpen ? 'bg-white text-slate-900 shadow-sm' : 'bg-white/10 text-white active:scale-90'}`}><Search size={14} /></button>
             <button onClick={() => { triggerHaptic(); setShowImportModal(true); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all active:scale-90"><Sparkles size={14} /></button>
          </div>
        </div>
      </div>

      {/* FILTER & NAV CARD: Redesigned as per requirements */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-2 shadow-sm">
        <div className="flex items-center justify-between">
           {/* MONTH DISPLAY WITH NAV */}
           <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
             <button onClick={() => handleMonthNav(-1)} className="p-1.5 text-slate-400 hover:text-brand-primary transition-colors active:scale-90">
               <ChevronLeft size={14} strokeWidth={3} />
             </button>
             <div className="px-2 flex items-center gap-2">
               <History size={11} className="text-brand-primary" />
               <h2 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest leading-none">
                 {monthLabelCompact}
               </h2>
             </div>
             <button onClick={() => handleMonthNav(1)} className="p-1.5 text-slate-400 hover:text-brand-primary transition-colors active:scale-90">
               <ChevronRight size={14} strokeWidth={3} />
             </button>
           </div>
           
           {/* ICON FILTERS */}
           <div className="flex items-center gap-1.5">
             <button 
                onClick={() => toggleFilter('expense')} 
                className={`p-2 rounded-xl border transition-all active:scale-90 flex items-center gap-1.5 ${filterType === 'expense' ? 'bg-rose-500 border-rose-500 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                title="Expenses Only"
             >
                <ArrowDownCircle size={14} />
             </button>
             <button 
                onClick={() => toggleFilter('income')} 
                className={`p-2 rounded-xl border transition-all active:scale-90 flex items-center gap-1.5 ${filterType === 'income' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                title="Income Only"
             >
                <ArrowUpCircle size={14} />
             </button>
             <button 
                onClick={() => toggleFilter('transfer')} 
                className={`p-2 rounded-xl border transition-all active:scale-90 flex items-center gap-1.5 ${filterType === 'transfer' ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                title="Transfers Only"
             >
                <ArrowRightLeft size={14} />
             </button>
             {filterType !== 'all' && (
               <button 
                 onClick={() => { triggerHaptic(); setFilterType('all'); }} 
                 className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-300 rounded-xl hover:text-slate-500 transition-colors active:scale-90"
                 title="Clear Filter"
               >
                 <FilterX size={14} />
               </button>
             )}
           </div>
        </div>

        {isSearchOpen && (
          <div className="mt-3 animate-kick">
            <div className="relative">
              <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search records..." className="w-full bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-xl text-[10px] font-bold outline-none border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-brand-primary" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2"><Search size={12} className="text-slate-300" /></div>
            </div>
          </div>
        )}
      </div>

      {/* TRANSACTION LIST SECTION */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
        <section className="min-h-[400px]">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-36 px-10">
              <p className="text-slate-300 dark:text-slate-700 font-black text-[10px] uppercase tracking-[0.4em]">No results found</p>
              <p className="text-[8px] text-slate-400 dark:text-slate-600 font-bold uppercase mt-3 tracking-widest opacity-60">Try adjusting your filters or date range</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {filteredRecords.map((rec) => (
                <SwipeableItem 
                  key={rec.id} 
                  item={rec as any} 
                  recordType={rec.recordType} 
                  currencySymbol={currencySymbol} 
                  onDelete={rec.recordType === 'income' ? onDeleteIncome : onDeleteExpense} 
                  onEdit={onEditRecord} 
                  onUpdateExpense={onUpdateExpense} 
                  density={density} 
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 w-full rounded-t-[32px] shadow-2xl flex flex-col max-h-[85vh] animate-slide-up">
             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase dark:text-white tracking-widest">External Data Integration</h3>
                <button onClick={() => { triggerHaptic(); setShowImportModal(false); }} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-400 active:scale-90 transition-transform"><X size={18} /></button>
             </div>
             <div className="p-6 overflow-y-auto no-scrollbar space-y-4">
                <div className="space-y-4">
                  <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste SMS logs or CSV formatted text here..." className="w-full h-40 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-[11px] font-medium outline-none border border-slate-100 dark:border-slate-800 dark:text-white resize-none transition-all focus:border-brand-primary" />
                  <button onClick={() => handleBatchImport(importText)} disabled={!importText || isAnalyzing} className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50 transition-all active:scale-[0.98]">
                    {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : 'Execute Sequence Process'}
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;