import React, { useState, useEffect } from 'react';
import { Category, Expense, UserSettings, Frequency } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { Check, X, Calendar as CalendarIcon, Tag, MessageSquare, Repeat, Sparkles, Loader2, ClipboardPaste } from 'lucide-react';
import { parseTransactionText } from '../services/geminiService';

interface AddExpenseProps {
  settings: UserSettings;
  onAdd: (expense: Omit<Expense, 'id'>, frequency: Frequency) => void;
  onCancel: () => void;
  initialData?: Partial<Expense> | null;
}

const AddExpense: React.FC<AddExpenseProps> = ({ settings, onAdd, onCancel, initialData }) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category>('Needs');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState<Frequency>('None');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const currencySymbol = getCurrencySymbol(settings.currency);

  // Load initial data if provided (e.g. from Smart Paste in Dashboard)
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
    onAdd({
      amount: parseFloat(amount),
      date,
      category,
      note, // Use note as merchant/description
      merchant: note, 
      isConfirmed: true
    }, frequency);
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
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-2xl p-1 animate-slide-up">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-2 px-3 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">New Entry</h2>
            
            {/* AI Magic Button */}
            <button 
              type="button"
              onClick={handlePasteSMS}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              <span className="text-[9px] font-black uppercase tracking-wider">{isAnalyzing ? 'Analyzing...' : 'Paste SMS'}</span>
            </button>
          </div>

          <button onClick={onCancel} className="p-1.5 bg-white dark:bg-slate-800 rounded-lg text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-3 pb-6 pt-2">
          <div className="relative border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-300 dark:text-slate-700">{currencySymbol}</span>
            <input
              autoFocus
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-6 py-4 text-4xl font-extrabold border-none outline-none focus:ring-0 placeholder-slate-200 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Allocation (AI Suggested)</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {(['Needs', 'Wants', 'Savings'] as Category[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border shrink-0 ${
                      category === cat 
                        ? 'text-white shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700'
                    }`}
                    style={category === cat ? { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] } : {}}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Date</span>
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl text-sm font-bold outline-none border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Repeat size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recurring</span>
                </div>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl text-sm font-bold outline-none border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white appearance-none"
                >
                  <option value="None">Just Once</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Merchant / Description</span>
              </div>
              <input
                type="text"
                placeholder="Where was this spent?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl text-sm font-bold outline-none border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!amount}
            className={`w-full bg-[#f14444] text-white font-extrabold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50 transition-all text-sm uppercase tracking-widest mt-4`}
          >
            {frequency !== 'None' ? 'Start Subscription' : 'Log Transaction'} <Check size={18} strokeWidth={3} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;