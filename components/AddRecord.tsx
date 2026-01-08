import React, { useState, useEffect } from 'react';
import { Category, Expense, UserSettings, Frequency, Income, IncomeType } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { Check, X, Calendar as CalendarIcon, Tag, MessageSquare, Repeat, Sparkles, Loader2, ArrowUpCircle, ArrowDownCircle, Landmark, LayoutGrid, Save } from 'lucide-react';
import { parseTransactionText } from '../services/geminiService';

interface AddRecordProps {
  settings: UserSettings;
  onAdd: (expense: Omit<Expense, 'id'>, frequency: Frequency) => void;
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  onUpdateIncome?: (id: string, updates: Partial<Income>) => void;
  onCancel: () => void;
  initialData?: Expense | Income | any | null;
}

const AddRecord: React.FC<AddRecordProps> = ({ 
  settings, 
  onAdd, 
  onAddIncome, 
  onUpdateExpense, 
  onUpdateIncome, 
  onCancel, 
  initialData 
}) => {
  const isEditing = !!(initialData && initialData.id);
  const [mode, setMode] = useState<'Expense' | 'Income'>('Expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category>('Needs');
  const [subCategory, setSubCategory] = useState('');
  const [incomeType, setIncomeType] = useState<IncomeType>('Salary');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState<Frequency>('None');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const currencySymbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    if (initialData) {
      if ('category' in initialData) {
        setMode('Expense');
        setCategory(initialData.category);
        setSubCategory(initialData.subCategory || '');
      } else if ('type' in initialData) {
        setMode('Income');
        setIncomeType(initialData.type);
      }
      
      setAmount(initialData.amount?.toString() || '');
      setNote(initialData.note || initialData.merchant || '');
      setDate(initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    if (mode === 'Expense') {
      const expensePayload = {
        amount: parseFloat(amount),
        date,
        category,
        subCategory: subCategory || 'General',
        note,
        merchant: note, 
        isConfirmed: true
      };

      if (isEditing && initialData.id && onUpdateExpense) {
        onUpdateExpense(initialData.id, expensePayload);
      } else {
        onAdd(expensePayload, frequency);
      }
    } else {
      const incomePayload = {
        amount: parseFloat(amount),
        date,
        type: incomeType,
        note
      };

      if (isEditing && initialData.id && onUpdateIncome) {
        onUpdateIncome(initialData.id, incomePayload);
      } else {
        onAddIncome(incomePayload);
      }
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
        setSubCategory(result.subCategory);
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
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center sm:items-end justify-center backdrop-blur-sm p-4 sm:p-0">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl sm:rounded-b-none sm:rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col animate-slide-up max-h-[90dvh]">
        
        {/* Toggle Mode */}
        {!isEditing && (
          <div className="flex-none">
            <div className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-t-3xl border-b border-slate-100 dark:border-slate-800">
              <button 
                type="button"
                onClick={() => setMode('Expense')}
                className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest ${mode === 'Expense' ? 'bg-[#f14444] text-white shadow-lg' : 'text-slate-400'}`}
              >
                <ArrowDownCircle size={16} /> Expense
              </button>
              <button 
                type="button"
                onClick={() => setMode('Income')}
                className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest ${mode === 'Income' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
              >
                <ArrowUpCircle size={16} /> Income
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">
              {isEditing ? `Edit ${mode}` : (mode === 'Expense' ? 'Spend Log' : 'Cash Inflow')}
            </h2>
            {!isEditing && mode === 'Expense' && (
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
          <button type="button" onClick={onCancel} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 border border-slate-200 dark:border-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative border-b-2 border-slate-100 dark:border-slate-800 pb-2">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 dark:text-slate-700">{currencySymbol}</span>
              <input
                autoFocus={!isEditing}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 py-4 text-5xl font-black border-none outline-none focus:ring-0 placeholder-slate-100 bg-transparent text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-5">
              {mode === 'Expense' ? (
                <>
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

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={14} className="text-slate-400" />
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sub Category</span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g., Dining, Uber, Rent"
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl text-sm font-black outline-none border border-transparent focus:border-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </>
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

                {!isEditing && mode === 'Expense' && (
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
              className={`w-full ${mode === 'Expense' ? 'bg-[#f14444]' : 'bg-indigo-600'} text-white font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-3 hover:opacity-95 disabled:opacity-50 transition-all text-xs uppercase tracking-widest !mt-8`}
            >
              {isEditing ? (
                <>Update {mode} <Save size={20} strokeWidth={4} /></>
              ) : (
                <>
                  {mode === 'Expense' 
                    ? (frequency !== 'None' ? 'Set Subscription' : 'Log Expense') 
                    : 'Add to Budget'} <Check size={20} strokeWidth={4} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddRecord;