
import React, { useState, useEffect } from 'react';
import { Category, Expense, UserSettings, Frequency, Income, IncomeType } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { Check, X, Calendar as CalendarIcon, Tag, MessageSquare, Repeat, Sparkles, Loader2, ArrowUpCircle, ArrowDownCircle, Landmark } from 'lucide-react';
import { parseTransactionText } from '../services/geminiService';

interface AddExpenseProps {
  settings: UserSettings;
  onAdd: (expense: Omit<Expense, 'id'>, frequency: Frequency) => void;
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onCancel: () => void;
  initialData?: Partial<Expense> | null;
}

const AddExpense: React.FC<AddExpenseProps> = ({ settings, onAdd, onAddIncome, onCancel, initialData }) => {
  const [mode, setMode] = useState<'Expense' | 'Income'>('Expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category>('Needs');
  const [incomeType, setIncomeType] = useState<IncomeType>('Salary');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState<Frequency>('None');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const currencySymbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    if (initialData) {
      if (initialData.amount) setAmount(initialData.amount.toString());
      if (initialData.merchant) setNote(initialData.merchant);
      if (initialData.note) setNote(initialData.note);
      if (initialData.category) setCategory(initialData.category);
      if (initialData.date) setDate(initialData.date);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    if (mode === 'Expense') {
      onAdd({
        amount: parseFloat(amount),
        date,
        category,
        note,
        merchant: note, 
        isConfirmed: true
      }, frequency);
    } else {
      onAddIncome({
        amount: parseFloat(amount),
        date,
        type: incomeType,
        note
      });
    }
  };

  const handlePasteSMS = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        alert("Clipboard is empty");
        return;
      }

      setIsAnalyzing(true);
      const result = await parseTransactionText(text, settings.currency);
      
      if (result) {
        setAmount(result.amount.toString());
        setNote(result.merchant);
        setCategory(result.category);
        setDate(result.date);
      } else {
        alert("Could not parse transaction details.");
      }
    } catch (err) {
      console.error(err);
      alert("Please allow clipboard access or copy text manually.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl p-1 animate-slide-up shadow-2xl">
        
        {/* Toggle Mode */}
        <div className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-t-3xl border-b border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => setMode('Expense')}
            className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest ${mode === 'Expense' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-400'}`}
          >
            <ArrowDownCircle size={16} /> Expense
          </button>
          <button 
            onClick={() => setMode('Income')}
            className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest ${mode === 'Income' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
          >
            <ArrowUpCircle size={16} /> Income
          </button>
        </div>

        {/* Header Content */}
        <div className="flex justify-between items-center px-4 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">{mode === 'Expense' ? 'Spend Log' : 'Cash Inflow'}</h2>
            
            {mode === 'Expense' && (
              <button 
                type="button"
                onClick={handlePasteSMS}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span className="text-[9px] font-black uppercase tracking-wider">{isAnalyzing ? 'Analyzing...' : 'Paste SMS'}</span>
              </button>
            )}
          </div>
          <button onClick={onCancel} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 border border-slate-200 dark:border-slate-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-8 pt-0">
          <div className="relative border-b-2 border-slate-100 dark:border-slate-800 pb-2">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 dark:text-slate-700">{currencySymbol}</span>
            <input
              autoFocus
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 py-4 text-5xl font-black border-none outline-none focus:ring-0 placeholder-slate-100 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-5">
            {mode === 'Expense' ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Allocation</span>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {(['Needs', 'Wants', 'Savings'] as Category[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all border shrink-0 ${
                        category === cat 
                          ? 'text-white shadow-lg'
                          : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700'
                      }`}
                      style={category === cat ? { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] } : {}}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Landmark size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Inflow Type</span>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {(['Salary', 'Freelance', 'Investment', 'Gift', 'Other'] as IncomeType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setIncomeType(type)}
                      className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all border shrink-0 ${
                        incomeType === type 
                          ? 'bg-indigo-600 text-white shadow-lg border-indigo-600'
                          : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Date</span>
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl text-sm font-black outline-none border border-transparent focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              {mode === 'Expense' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Repeat size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recurring</span>
                  </div>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl text-sm font-black outline-none border border-transparent focus:border-indigo-500 text-slate-900 dark:text-white appearance-none"
                  >
                    <option value="None">Once</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Description</span>
              </div>
              <input
                type="text"
                placeholder={mode === 'Expense' ? "Where did it go?" : "Where did it come from?"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl text-sm font-black outline-none border border-transparent focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!amount}
            className={`w-full ${mode === 'Expense' ? 'bg-brand-primary' : 'bg-indigo-600'} text-white font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-3 hover:opacity-95 disabled:opacity-50 transition-all text-xs uppercase tracking-widest mt-6`}
          >
            {mode === 'Expense' 
              ? (frequency !== 'None' ? 'Set Subscription' : 'Log Expense') 
              : 'Add to Budget'} <Check size={20} strokeWidth={4} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;