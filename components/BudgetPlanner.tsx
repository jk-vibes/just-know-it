
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

  const sectionClass = "bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-2 shadow-sm";

  return (
    <div className="pb-32 pt-1 animate-slide-up">
      <div className="bg-gradient-to-r from-brand-primary to-indigo-600 px-5 py-4 rounded-2xl mb-1 shadow-md">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Budget Planner</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Financial Architecture</p>
          </div>
        </div>
      </div>

      <div className="flex bg-slate-50 dark:bg-slate-900/50 p-1 rounded-2xl mb-1 mx-1 border border-slate-100 dark:border-slate-800">
        <button 
          onClick={() => { triggerHaptic(); setActiveView('Budgets'); }}
          className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${activeView === 'Budgets' ? 'bg-white dark:bg-slate-800 text-brand-primary shadow-sm border border-slate-100 dark:border-slate-700' : 'text-slate-400'}`}
        >
          Allocations
        </button>
        <button 
          onClick={() => { triggerHaptic(); setActiveView('Bills'); }}
          className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeView === 'Bills' ? 'bg-white dark:bg-slate-800 text-brand-primary shadow-sm border border-slate-100 dark:border-slate-700' : 'text-slate-400'}`}
        >
          Remittance Hub {bills.length > 0 && <span className="w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[7px]">{bills.length}</span>}
        </button>
      </div>

      {activeView === 'Budgets' ? (
        <>
          <section className={sectionClass}>
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Planned Outflow</p>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                  <span className="text-sm opacity-40 mr-1">{currencySymbol}</span>
                  {summary.grandTotal.toLocaleString()}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Realized Spending</p>
                <p className="text-sm font-black text-brand-accent">{currencySymbol}{summary.grandSpent.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
              {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => {
                const perc = summary.grandTotal > 0 ? (summary.totals[cat] / Math.max(summary.grandTotal, settings.monthlyIncome)) * 100 : 0;
                return <div key={cat} style={{ width: `${perc}%`, backgroundColor: CATEGORY_COLORS[cat] }} />;
              })}
            </div>
          </section>

          <div className="space-y-2">
            {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
              <div key={cat} className={sectionClass}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">{cat}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400">
                      {currencySymbol}{summary.totals[cat].toLocaleString()} / {currencySymbol}{summary.targets[cat].toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {budgetItems.filter(i => i.category === cat).map(item => {
                    const actual = itemUtilization[item.id] || 0;
                    const utilPerc = item.amount > 0 ? (actual / item.amount) * 100 : 0;
                    const isOver = actual > item.amount;
                    
                    return (
                      <div key={item.id} onClick={() => handleItemClick(item)} className="space-y-2 group cursor-pointer active:scale-[0.99] transition-transform">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-none">{item.name}</span>
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-1">{item.subCategory}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-900 dark:text-white leading-none">
                              <span className={isOver ? 'text-rose-500' : ''}>{currencySymbol}{actual.toLocaleString()}</span>
                              <span className="text-[9px] text-slate-300 dark:text-slate-600 ml-1">/ {currencySymbol}{item.amount.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                        <div className="w-full h-1 bg-slate-50 dark:bg-slate-800/30 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                            style={{ width: `${Math.min(100, utilPerc)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-2 animate-kick">
           {nextCriticalBill && (
             <section className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 shadow-sm mb-2">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
                         <Sparkles size={20} />
                      </div>
                      <div>
                         <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Smart Reminder</p>
                         <h4 className="text-[11px] font-black text-slate-800 dark:text-white mt-0.5">Authorize {nextCriticalBill.merchant} payment</h4>
                      </div>
                   </div>
                   <button onClick={() => onPayBill(nextCriticalBill)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Settle Now</button>
                </div>
             </section>
           )}

           <section className={sectionClass}>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-brand-primary/10 rounded-2xl text-brand-primary">
                   <ShieldCheck size={20} />
                 </div>
                 <div>
                   <h3 className="text-xs font-black uppercase tracking-tight dark:text-white">Remittance Registry</h3>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Commitment Monitoring</p>
                 </div>
               </div>
               <button 
                 onClick={onSmartAddBill}
                 className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
               >
                 <Camera size={12} /> Snap Bill
               </button>
             </div>
           </section>

           {sortedBills.length === 0 ? (
             <div className="py-20 text-center flex flex-col items-center">
               <Calendar className="text-slate-200 dark:text-slate-800 mb-4" size={48} />
               <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">No bills in registry</p>
               <button onClick={onSmartAddBill} className="mt-4 px-6 py-2.5 bg-brand-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg">Begin Tracking</button>
             </div>
           ) : (
             <div className="space-y-2 px-1">
               {sortedBills.map(bill => {
                 const diff = new Date(bill.dueDate).getTime() - new Date().getTime();
                 const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                 const isOverdue = days < 0;
                 const isToday = days === 0;

                 return (
                   <div key={bill.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm group">
                     <div className="flex justify-between items-start mb-3">
                       <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-xl ${isOverdue ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'} dark:bg-white/5`}>
                           <Clock size={16} />
                         </div>
                         <div>
                           <h4 className="text-[11px] font-black text-slate-800 dark:text-white truncate max-w-[150px]">{bill.merchant}</h4>
                           <div className="flex items-center gap-1.5 mt-0.5">
                             <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isOverdue ? 'bg-rose-500 text-white' : isToday ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                               {isOverdue ? `${Math.abs(days)}d Overdue` : isToday ? 'Due Today' : `Due in ${days}d`}
                             </span>
                             {bill.frequency !== 'None' && <span className="text-[7px] text-slate-400 font-bold uppercase flex items-center gap-0.5"><Repeat size={8} /> {bill.frequency}</span>}
                           </div>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-[12px] font-black text-slate-900 dark:text-white leading-none">{currencySymbol}{bill.amount.toLocaleString()}</p>
                         <p className="text-[7px] font-black text-slate-400 uppercase tracking-tight mt-1">{bill.category}</p>
                       </div>
                     </div>
                     <div className="flex gap-2">
                        <button 
                          onClick={() => { triggerHaptic(); onPayBill(bill); }}
                          className="flex-1 py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-xl text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md"
                        >
                          <Check size={12} strokeWidth={3} /> Authorize Payment
                        </button>
                        <button 
                          onClick={() => { triggerHaptic(); onDeleteBill(bill.id); }}
                          className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-end justify-center p-0 backdrop-blur-sm animate-kick">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col animate-slide-up max-h-[85dvh]">
            <div className="flex items-center justify-between px-4 py-2 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <button onClick={() => { triggerHaptic(); closeForm(); }} className="p-2 text-slate-400 active:scale-90 transition-all"><X size={18} strokeWidth={2.5} /></button>
              <div className="flex items-center"><h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">{editingItem ? 'Modify Plan' : 'New Plan Entry'}</h3></div>
              <div className="flex items-center gap-1">
                {editingItem && <button onClick={() => { triggerHaptic(30); onDeleteBudget(editingItem.id); closeForm(); }} className="p-2 text-rose-500 active:scale-90"><Trash2 size={16} strokeWidth={2.5} /></button>}
                <button disabled={!newItemName || !newItemAmount} onClick={handleInternalSubmit} className={`p-2 rounded-xl active:scale-90 ${(!newItemName || !newItemAmount) ? 'text-slate-200' : 'text-emerald-500'}`}><Check size={18} strokeWidth={3} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-3">
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Allocated Amount</p>
                  <div className="relative flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-1.5 border border-transparent focus-within:border-brand-primary/30 transition-all">
                    <span className="text-xs font-black text-slate-300 mr-1.5">{currencySymbol}</span>
                    <input autoFocus={!editingItem} type="number" step="1" value={newItemAmount} onChange={(e) => setNewItemAmount(e.target.value)} placeholder="0" className="w-full text-lg font-black border-none outline-none bg-transparent text-slate-900 dark:text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Entry Name</span>
                      <button type="button" onClick={handleDetectCategory} disabled={!newItemName.trim() || isDetecting} className="flex items-center gap-0.5 text-[6px] font-black uppercase text-indigo-500 hover:text-indigo-600 disabled:opacity-30">
                        {isDetecting ? <Loader2 size={8} className="animate-spin" /> : <Sparkles size={8} />} AI
                      </button>
                    </div>
                    <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-2 flex items-center">
                      <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g. Rent" className="w-full text-[10px] font-bold outline-none bg-transparent dark:text-white" />
                      <Store size={10} className="text-slate-300 ml-1" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Bucket</span>
                    <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-2">
                      <select 
                        value={newItemCategory} 
                        onChange={(e) => { 
                          const cat = e.target.value as Category; 
                          setNewItemCategory(cat); 
                          setNewItemSubCategory(SUB_CATEGORIES[cat][0] || 'General'); 
                          triggerHaptic();
                        }} 
                        className="w-full text-[10px] font-black uppercase outline-none bg-transparent dark:text-white appearance-none pr-5"
                        style={{ color: CATEGORY_COLORS[newItemCategory] }}
                      >
                        <option value="Needs">Needs</option>
                        <option value="Wants">Wants</option>
                        <option value="Savings">Savings</option>
                      </select>
                      <Tag size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 ml-1">
                    <Layers size={10} className="text-slate-400" />
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Detail Category</span>
                  </div>
                  <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-2">
                    <select 
                      value={newItemSubCategory} 
                      onChange={(e) => { setNewItemSubCategory(e.target.value); triggerHaptic(); }}
                      className="w-full text-[10px] font-bold outline-none bg-transparent dark:text-white appearance-none pr-5"
                    >
                      {SUB_CATEGORIES[newItemCategory].map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                    <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="bg-white dark:bg-slate-700 p-1.5 rounded-lg shadow-sm">
                    <Target size={12} className="text-brand-primary" />
                  </div>
                  <p className="text-[8px] font-bold text-slate-500 leading-tight">Setting a budget cap helps the AI audit your actual spending and provide tactical alerts.</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[6px] font-black text-slate-400 uppercase tracking-[0.2em]">Architecture Build 1.1.9 • Secured Planning</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPlanner;
