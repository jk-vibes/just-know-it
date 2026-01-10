import React, { useState, useMemo } from 'react';
import { BudgetItem, RecurringItem, UserSettings, Category, Expense } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol, SUB_CATEGORIES } from '../constants';
import { Target, Plus, Trash2, PieChart, ChevronDown, ChevronUp, AlertCircle, Info, Bookmark, Sparkles, Loader2, X, TrendingUp } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { predictBudgetCategory } from '../services/geminiService';

interface BudgetPlannerProps {
  budgetItems: BudgetItem[];
  recurringItems: RecurringItem[];
  expenses: Expense[];
  settings: UserSettings;
  onAddBudget: (item: Omit<BudgetItem, 'id'>) => void;
  onDeleteBudget: (id: string) => void;
  viewDate: Date;
}

const BudgetPlanner: React.FC<BudgetPlannerProps> = ({
  budgetItems, recurringItems, expenses, settings, onAddBudget, onDeleteBudget, viewDate
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<Category>('Needs');
  const [newItemSubCategory, setNewItemSubCategory] = useState('General');
  const [isDetecting, setIsDetecting] = useState(false);

  const currencySymbol = getCurrencySymbol(settings.currency);

  const combinedBudgetItems = useMemo(() => {
    // Start with manual budget items
    const combined = [...budgetItems];
    
    // Add recurring items if they aren't already represented (simple deduplication by note/merchant name)
    recurringItems.forEach(rec => {
      const name = rec.merchant || rec.note;
      const alreadyBudgeted = combined.some(b => b.name.toLowerCase() === name.toLowerCase());
      if (!alreadyBudgeted) {
        combined.push({
          id: `rec-${rec.id}`,
          name: name,
          amount: rec.amount,
          category: rec.category,
          subCategory: rec.subCategory,
          isRecurringLink: rec.id
        });
      }
    });
    
    return combined;
  }, [budgetItems, recurringItems]);

  // Map expenses to budget items for utilization
  const itemUtilization = useMemo(() => {
    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    const currentExps = expenses.filter(e => {
      const d = new Date(e.date);
      return e.isConfirmed && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const mapping: Record<string, number> = {};
    
    combinedBudgetItems.forEach(item => {
      // Logic for mapping:
      // 1. Direct sub-category match
      // 2. Keyword match in merchant/note if sub-category is "General"
      const matchedAmount = currentExps
        .filter(e => {
          const catMatch = e.category === item.category;
          const subMatch = e.subCategory === item.subCategory;
          // If sub-category is generic, try name matching
          if (catMatch && subMatch) return true;
          if (catMatch && item.name && (e.merchant?.toLowerCase().includes(item.name.toLowerCase()) || e.note?.toLowerCase().includes(item.name.toLowerCase()))) return true;
          return false;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      
      mapping[item.id] = Math.round(matchedAmount);
    });

    return mapping;
  }, [combinedBudgetItems, expenses, viewDate]);

  const summary = useMemo(() => {
    const totals = { Needs: 0, Wants: 0, Savings: 0 };
    const spentTotals = { Needs: 0, Wants: 0, Savings: 0 };
    
    combinedBudgetItems.forEach(item => {
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

    return { 
      totals, 
      targets, 
      spentTotals, 
      grandTotal: totals.Needs + totals.Wants + totals.Savings,
      grandSpent: spentTotals.Needs + spentTotals.Wants + spentTotals.Savings
    };
  }, [combinedBudgetItems, settings.monthlyIncome, settings.split, itemUtilization]);

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

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemAmount) return;
    onAddBudget({
      name: newItemName,
      amount: Math.round(parseFloat(newItemAmount)),
      category: newItemCategory,
      subCategory: newItemSubCategory
    });
    setNewItemName('');
    setNewItemAmount('');
    setNewItemSubCategory('General');
    setShowAddForm(false);
  };

  const sectionClass = "bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-2 shadow-sm";

  return (
    <div className="pb-32 pt-1">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-brand-primary to-indigo-600 px-5 py-4 rounded-2xl mb-1 shadow-md">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Budget Planner</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Financial Blueprint</p>
          </div>
          <button 
            onClick={() => { triggerHaptic(); setShowAddForm(true); }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all active:scale-90"
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* OVERVIEW */}
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
        
        {/* TOTAL BUDGET BAR */}
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
          {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => {
            const perc = (summary.totals[cat] / settings.monthlyIncome) * 100;
            return <div key={cat} style={{ width: `${perc}%`, backgroundColor: CATEGORY_COLORS[cat] }} />;
          })}
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-[7px] font-black text-slate-400 uppercase">
            {Math.round((summary.grandTotal / settings.monthlyIncome) * 100)}% of Income Allocated
          </p>
          {summary.grandTotal > settings.monthlyIncome && (
            <p className="text-[7px] font-black text-rose-500 uppercase flex items-center gap-1">
              <AlertCircle size={8} /> Deficit Protocol Active
            </p>
          )}
        </div>
      </section>

      {/* CATEGORY BREAKDOWNS */}
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
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-tight">Limit Utilization</p>
              </div>
            </div>
            
            <div className="w-full h-1 bg-slate-50 dark:bg-slate-800/50 rounded-full mb-6">
              <div 
                className="h-full rounded-full transition-all duration-1000" 
                style={{ 
                  width: `${Math.min(100, (summary.totals[cat] / summary.targets[cat]) * 100)}%`, 
                  backgroundColor: CATEGORY_COLORS[cat] 
                }} 
              />
            </div>

            <div className="space-y-3">
              {combinedBudgetItems.filter(i => i.category === cat).map(item => {
                const actual = itemUtilization[item.id] || 0;
                const utilPerc = item.amount > 0 ? (actual / item.amount) * 100 : 0;
                const isOver = actual > item.amount;
                
                return (
                  <div key={item.id} className="space-y-2 group">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {item.isRecurringLink ? (
                          <Bookmark size={10} className="text-indigo-400" />
                        ) : (
                          <Info size={10} className="text-slate-200" />
                        )}
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-none">{item.name}</span>
                          {item.subCategory && (
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-1">{item.subCategory}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-900 dark:text-white leading-none">
                            <span className={isOver ? 'text-rose-500' : ''}>{currencySymbol}{actual.toLocaleString()}</span>
                            <span className="text-[9px] text-slate-300 dark:text-slate-600 ml-1">/ {currencySymbol}{item.amount.toLocaleString()}</span>
                          </p>
                          <p className={`text-[6px] font-black uppercase mt-0.5 ${isOver ? 'text-rose-500' : 'text-slate-400'}`}>
                            {isOver ? 'Over Limit' : `${Math.round(utilPerc)}% Used`}
                          </p>
                        </div>
                        {!item.isRecurringLink && (
                          <button 
                            onClick={() => onDeleteBudget(item.id)}
                            className="p-1 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* INDIVIDUAL ITEM PROGRESS BAR */}
                    <div className="w-full h-1 bg-slate-50 dark:bg-slate-800/30 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                        style={{ width: `${Math.min(100, utilPerc)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {combinedBudgetItems.filter(i => i.category === cat).length === 0 && (
                <p className="text-[9px] text-slate-300 font-bold uppercase py-2">No active plans in this bucket</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ADD MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-end justify-center p-0 backdrop-blur-sm animate-kick">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[32px] shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">Provision Plan</h3>
                <p className="text-[8px] font-black text-slate-400 uppercase mt-1">Manual Allocation</p>
              </div>
              <button onClick={() => setShowAddForm(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Plan Label</span>
                  <button 
                    type="button" 
                    onClick={handleDetectCategory}
                    disabled={!newItemName.trim() || isDetecting}
                    className="flex items-center gap-1 text-[8px] font-black uppercase text-indigo-500 hover:text-indigo-600 disabled:opacity-30 transition-all"
                  >
                    {isDetecting ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    AI Detect
                  </button>
                </div>
                <input 
                  autoFocus
                  type="text" 
                  value={newItemName} 
                  onChange={(e) => setNewItemName(e.target.value)} 
                  placeholder="e.g. School Fees" 
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-xs font-black outline-none border border-transparent focus:border-brand-primary dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Cap Value</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-black">{currencySymbol}</span>
                    <input 
                      type="number" 
                      value={newItemAmount} 
                      onChange={(e) => setNewItemAmount(e.target.value)} 
                      placeholder="0" 
                      className="w-full bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-4 rounded-2xl text-xs font-black outline-none dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</span>
                  <select 
                    value={newItemCategory} 
                    onChange={(e) => {
                      const cat = e.target.value as Category;
                      setNewItemCategory(cat);
                      setNewItemSubCategory(SUB_CATEGORIES[cat][0] || 'General');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-[10px] font-black uppercase outline-none appearance-none dark:text-white"
                  >
                    <option value="Needs">Needs</option>
                    <option value="Wants">Wants</option>
                    <option value="Savings">Savings</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Sub-Category</span>
                <div className="relative">
                   <input 
                    type="text" 
                    value={newItemSubCategory} 
                    onChange={(e) => setNewItemSubCategory(e.target.value)} 
                    placeholder="e.g. Education" 
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-[10px] font-black uppercase outline-none border border-transparent focus:border-brand-primary dark:text-white"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 pointer-events-none opacity-30">
                    <Target size={14} />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-brand-primary text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all mt-4"
              >
                Register Plan <Target size={18} strokeWidth={3} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPlanner;