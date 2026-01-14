import React, { useState, useMemo, useEffect } from 'react';
import { BudgetItem, RecurringItem, UserSettings, Category, Expense, Bill } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol, SUB_CATEGORIES } from '../constants';
import { Target, Plus, Trash2, PieChart, ChevronDown, ChevronUp, AlertCircle, Info, Bookmark, Sparkles, Loader2, X, TrendingUp, Check, Layers, Tag, Clock, Calendar, ShieldCheck, ArrowRight, Repeat, Store, Camera } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { predictBudgetCategory } from '../services/geminiService';

interface BudgetPlannerProps {
  budgetItems: BudgetItem[];
  recurringItems: RecurringItem[];
  expenses: Expense[];
  bills: Bill[];
  settings: UserSettings;
  onAddBudget: (item: Omit<BudgetItem, 'id'>) => void;
  onUpdateBudget: (id: string, updates: Partial<BudgetItem>) => void;
  onDeleteBudget: (id: string) => void;
  onPayBill: (bill: Bill) => void;
  onDeleteBill: (id: string) => void;
  onSmartAddBill: () => void;
  viewDate: Date;
  externalShowAdd?: boolean;
  onAddClose?: () => void;
}

const BudgetPlanner: React.FC<BudgetPlannerProps> = ({
  budgetItems, recurringItems, expenses, bills, settings, onAddBudget, onUpdateBudget, onDeleteBudget, onPayBill, onDeleteBill, onSmartAddBill, viewDate, externalShowAdd, onAddClose
}) => {
  const [activeView, setActiveView] = useState<'Budgets' | 'Bills'>('Budgets');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<Category>('Needs');
  const [newItemSubCategory, setNewItemSubCategory] = useState('General');
  const [isDetecting, setIsDetecting] = useState(false);

  const currencySymbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    if (externalShowAdd) {
      if (activeView === 'Budgets') {
        setEditingItem(null);
        setShowAddForm(true);
      } else {
        onSmartAddBill();
      }
      onAddClose?.();
    }
  }, [externalShowAdd, activeView, onSmartAddBill, onAddClose]);

  useEffect(() => {
    if (editingItem) {
      setNewItemName(editingItem.name);
      setNewItemAmount(editingItem.amount.toString());
      setNewItemCategory(editingItem.category);
      setNewItemSubCategory(editingItem.subCategory || 'General');
    } else {
      setNewItemName('');
      setNewItemAmount('');
      setNewItemCategory('Needs');
      setNewItemSubCategory('General');
    }
  }, [editingItem]);

  const itemUtilization = useMemo(() => {
    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    const currentExps = expenses.filter(e => {
      const d = new Date(e.date);
      return e.isConfirmed && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const mapping: Record<string, number> = {};
    budgetItems.forEach(item => {
      const matchedAmount = currentExps
        .filter(e => {
          const catMatch = e.category === item.category;
          const subMatch = e.subCategory === item.subCategory;
          if (catMatch && subMatch) return true;
          if (catMatch && item.name && (e.merchant?.toLowerCase().includes(item.name.toLowerCase()) || e.note?.toLowerCase().includes(item.name.toLowerCase()))) return true;
          return false;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      mapping[item.id] = Math.round(matchedAmount);
    });
    return mapping;
  }, [budgetItems, expenses, viewDate]);

  const summary = useMemo(() => {
    const totals = { Needs: 0, Wants: 0, Savings: 0 };
    const spentTotals = { Needs: 0, Wants: 0, Savings: 0 };
    budgetItems.forEach(item => {
      if (item.category !== 'Uncategorized') {
        totals[item.category] += item.amount;
        spentTotals[item.category] += (itemUtilization[item.id] || 0);
      }
    });
    const targets = {
      Needs: (settings.monthlyIncome * settings.split.Needs) / 100,
      Wants: (settings.monthlyIncome * settings.split.Wants) / 100,
      Savings: (settings.monthlyIncome * settings.split.Savings) / 100
    };
    return { totals, targets, spentTotals, grandTotal: totals.Needs + totals.Wants + totals.Savings, grandSpent: spentTotals.Needs + spentTotals.Wants + spentTotals.Savings };
  }, [budgetItems, settings.monthlyIncome, settings.split, itemUtilization]);

  const handleDetectCategory = async () => {
    if (!newItemName.trim() || isDetecting) return;
    triggerHaptic();
    setIsDetecting(true);
    const result = await predictBudgetCategory(newItemName);
    if (result) {
      setNewItemCategory(result.category);
      setNewItemSubCategory(result.subCategory);
    }
    setIsDetecting(false);
  };

  const handleInternalSubmit = () => {
    if (!newItemName || !newItemAmount) return;
    triggerHaptic(20);
    const payload = {
      name: newItemName,
      amount: Math.round(parseFloat(newItemAmount)),
      category: newItemCategory,
      subCategory: newItemSubCategory
    };

    if (editingItem) {
      onUpdateBudget(editingItem.id, payload);
    } else {
      onAddBudget(payload);
    }
    closeForm();
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingItem(null);
  };

  const handleItemClick = (item: BudgetItem) => {
    triggerHaptic();
    setEditingItem(item);
    setShowAddForm(true);
  };

  const sortedBills = useMemo(() => {
    return [...bills].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [bills]);

  const nextCriticalBill = useMemo(() => {
    const unpaid = bills.filter(b => !b.isPaid);
    if (unpaid.length === 0) return null;
    return unpaid.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  }, [bills]);

  const sectionClass = `glass premium-card p-5 rounded-[32px] mb-3 relative overflow-hidden`;

  return (
    <div className="pb-32 pt-1 animate-slide-up">
      <div className="bg-gradient-to-r from-violet-700 to-purple-800 px-5 py-4 rounded-2xl mb-4 mx-1 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
        <div className="flex justify-between items-center w-full relative z-10">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Budget Planner</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Financial Architecture</p>
          </div>
        </div>
      </div>

      <div className="flex glass p-1.5 rounded-2xl mb-3 mx-1 border-white/10 shadow-sm">
        <button 
          onClick={() => setActiveView('Budgets')}
          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${activeView === 'Budgets' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-lg scale-105' : 'text-slate-400'}`}
        >
          Allocations
        </button>
        <button 
          onClick={() => setActiveView('Bills')}
          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeView === 'Bills' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-lg scale-105' : 'text-slate-400'}`}
        >
          Commitments {bills.length > 0 && <span className="w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[7px] font-black">{bills.length}</span>}
        </button>
      </div>

      {activeView === 'Budgets' ? (
        <>
          <section className={sectionClass}>
            <div className="flex justify-between items-end mb-5">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Planned Target</p>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                  <span className="text-sm opacity-40 mr-1 font-bold">{currencySymbol}</span>
                  {summary.grandTotal.toLocaleString()}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Realized</p>
                <p className="text-lg font-black text-brand-accent">{currencySymbol}{summary.grandSpent.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden p-1 border border-slate-200 dark:border-slate-700">
              {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => {
                const perc = summary.grandTotal > 0 ? (summary.totals[cat] / Math.max(summary.grandTotal, settings.monthlyIncome)) * 100 : 0;
                return <div key={cat} style={{ width: `${perc}%`, backgroundColor: CATEGORY_COLORS[cat] }} className="rounded-full mx-0.5 shadow-sm" />;
              })}
            </div>
          </section>

          <div className="space-y-3">
            {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
              <div key={cat} className={`${sectionClass} border-l-8`} style={{ borderLeftColor: CATEGORY_COLORS[cat] }}>
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{cat}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Cap: {currencySymbol}{summary.targets[cat].toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {budgetItems.filter(i => i.category === cat).map(item => {
                    const actual = itemUtilization[item.id] || 0;
                    const utilPerc = item.amount > 0 ? (actual / item.amount) * 100 : 0;
                    const isOver = actual > item.amount;
                    
                    return (
                      <div key={item.id} onClick={() => handleItemClick(item)} className="space-y-2.5 group cursor-pointer active:scale-[0.98] transition-all">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <span className="text-[12px] font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none group-hover:text-brand-primary transition-colors">{item.name}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1.5">{item.subCategory}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-black text-slate-900 dark:text-white leading-none">
                              <span className={isOver ? 'text-rose-500' : 'text-slate-500'}>{currencySymbol}{actual.toLocaleString()}</span>
                              <span className="text-[10px] text-slate-300 dark:text-slate-600 ml-1 font-bold">/ {currencySymbol}{item.amount.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${isOver ? 'bg-rose-500' : ''}`}
                            style={{ 
                              width: `${Math.min(100, utilPerc)}%`,
                              backgroundColor: isOver ? undefined : CATEGORY_COLORS[cat]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {budgetItems.filter(i => i.category === cat).length === 0 && (
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center py-2 italic">Zero nodes defined</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3 animate-kick">
           {nextCriticalBill && (
             <section className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-2xl p-5 shadow-xl relative overflow-hidden mx-1 mb-1">
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                <div className="flex items-center justify-between relative z-10">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/20">
                         <Sparkles size={24} strokeWidth={2.5} />
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-indigo-100 uppercase tracking-widest">Active Threshold</p>
                         <h4 className="text-sm font-black text-white mt-0.5">Settle {nextCriticalBill.merchant}</h4>
                      </div>
                   </div>
                   <button onClick={() => onPayBill(nextCriticalBill)} className="px-4 py-2 bg-white text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-90 transition-all">Authorize</button>
                </div>
             </section>
           )}

           <section className={sectionClass}>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-brand-primary/10 rounded-2xl text-brand-primary">
                   <ShieldCheck size={20} strokeWidth={2.5} />
                 </div>
                 <div>
                   <h3 className="text-xs font-black uppercase tracking-tight dark:text-white">Remittance Registry</h3>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Static Liability Scan</p>
                 </div>
               </div>
               <button 
                 onClick={onSmartAddBill}
                 className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all border border-white/10"
               >
                 <Camera size={14} /> Capture
               </button>
             </div>
           </section>

           <div className="space-y-3 px-1">
             {sortedBills.map(bill => {
               const diff = new Date(bill.dueDate).getTime() - new Date().getTime();
               const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
               const isOverdue = days < 0;
               const isToday = days === 0;

               return (
                 <div key={bill.id} className="glass premium-card rounded-[32px] p-5 relative overflow-hidden group">
                   <div className="flex justify-between items-start mb-4 relative z-10">
                     <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'} backdrop-blur-sm border border-current opacity-70`}>
                         <Clock size={18} strokeWidth={2.5} />
                       </div>
                       <div>
                         <h4 className="text-[13px] font-black text-slate-800 dark:text-white truncate max-w-[150px] tracking-tight">{bill.merchant}</h4>
                         <div className="flex items-center gap-2 mt-1">
                           <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isOverdue ? 'bg-rose-500 text-white shadow-rose-200 shadow-sm' : isToday ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                             {isOverdue ? `${Math.abs(days)}d Late` : isToday ? 'Due Now' : `${days}d`}
                           </span>
                           {bill.frequency !== 'None' && <span className="text-[8px] text-slate-400 font-black uppercase flex items-center gap-1 opacity-60"><Repeat size={10} /> {bill.frequency}</span>}
                         </div>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-[16px] font-black text-slate-900 dark:text-white leading-none tracking-tight">{currencySymbol}{bill.amount.toLocaleString()}</p>
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{bill.category}</p>
                     </div>
                   </div>
                   <div className="flex gap-3 relative z-10">
                      <button 
                        onClick={() => onPayBill(bill)}
                        className="flex-1 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
                      >
                        <Check size={14} strokeWidth={4} /> Clear Bill
                      </button>
                      <button 
                        onClick={() => onDeleteBill(bill.id)}
                        className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-slate-300 hover:text-rose-500 transition-colors border border-slate-100 dark:border-slate-700"
                      >
                        <Trash2 size={16} />
                      </button>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPlanner;