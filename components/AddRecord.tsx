
import React, { useState, useEffect } from 'react';
import { Category, Expense, UserSettings, Frequency, Income, IncomeType, WealthType, WealthCategory, WealthItem } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { Check, X, Calendar as CalendarIcon, Tag, MessageSquare, Repeat, Sparkles, Loader2, ArrowUpCircle, ArrowDownCircle, Landmark, LayoutGrid, Save, Briefcase, CreditCard, Wallet } from 'lucide-react';
import { parseTransactionText } from '../services/geminiService';

interface AddRecordProps {
  settings: UserSettings;
  onAdd: (expense: Omit<Expense, 'id'>, frequency: Frequency) => void;
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onAddWealth?: (item: Omit<WealthItem, 'id'>) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  onUpdateIncome?: (id: string, updates: Partial<Income>) => void;
  onUpdateWealth?: (id: string, updates: Partial<WealthItem>) => void;
  onCancel: () => void;
  initialData?: Expense | Income | WealthItem | any | null;
}

const WEALTH_CATEGORIES: WealthCategory[] = ['Stock', 'Mutual Fund', 'Crypto', 'Gold', 'Real Estate', 'Loan', 'Credit Card', 'Other'];

const KEYWORD_TAGS: Record<string, string> = {
  'coffee': 'coffee', 'starbucks': 'coffee', 'cafe': 'coffee', 'espresso': 'coffee', 'costa': 'coffee',
  'grocery': 'groceries', 'walmart': 'groceries', 'target': 'groceries', 'supermarket': 'groceries', 'market': 'groceries', 'kroger': 'groceries',
  'uber': 'transport', 'lyft': 'transport', 'taxi': 'transport', 'metro': 'transport', 'train': 'transport', 'fuel': 'transport', 'gas': 'transport', 'petrol': 'transport', 'rail': 'transport',
  'dining': 'dining out', 'restaurant': 'dining out', 'eat': 'dining out', 'pizza': 'dining out', 'burger': 'dining out', 'swiggy': 'dining out', 'zomato': 'dining out', 'grubhub': 'dining out', 'doordash': 'dining out',
  'subscription': 'subscription', 'netflix': 'subscription', 'spotify': 'subscription', 'youtube': 'subscription', 'apple': 'subscription', 'recurring': 'subscription', 'amazon prime': 'subscription', 'disney': 'subscription',
};

const AddRecord: React.FC<AddRecordProps> = ({ 
  settings, onAdd, onAddIncome, onAddWealth, onUpdateExpense, onUpdateIncome, onUpdateWealth, onCancel, initialData 
}) => {
  const isEditing = !!(initialData && initialData.id);
  const [mode, setMode] = useState<WealthType | 'Expense' | 'Income'>('Expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category>('Needs');
  const [wealthCategory, setWealthCategory] = useState<WealthCategory>('Other');
  const [subCategory, setSubCategory] = useState('');
  const [incomeType, setIncomeType] = useState<IncomeType>('Salary');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState<Frequency>('None');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const currencySymbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    if (initialData) {
      if ('category' in initialData && !('type' in initialData)) {
        setMode('Expense');
        setCategory(initialData.category);
        setSubCategory(initialData.subCategory || '');
      } else if ('type' in initialData && (initialData.type === 'Investment' || initialData.type === 'Liability')) {
        setMode(initialData.type as WealthType);
        setWealthCategory(initialData.category as WealthCategory);
      } else if ('type' in initialData) {
        setMode('Income');
        setIncomeType(initialData.type as IncomeType);
      }
      
      setAmount(initialData.amount?.toString() || initialData.value?.toString() || '');
      setNote(initialData.note || initialData.merchant || initialData.name || '');
      setDate(initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    if (mode === 'Expense') {
      const payload = { amount: parseFloat(amount), date, category, subCategory: subCategory || 'General', note, merchant: note, isConfirmed: true };
      if (isEditing && onUpdateExpense) onUpdateExpense(initialData.id, payload);
      else onAdd(payload, frequency);
    } else if (mode === 'Income') {
      const payload = { amount: parseFloat(amount), date, type: incomeType, note };
      if (isEditing && onUpdateIncome) onUpdateIncome(initialData.id, payload);
      else onAddIncome(payload);
    } else {
      const payload = { type: mode as WealthType, category: wealthCategory, name: note || 'Unnamed Wealth Entry', value: parseFloat(amount), date };
      if (isEditing && onUpdateWealth) onUpdateWealth(initialData.id, payload);
      else if (onAddWealth) onAddWealth(payload);
    }
  };

  const handlePasteSMS = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return alert("Clipboard is empty");

      setIsAnalyzing(true);
      const result = await parseTransactionText(text, settings.currency);
      
      if (result) {
        setAmount(result.amount.toString());
        setNote(result.merchant);
        setCategory(result.category);
        setDate(result.date);

        // Auto-tag subCategory
        let detectedSub = result.subCategory || '';
        const lowerDesc = (result.merchant + " " + (result.subCategory || "")).toLowerCase();
        for (const [keyword, tag] of Object.entries(KEYWORD_TAGS)) {
          if (lowerDesc.includes(keyword)) { detectedSub = tag; break; }
        }
        setSubCategory(detectedSub || 'General');

        // Context-aware mode switching
        if (lowerDesc.includes('credited to your card') || lowerDesc.includes('spent on your sbi credit card')) {
           // We might want to handle this as an expense, but if it's a statement, it might be a liability update.
        }
      } else { alert("Could not parse details."); }
    } catch (err) { alert("Please allow clipboard access."); }
    finally { setIsAnalyzing(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center sm:items-end justify-center backdrop-blur-sm p-4 sm:p-0">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl sm:rounded-b-none sm:rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col animate-slide-up max-h-[90dvh]">
        
        {!isEditing && (
          <div className="flex-none p-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'Expense', icon: ArrowDownCircle, color: 'from-rose-500 to-rose-600' },
                { id: 'Income', icon: ArrowUpCircle, color: 'from-indigo-600 to-indigo-700' },
                { id: 'Investment', icon: Briefcase, color: 'from-emerald-500 to-emerald-600' },
                { id: 'Liability', icon: CreditCard, color: 'from-amber-500 to-amber-600' }
              ].map((m) => (
                <button 
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id as any)}
                  className={`flex-1 py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all font-black text-[9px] uppercase tracking-widest ${mode === m.id ? `bg-gradient-to-br ${m.color} text-white shadow-md` : 'text-slate-400 bg-white/50 dark:bg-slate-800'}`}
                >
                  <m.icon size={12} /> {m.id}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">
              {isEditing ? `Edit Entry` : `Add ${mode}`}
            </h2>
            {!isEditing && mode === 'Expense' && (
              <button type="button" onClick={handlePasteSMS} disabled={isAnalyzing} className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800">
                {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span className="text-[9px] font-black uppercase tracking-wider">Paste SMS</span>
              </button>
            )}
          </div>
          <button type="button" onClick={onCancel} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 border border-slate-200 dark:border-slate-700"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative border-b-2 border-slate-100 dark:border-slate-800 pb-2">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 dark:text-slate-700">{currencySymbol}</span>
              <input
                autoFocus={!isEditing}
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 py-4 text-5xl font-black border-none outline-none bg-transparent text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-5">
              {mode === 'Expense' && (
                <>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Allocation</span>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                      {(['Needs', 'Wants', 'Savings'] as Category[]).map((cat) => (
                        <button key={cat} type="button" onClick={() => setCategory(cat)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase border shrink-0 ${category === cat ? 'text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700'}`} style={category === cat ? { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] } : {}}>{cat}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sub Category</span>
                    <input type="text" placeholder="e.g., Dining, Uber, Rent" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl text-sm font-black outline-none border border-transparent focus:border-indigo-500 text-slate-900 dark:text-white" />
                  </div>
                </>
              )}

              {mode === 'Income' && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Inflow Type</span>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {(['Salary', 'Freelance', 'Investment', 'Gift', 'Other'] as IncomeType[]).map((type) => (
                      <button key={type} type="button" onClick={() => setIncomeType(type)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all border shrink-0 ${incomeType === type ? 'bg-indigo-600 text-white shadow-lg border-transparent' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700'}`}>{type}</button>
                    ))}
                  </div>
                </div>
              )}

              {(mode === 'Investment' || mode === 'Liability') && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Asset Class</span>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {WEALTH_CATEGORIES.map((cat) => (
                      <button key={cat} type="button" onClick={() => setWealthCategory(cat)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all border shrink-0 ${wealthCategory === cat ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg border-transparent' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Date</span>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl text-sm font-black outline-none border border-transparent focus:border-indigo-500 text-slate-900 dark:text-white" />
                </div>
                {mode === 'Expense' && !isEditing && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recurring</span>
                    <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl text-sm font-black outline-none border border-transparent focus:border-indigo-500 text-slate-900 dark:text-white appearance-none">
                      <option value="None">Once</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option><option value="Yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Description</span>
                <input type="text" placeholder={mode === 'Expense' ? "Merchant name..." : mode === 'Income' ? "Inflow source..." : "Asset/Debt name..."} value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl text-sm font-black outline-none border border-transparent focus:border-indigo-500 text-slate-900 dark:text-white" />
              </div>
            </div>

            <button type="submit" disabled={!amount} className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all text-xs uppercase tracking-widest !mt-8">
              {isEditing ? `Update Entry` : `Record ${mode}`} <Check size={20} strokeWidth={4} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddRecord;
