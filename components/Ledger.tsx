import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Expense, Income, Category, UserSettings, WealthItem, Notification, BudgetRule } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol, SUB_CATEGORIES } from '../constants';
import { 
  Trash2, Search, X, Sparkles, Loader2, Edit2, 
  Banknote, History, Zap, ArrowRightLeft,
  ArrowDownCircle, ArrowUpCircle, Wifi, Smartphone, 
  Shield, HeartPulse, ShoppingBag, Coffee, 
  Trophy, TrendingUp, Home, Car, Utensils, Plane,
  Gift, Dumbbell, ChevronLeft, ChevronRight,
  Briefcase, Scissors, Building2, PiggyBank,
  BookOpen, Construction, FilterX,
  BrainCircuit, ChevronRight as ChevronRightIcon,
  Fingerprint, LayoutList, BarChart3, BarChart2,
  TrendingDown, Activity, AlignLeft, Wand2,
  Heart, Star, Wallet, CreditCard, Coins, Receipt
} from 'lucide-react';
import { auditTransaction } from '../services/geminiService';
import { triggerHaptic } from '../utils/haptics';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface LedgerProps {
  expenses: Expense[];
  incomes: Income[];
  wealthItems: WealthItem[];
  settings: UserSettings;
  rules?: BudgetRule[];
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  onConfirm: (id: string, category: Category) => void;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  onEditRecord: (record: Expense | Income | WealthItem) => void;
  onOpenImport: () => void;
  onViewRule?: (ruleId: string) => void;
  viewDate: Date;
  onMonthChange: (direction: number) => void;
  onGoToDate: (year: number, month: number) => void;
  addNotification: (notif: Omit<Notification, 'timestamp' | 'read'> & { id?: string }) => void;
}

const getCategoryIcon = (category: string, subCategory?: string, type?: string) => {
  const sc = subCategory?.toLowerCase() || '';
  const c = category.toLowerCase();
  
  if (sc === 'bill payment') return <CreditCard size={16} />;
  if (sc === 'transfer') return <ArrowRightLeft size={16} />;
  if (sc.includes('rent') || sc.includes('mortgage') || sc.includes('home')) return <Home size={16} />;
  if (sc.includes('fuel') || sc.includes('transport') || sc.includes('car') || sc.includes('uber') || sc.includes('ola')) return <Car size={16} />;
  if (sc.includes('grocer') || sc.includes('market') || sc.includes('reliance') || sc.includes('blinkit')) return <ShoppingBag size={16} />;
  if (sc.includes('util') || sc.includes('electricity') || sc.includes('water') || sc.includes('gas')) return <Zap size={16} />;
  if (sc.includes('health') || sc.includes('insur') || sc.includes('hospital') || sc.includes('med')) return <HeartPulse size={16} />;
  if (sc.includes('internet') || sc.includes('wifi') || sc.includes('broadband')) return <Wifi size={16} />;
  if (sc.includes('mobile') || sc.includes('phone') || sc.includes('recharge')) return <Smartphone size={16} />;
  if (sc.includes('edu') || sc.includes('school') || sc.includes('course')) return <BookOpen size={16} />;
  if (sc.includes('house') || sc.includes('mainten') || sc.includes('clean')) return <Construction size={16} />;
  if (sc.includes('din') || sc.includes('eat') || sc.includes('rest') || sc.includes('zomato') || sc.includes('swiggy')) return <Utensils size={16} />;
  if (sc.includes('travel') || sc.includes('flight') || sc.includes('hotel') || sc.includes('trip')) return <Plane size={16} />;
  if (sc.includes('ent') || sc.includes('movie') || sc.includes('game') || sc.includes('netflix') || sc.includes('prime')) return <Activity size={16} />;
  if (sc.includes('gift') || sc.includes('present')) return <Gift size={16} />;
  if (sc.includes('hobb') || sc.includes('gym') || sc.includes('fit') || sc.includes('workout')) return <Dumbbell size={16} />;
  if (sc.includes('coffee') || sc.includes('cafe') || sc.includes('starbucks')) return <Coffee size={16} />;
  if (sc.includes('apparel') || sc.includes('cloth') || sc.includes('fashion') || sc.includes('myntra')) return <ShoppingBag size={16} />;
  if (sc.includes('beauty') || sc.includes('groom') || sc.includes('salon')) return <Scissors size={16} />;
  if (sc.includes('sip') || sc.includes('mutual') || sc.includes('fund') || sc.includes('invest')) return <TrendingUp size={16} />;
  if (sc.includes('gold')) return <Coins size={16} />;
  if (sc.includes('crypto') || sc.includes('bitcoin')) return <Activity size={16} />;
  if (sc.includes('real estate') || sc.includes('land')) return <Building2 size={16} />;
  if (sc.includes('retire') || sc.includes('pension')) return <PiggyBank size={16} />;
  if (sc.includes('transfer')) return <ArrowRightLeft size={16} />;

  if (type === 'Salary') return <Banknote size={16} />;
  if (type === 'Freelance') return <Briefcase size={16} />;
  if (type === 'Investment') return <TrendingUp size={16} />;
  if (type === 'Gift') return <Gift size={16} />;

  if (c === 'needs') return <Shield size={16} />;
  if (c === 'wants') return <Star size={16} />;
  if (c === 'savings') return <Trophy size={16} />;
  
  return <Sparkles size={16} />;
};

const getParentCategoryIndicator = (category: string, subCategory?: string) => {
  const c = category.toLowerCase();
  const sc = subCategory?.toLowerCase() || '';
  if (sc === 'bill payment') return <CreditCard size={8} className="text-indigo-400" />;
  if (sc === 'transfer') return <ArrowRightLeft size={8} className="text-slate-400" />;
  if (c === 'needs') return <Shield size={8} className="text-blue-500" />;
  if (c === 'wants') return <Heart size={8} className="text-rose-500" />;
  if (c === 'savings') return <PiggyBank size={8} className="text-emerald-500" />;
  return <Receipt size={8} className="text-slate-400" />;
};

const SwipeableItem: React.FC<{
  item: any;
  recordType: 'expense' | 'income' | 'transfer' | 'bill_payment';
  currencySymbol: string;
  matchedRule?: BudgetRule;
  onDelete: (id: string) => void;
  onEdit: (item: any) => void;
  onViewRule?: (ruleId: string) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  density: string;
}> = ({ item, recordType, currencySymbol, matchedRule, onDelete, onEdit, onViewRule, onUpdateExpense, density }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const touchStartX = useRef<number | null>(null);
  const totalMovementRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    if (e.touches.length > 0) { touchStartX.current = e.touches[0].clientX; totalMovementRef.current = 0; setIsSwiping(true); }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting || touchStartX.current === null || e.touches.length === 0) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    totalMovementRef.current = Math.max(totalMovementRef.current, Math.abs(diff));
    if (diff < 0) setOffsetX(diff);
  };
  const handleTouchEnd = () => {
    if (isDeleting) return;
    if (offsetX < -75) { triggerHaptic(20); setOffsetX(-1000); setIsDeleting(true); setTimeout(() => onDelete(item.id), 300); }
    else setOffsetX(0);
    setIsSwiping(false);
    touchStartX.current = null;
  };

  const amount = item.amount || 0;
  const parentCategory = recordType === 'expense' ? item.category : 'Uncategorized';
  const themeColor = recordType === 'income' ? '#10b981' : (recordType === 'transfer' || recordType === 'bill_payment') ? '#6366f1' : CATEGORY_COLORS[parentCategory] || '#94a3b8';
  
  const isRuleMatched = !!item.ruleId;
  const isAIUpgraded = item.isAIUpgraded;

  const handleAudit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    if (recordType !== 'expense' || auditLoading) return;
    
    setAuditLoading(true);
    let suggestedCategory: Category | null = null;
    const subCat = (item.subCategory || '').toLowerCase().trim();

    if (subCat) {
      for (const [cat, subList] of Object.entries(SUB_CATEGORIES)) {
        if (subList.some(s => s.toLowerCase().includes(subCat) || subCat.includes(s.toLowerCase()))) {
          suggestedCategory = cat as Category;
          break;
        }
      }
    }

    if (suggestedCategory) {
      await new Promise(r => setTimeout(r, 400));
      setAuditResult({
        isCorrect: item.category === suggestedCategory,
        suggestedCategory,
        insight: `Pattern match: "${item.subCategory}" mapped to ${suggestedCategory} hierarchy.`,
        isAnomaly: false
      });
    } else {
      const result = await auditTransaction(item, currencySymbol);
      setAuditResult(result);
    }
    setAuditLoading(false);
  };

  const applyAuditCategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    if (auditResult?.suggestedCategory && onUpdateExpense) {
      onUpdateExpense(item.id, { category: auditResult.suggestedCategory as Category, isAIUpgraded: true, isConfirmed: true });
      setAuditResult(null);
    }
  };

  const handleViewRuleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.ruleId && onViewRule) onViewRule(item.ruleId);
  };

  // Primary Title: Sub-category for Expenses, Type for Income
  const primaryTitle = recordType === 'income' ? item.type : (recordType === 'transfer' || recordType === 'bill_payment') ? item.subCategory : (item.subCategory || item.category);

  return (
    <div className={`relative overflow-hidden transition-all duration-300 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'} animate-slide-up`}>
      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-end px-6">
        <Trash2 className="text-slate-400 dark:text-slate-500" size={18} />
      </div>
      
      <div 
        onClick={() => totalMovementRef.current < 10 && (triggerHaptic(), onEdit({ ...item, recordType }))}
        className={`relative z-10 px-4 py-3 border-b border-slate-50 dark:border-slate-800/40 bg-white dark:bg-slate-950 transition-all active:bg-slate-50 dark:active:bg-slate-900 cursor-pointer group`} 
        style={{ transform: `translateX(${offsetX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }} 
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3 overflow-hidden">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 rounded-xl mt-0.5" style={{ backgroundColor: `${themeColor}15`, color: themeColor }}>
              {getCategoryIcon(parentCategory, item.subCategory, recordType === 'income' ? item.type : undefined)}
            </div>
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-[13px] truncate leading-tight">
                  {primaryTitle}
                </h4>
                {isRuleMatched && <Zap size={8} className="text-emerald-500 fill-emerald-500 shrink-0" />}
                {isAIUpgraded && <Sparkles size={8} className="text-indigo-400 shrink-0" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                  {item.merchant || 'General'}
                </span>
                <span className="text-[7px] text-slate-300 dark:text-slate-600 font-black">•</span>
                <div className="flex items-center gap-1">
                   {(recordType === 'expense' || recordType === 'bill_payment' || recordType === 'transfer') && (
                     <div className="flex items-center gap-1 mr-1">
                        {getParentCategoryIndicator(item.category, item.subCategory)}
                        <span className="text-[6px] font-black uppercase text-slate-400 tracking-tighter">{item.subCategory === 'Bill Payment' ? 'Settlement' : item.category}</span>
                     </div>
                   )}
                   <p className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                     {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                   </p>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right flex items-center gap-3 shrink-0 ml-2">
            <div>
              <p className={`font-black text-[15px] tracking-tight ${recordType === 'income' ? 'text-emerald-500' : (recordType === 'transfer' || recordType === 'bill_payment') ? 'text-indigo-500' : 'text-slate-900 dark:text-white'}`}>
                {recordType === 'income' ? '+' : (recordType === 'transfer' || recordType === 'bill_payment') ? '⇅' : '-'}{currencySymbol}{Math.round(amount).toLocaleString()}
              </p>
              {recordType === 'expense' && !auditResult && !isAIUpgraded && !isRuleMatched && (
                <button onClick={handleAudit} className="text-indigo-400 opacity-50 hover:opacity-100 transition-transform active:scale-90 mt-1">
                  {auditLoading ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                </button>
              )}
            </div>
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors"><Edit2 size={12} /></div>
          </div>
        </div>

        <div className="mt-3 space-y-2 border-t border-slate-50 dark:border-slate-800/50 pt-2 animate-kick">
           <div className="flex flex-col gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                   <Fingerprint size={10} className="text-slate-400" />
                   <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Source Context</span>
                </div>
                {isRuleMatched && (
                   <button onClick={handleViewRuleClick} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 hover:scale-105 active:scale-95 transition-all">
                      <span className="text-[7px] font-black uppercase">View Rule</span>
                      <ChevronRightIcon size={8} />
                   </button>
                )}
             </div>
             <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 italic leading-relaxed line-clamp-2">
                "{item.note || item.merchant || 'Manual entry - no source log recorded.'}"
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

const Ledger: React.FC<LedgerProps> = ({ 
  expenses, incomes, wealthItems, settings, rules = [], onDeleteExpense, onDeleteIncome, onEditRecord, onOpenImport, onViewRule, viewDate, onMonthChange, onUpdateExpense
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer' | 'bill_payment'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'compare'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const currencySymbol = getCurrencySymbol(settings.currency);
  const monthLabelCompact = `${viewDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}'${viewDate.getFullYear().toString().slice(-2)}`;

  const currentMonthTotals = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const exps = expenses.filter(e => !['Transfer', 'Bill Payment'].includes(e.subCategory || '') && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).reduce((sum, e) => sum + e.amount, 0);
    const incs = incomes.filter(i => new Date(i.date).getMonth() === m && new Date(i.date).getFullYear() === y).reduce((sum, i) => sum + i.amount, 0);
    return { income: incs, expense: exps, delta: incs - exps };
  }, [expenses, incomes, viewDate]);

  const compareData = useMemo(() => [
    { name: 'Income', amount: currentMonthTotals.income, color: '#10b981' },
    { name: 'Expense', amount: currentMonthTotals.expense, color: '#f43f5e' }
  ], [currentMonthTotals]);

  const filteredRecords = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const q = searchQuery.toLowerCase().trim();
    const exps = expenses.filter(e => !['Transfer', 'Bill Payment'].includes(e.subCategory || '') && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).map(e => ({ ...e, recordType: 'expense' as const }));
    const incs = incomes.filter(i => new Date(i.date).getMonth() === m && new Date(i.date).getFullYear() === y).map(i => ({ ...i, recordType: 'income' as const }));
    const transfers = expenses.filter(e => e.subCategory === 'Transfer' && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).map(e => ({ ...e, recordType: 'transfer' as const }));
    const billPayments = expenses.filter(e => e.subCategory === 'Bill Payment' && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).map(e => ({ ...e, recordType: 'bill_payment' as const }));
    
    let list: any[] = [];
    if (filterType === 'all') list = [...exps, ...incs, ...transfers, ...billPayments];
    else if (filterType === 'expense') list = exps;
    else if (filterType === 'income') list = incs;
    else if (filterType === 'transfer') list = transfers;
    else if (filterType === 'bill_payment') list = billPayments;
    
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!q) return list;
    return list.filter(rec => {
      const name = (rec.merchant || rec.note || '').toLowerCase();
      const cat = (rec.category || rec.type || '').toLowerCase();
      const sub = (rec.subCategory || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || sub.includes(q) || rec.amount?.toString().includes(q);
    });
  }, [filterType, expenses, incomes, viewDate, searchQuery]);

  const handleFilterToggle = (type: typeof filterType) => {
    triggerHaptic();
    setFilterType(prev => prev === type ? 'all' : type);
  };

  const handleModeToggle = (mode: typeof viewMode) => {
    triggerHaptic();
    setViewMode(mode);
  };

  return (
    <div className="pb-32 pt-1 animate-slide-up">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-4 rounded-2xl mb-1 shadow-md">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Ledger</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Registry Log</p>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={() => { triggerHaptic(); setIsSearchOpen(!isSearchOpen); }} 
               className={`p-2 rounded-xl transition-all ${isSearchOpen ? 'bg-white text-slate-900 shadow-sm' : 'bg-white/10 text-white active:scale-90'}`}
             >
               <Search size={14} />
             </button>
             <button 
               onClick={() => { triggerHaptic(); onOpenImport(); }} 
               className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all active:scale-90"
             >
               <Sparkles size={14} />
             </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-2 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
              <button onClick={() => (triggerHaptic(), onMonthChange(-1))} className="p-1.5 text-slate-400 hover:text-brand-primary transition-colors active:scale-90"><ChevronLeft size={14} strokeWidth={3} /></button>
              <div className="px-2 flex items-center gap-2">
                <History size={11} className="text-brand-primary" />
                <h2 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest leading-none">{monthLabelCompact}</h2>
              </div>
              <button onClick={() => (triggerHaptic(), onMonthChange(1))} className="p-1.5 text-slate-400 hover:text-brand-primary transition-colors active:scale-90"><ChevronRight size={14} strokeWidth={3} /></button>
              
              {/* Inline Filters */}
              {viewMode === 'list' && (
                <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                  <button onClick={() => handleFilterToggle('expense')} className={`p-1.5 rounded-lg transition-all active:scale-90 ${filterType === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400'}`}>
                    <TrendingDown size={14} strokeWidth={3} />
                  </button>
                  <button onClick={() => handleFilterToggle('income')} className={`p-1.5 rounded-lg transition-all active:scale-90 ${filterType === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`}>
                    <TrendingUp size={14} strokeWidth={3} />
                  </button>
                  <button onClick={() => handleFilterToggle('transfer')} className={`p-1.5 rounded-lg transition-all active:scale-90 ${filterType === 'transfer' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400'}`}>
                    <Activity size={14} strokeWidth={3} />
                  </button>
                  <button onClick={() => handleFilterToggle('bill_payment')} className={`p-1.5 rounded-lg transition-all active:scale-90 ${filterType === 'bill_payment' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>
                    <CreditCard size={14} strokeWidth={3} />
                  </button>
                  {filterType !== 'all' && (
                    <button onClick={() => (triggerHaptic(), setFilterType('all'))} className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors">
                      <FilterX size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700 shrink-0">
              <button 
                onClick={() => handleModeToggle('list')} 
                className={`p-1.5 rounded-lg transition-all active:scale-90 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}
                title="List View"
              >
                <LayoutList size={14} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => handleModeToggle('compare')} 
                className={`p-1.5 rounded-lg transition-all active:scale-90 ${viewMode === 'compare' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}
                title="Comparison View"
              >
                <BarChart3 size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {isSearchOpen && viewMode === 'list' && (
            <div className="animate-kick">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  autoFocus 
                  type="text" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="Search merchant, category or amount..." 
                  className="w-full bg-slate-50 dark:bg-slate-800 pl-9 pr-4 py-2.5 rounded-xl text-[10px] font-bold outline-none border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-primary transition-colors" 
                />
                {searchQuery && (
                  <button 
                    onClick={() => { triggerHaptic(); setSearchQuery(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
        {viewMode === 'list' ? (
          filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-36 text-center px-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl mb-4 text-slate-200 dark:text-slate-700">
                 <FilterX size={32} strokeWidth={1.5} />
              </div>
              <p className="text-slate-300 dark:text-slate-700 font-black text-[10px] uppercase tracking-[0.4em]">
                {searchQuery ? 'No search results found' : `No ${filterType === 'all' ? 'entries' : filterType} in registry`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {filteredRecords.map((rec) => (
                <SwipeableItem 
                  key={rec.id} 
                  item={rec} 
                  recordType={rec.recordType} 
                  currencySymbol={currencySymbol} 
                  matchedRule={rules.find(r => r.id === rec.ruleId)}
                  onDelete={rec.recordType === 'income' ? onDeleteIncome : onDeleteExpense} 
                  onEdit={onEditRecord} 
                  onViewRule={onViewRule}
                  onUpdateExpense={onUpdateExpense}
                  density={settings.density || 'Compact'} 
                />
              ))}
            </div>
          )
        ) : (
          <div className="p-6 animate-slide-up">
            <div className="flex flex-col items-center gap-6 mb-8">
              <div className="w-full grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl text-center">
                  <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Total Income</p>
                  <h3 className="text-xl font-black text-emerald-500 tracking-tighter">{currencySymbol}{currentMonthTotals.income.toLocaleString()}</h3>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-4 rounded-2xl text-center">
                  <p className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Total Expense</p>
                  <h3 className="text-xl font-black text-rose-500 tracking-tighter">{currencySymbol}{currentMonthTotals.expense.toLocaleString()}</h3>
                </div>
              </div>

              <div className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Net Cash Flow</p>
                <h2 className={`text-4xl font-black tracking-tighter ${currentMonthTotals.delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {currentMonthTotals.delta >= 0 ? '+' : ''}{currencySymbol}{Math.abs(currentMonthTotals.delta).toLocaleString()}
                </h2>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={({active, payload}) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/90 backdrop-blur px-3 py-2 rounded-xl border border-white/10 shadow-xl">
                            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                            <p className="text-sm font-black text-white">{currencySymbol}{(payload[0].value as number).toLocaleString()}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" radius={[12, 12, 0, 0]} barSize={60}>
                    {compareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex justify-around mt-2">
              {compareData.map(d => (
                <div key={d.name} className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ledger;