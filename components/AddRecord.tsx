
import React, { useState, useEffect, useRef } from 'react';
import { 
  Category, Expense, UserSettings, Frequency, 
  Income, IncomeType, WealthItem, PaymentMethod, Bill 
} from '../types';
import { CATEGORY_COLORS, getCurrencySymbol, SUB_CATEGORIES, PAYMENT_METHODS } from '../constants';
import { 
  Check, X, Calendar as CalendarIcon, Tag, 
  MessageSquare, Sparkles, Loader2, Camera,
  Store, ChevronDown, Landmark, Zap, AlertCircle, Layers,
  Trash2, Repeat, Coffee, Wallet
} from 'lucide-react';
import { parseTransactionText, getDecisionAdvice, analyzeBillImage } from '../services/geminiService';
import { triggerHaptic } from '../utils/haptics';

interface AddRecordProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  onAdd: (expense: Omit<Expense, 'id'>, frequency: Frequency) => void;
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onAddBill?: (bill: Omit<Bill, 'id'>) => void;
  onTransfer?: (fromId: string, toId: string, amount: number, date: string, note: string) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  onUpdateIncome?: (id: string, updates: Partial<Income>) => void;
  onDelete?: () => void;
  onCancel: () => void;
  initialData?: Expense | Income | any | null;
  expenses?: Expense[];
}

const AddRecord: React.FC<AddRecordProps> = ({ 
  settings, wealthItems, onAdd, onAddIncome, onAddBill, onTransfer, onUpdateExpense, onUpdateIncome, onDelete, onCancel, initialData, expenses = []
}) => {
  const isEditing = !!(initialData && initialData.id);
  const [mode, setMode] = useState<'Expense' | 'Income' | 'Transfer' | 'Bill'>(initialData?.amount && 'category' in initialData ? 'Bill' : 'Expense');
  
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  
  const [category, setCategory] = useState<Category>('Needs');
  const [subCategory, setSubCategory] = useState('General');
  const [merchant, setMerchant] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('None');
  
  const [targetWealthId, setTargetWealthId] = useState<string>('');
  const [sourceWealthId, setSourceWealthId] = useState<string>('');
  const [incomeType, setIncomeType] = useState<IncomeType>('Salary');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [decisionAdvice, setDecisionAdvice] = useState<any | null>(null);
  const [billImage, setBillImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currencySymbol = getCurrencySymbol(settings.currency);
  const liquidAccounts = wealthItems.filter(i => ['Checking Account', 'Savings Account', 'Cash', 'Credit Card'].includes(i.category));

  useEffect(() => {
    if (initialData) {
      if (initialData.mode === 'Bill' || ('dueDate' in initialData)) {
        setMode('Bill');
        setCategory(initialData.category || 'Needs');
        setMerchant(initialData.merchant || '');
        setFrequency(initialData.frequency || 'None');
      } else if ('category' in initialData) {
        setMode('Expense');
        setCategory(initialData.category);
        setSubCategory(initialData.subCategory || 'General');
        setMerchant(initialData.merchant || '');
        setPaymentMethod(initialData.paymentMethod || 'UPI');
        setSourceWealthId(initialData.sourceAccountId || '');
      } else if ('type' in initialData) {
        setMode('Income');
        setIncomeType(initialData.type as IncomeType);
        setPaymentMethod(initialData.paymentMethod || 'UPI');
        setTargetWealthId(initialData.targetAccountId || '');
      }
      setAmount(Math.round(initialData.amount || 0).toString() || '');
      setNote(initialData.note || '');
      setDate(initialData.date || initialData.dueDate ? (initialData.date || initialData.dueDate).split('T')[0] : new Date().toISOString().split('T')[0]);
    } else {
      if (liquidAccounts.length > 0) {
        if (mode === 'Income' && !targetWealthId) setTargetWealthId(liquidAccounts[0].id);
        if (mode === 'Expense' && !sourceWealthId) setSourceWealthId(liquidAccounts[0].id);
      }
    }
  }, [initialData, mode]);

  useEffect(() => {
    if ((mode === 'Expense' || mode === 'Bill') && !isEditing) {
      const subs = SUB_CATEGORIES[category];
      if (subs && subs.length > 0 && !subs.includes(subCategory)) {
        setSubCategory(subs[0]);
      }
    }
  }, [category, mode, isEditing]);

  const handleCaptureBill = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic();
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setBillImage(base64);
      const result = await analyzeBillImage(base64, settings.currency);
      if (result) {
        setAmount(result.amount.toString());
        setMerchant(result.merchant);
        setCategory(result.category as Category);
        setDate(result.dueDate || new Date().toISOString().split('T')[0]);
      }
      setIsAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRunAssessment = async () => {
    if (!amount || (!merchant && !note) || isAssessing) return;
    triggerHaptic();
    setIsAssessing(true);
    try {
      const advice = await getDecisionAdvice(
        expenses, 
        wealthItems, 
        settings, 
        'Purchase', 
        merchant || note, 
        Math.round(parseFloat(amount))
      );
      setDecisionAdvice(advice);
    } catch (e) {} finally { setIsAssessing(false); }
  };

  const handleInternalSubmit = () => {
    if (!amount) return;
    triggerHaptic(20);
    const roundedAmount = Math.round(parseFloat(amount));

    if (mode === 'Expense') {
      const payload = { 
        amount: roundedAmount, date, category, subCategory, note, merchant: merchant || note, 
        paymentMethod, sourceAccountId: sourceWealthId, isConfirmed: true 
      };
      if (isEditing && onUpdateExpense) onUpdateExpense(initialData.id, payload);
      else onAdd(payload, frequency);
    } else if (mode === 'Income') {
      const payload = { amount: roundedAmount, date, type: incomeType, note, paymentMethod, targetAccountId: targetWealthId };
      if (isEditing && onUpdateIncome) onUpdateIncome(initialData.id, payload);
      else onAddIncome(payload);
    } else if (mode === 'Bill' && onAddBill) {
      onAddBill({ amount: roundedAmount, dueDate: date, merchant: merchant || note, category, isPaid: false, image: billImage || undefined, note, frequency });
    } else if (mode === 'Transfer' && onTransfer) {
      if (sourceWealthId && targetWealthId) {
        onTransfer(sourceWealthId, targetWealthId, roundedAmount, date, note);
      }
    }
  };

  const handleModeChange = (m: any) => {
    triggerHaptic();
    setMode(m);
    setDecisionAdvice(null);
    if (liquidAccounts.length > 0) {
      if (m === 'Income' && !targetWealthId) setTargetWealthId(liquidAccounts[0].id);
      if (m === 'Expense' && !sourceWealthId) setSourceWealthId(liquidAccounts[0].id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm p-0">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col animate-slide-up max-h-[85dvh]">
        
        {/* Compact Action Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <button onClick={() => { triggerHaptic(); onCancel(); }} className="p-2 text-slate-400 active:scale-90">
            <X size={18} strokeWidth={2.5} />
          </button>
          
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 p-0.5 rounded-xl overflow-x-auto no-scrollbar max-w-[220px]">
            {(['Expense', 'Income', 'Bill', 'Transfer'] as const).map(m => (
              <button key={m} onClick={() => handleModeChange(m)} className={`shrink-0 px-3 py-1 text-[8px] font-black uppercase tracking-widest transition-all rounded-lg ${mode === m ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {isEditing && (
              <button onClick={() => { triggerHaptic(30); onDelete?.(); }} className="p-2 text-rose-500 active:scale-90">
                <Trash2 size={16} strokeWidth={2.5} />
              </button>
            )}
            <button disabled={!amount} onClick={handleInternalSubmit} className={`p-2 rounded-xl active:scale-90 ${!amount ? 'text-slate-200' : 'text-emerald-500'}`}>
              <Check size={18} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-3">
          <div className="space-y-3">
            
            {/* AMOUNT & DATE: Reduced row height */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">{mode === 'Bill' ? 'Amount Due' : 'Value'}</p>
                <div className="relative flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-1.5 border border-transparent focus-within:border-brand-primary/30">
                  <span className="text-xs font-black text-slate-300 mr-1.5">{currencySymbol}</span>
                  <input autoFocus={!isEditing} type="number" step="1" value={amount} onChange={(e) => { setAmount(e.target.value); setDecisionAdvice(null); }} placeholder="0" className="w-full text-lg font-black border-none outline-none bg-transparent text-slate-900 dark:text-white" />
                  {(mode === 'Expense' || mode === 'Bill') && (
                    <button type="button" onClick={mode === 'Bill' ? handleCaptureBill : async () => {
                      triggerHaptic();
                      try {
                        const text = await navigator.clipboard.readText();
                        if (!text) return;
                        setIsAnalyzing(true);
                        const result = await parseTransactionText(text, settings.currency);
                        if (result) {
                          setAmount(Math.round(result.amount).toString());
                          setMerchant(result.merchant);
                          setCategory(result.category);
                          setSubCategory(result.subCategory);
                          setDate(result.date);
                          setDecisionAdvice(null);
                        }
                      } catch (err) {} finally { setIsAnalyzing(false); }
                    }} className="ml-1.5 text-indigo-500 active:scale-90 transition-transform">
                      {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : mode === 'Bill' ? <Camera size={14} /> : <Sparkles size={14} />}
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</p>
                <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-2">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-[10px] font-black outline-none bg-transparent dark:text-white appearance-none" />
                  <CalendarIcon size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                </div>
              </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />

            {/* MERCHANT & CATEGORY: Now using Dropdowns */}
            {(mode === 'Expense' || mode === 'Bill') && (
              <div className="grid grid-cols-2 gap-2 animate-kick">
                <div className="space-y-0.5">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Source / Merchant</span>
                  <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-2">
                    <input type="text" value={merchant} onChange={(e) => { setMerchant(e.target.value); setDecisionAdvice(null); }} placeholder="e.g. Amazon" className="w-full text-[10px] font-bold outline-none bg-transparent dark:text-white" />
                    <Store size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Allocation</span>
                  <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-2">
                    <select 
                      value={category} 
                      onChange={(e) => { triggerHaptic(); setCategory(e.target.value as Category); setDecisionAdvice(null); }}
                      className="w-full text-[10px] font-black uppercase outline-none bg-transparent dark:text-white appearance-none pr-5"
                      style={{ color: CATEGORY_COLORS[category] }}
                    >
                      {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
                        <option key={cat} value={cat} className="text-slate-900 dark:text-white">{cat}</option>
                      ))}
                    </select>
                    <Tag size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY: Now a standard Dropdown */}
            {(mode === 'Expense' || mode === 'Bill') && (
              <div className="space-y-0.5 animate-kick">
                <div className="flex items-center gap-1.5 ml-1">
                  <Layers size={10} className="text-slate-400" />
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Detail Category</span>
                </div>
                <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-2">
                  <select 
                    value={subCategory} 
                    onChange={(e) => { triggerHaptic(); setSubCategory(e.target.value); }}
                    className="w-full text-[10px] font-bold outline-none bg-transparent dark:text-white appearance-none pr-5"
                  >
                    {SUB_CATEGORIES[category].map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                  <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                </div>
              </div>
            )}

            {/* RECURRING & ACCOUNTS: Dropdowns */}
            {mode === 'Bill' && (
              <div className="space-y-0.5 animate-kick">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Cycle</span>
                <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-2">
                  <select value={frequency} onChange={(e) => { triggerHaptic(); setFrequency(e.target.value as Frequency); }} className="w-full text-[10px] font-bold outline-none bg-transparent dark:text-white appearance-none pr-5">
                    {(['None', 'Weekly', 'Monthly', 'Yearly'] as Frequency[]).map(freq => (
                      <option key={freq} value={freq}>{freq === 'None' ? 'One-time' : freq}</option>
                    ))}
                  </select>
                  <Repeat size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                </div>
              </div>
            )}

            {mode === 'Expense' && (
              <div className="grid grid-cols-2 gap-2 animate-kick">
                <div className="space-y-0.5">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Source Account</span>
                  <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-2">
                    <select value={sourceWealthId} onChange={(e) => { triggerHaptic(); setSourceWealthId(e.target.value); }} className="w-full text-[10px] font-bold outline-none bg-transparent dark:text-white appearance-none pr-5">
                      <option value="">Manual</option>
                      {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                    <Wallet size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Method</span>
                  <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-2">
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full text-[10px] font-bold outline-none bg-transparent dark:text-white appearance-none pr-5">
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {mode === 'Income' && (
              <div className="grid grid-cols-2 gap-2 animate-kick">
                <div className="space-y-0.5">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</span>
                  <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-2">
                    <select value={incomeType} onChange={(e) => { triggerHaptic(); setIncomeType(e.target.value as IncomeType); }} className="w-full text-[10px] font-bold outline-none bg-transparent dark:text-white appearance-none pr-5">
                      {(['Salary', 'Freelance', 'Investment', 'Gift', 'Other'] as IncomeType[]).map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <Landmark size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Deposit To</span>
                  <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-2">
                    <select value={targetWealthId} onChange={(e) => { triggerHaptic(); setTargetWealthId(e.target.value); }} className="w-full text-[10px] font-bold outline-none bg-transparent dark:text-white appearance-none pr-5">
                      <option value="">Manual</option>
                      {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                    <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* NOTES: Always visible, compact */}
            <div className="space-y-0.5">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Annotate / Detail</span>
              <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-2">
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Personal remarks..." className="w-full text-[10px] font-bold outline-none bg-transparent dark:text-white" />
                <MessageSquare size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
              </div>
            </div>

            {/* AI ASSESSMENT: Small Button */}
            {mode === 'Expense' && (
              <button type="button" onClick={handleRunAssessment} disabled={!amount || (!merchant && !note) || isAssessing} className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${decisionAdvice ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-900 text-white shadow-md'}`}>
                {isAssessing ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                <span className="text-[8px] font-black uppercase tracking-widest">{decisionAdvice ? 'Recalculate Affordability' : 'Run AI Affordability Check'}</span>
              </button>
            )}

            {/* ADVICE BOX: Compact */}
            {decisionAdvice && (
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 animate-kick space-y-1.5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1 h-1 rounded-full ${decisionAdvice.status === 'Green' ? 'bg-emerald-500' : decisionAdvice.status === 'Yellow' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                    <span className="text-[8px] font-black uppercase">{decisionAdvice.status} Signal</span>
                  </div>
                  <div className="text-right leading-none"><span className="text-[12px] font-black">{decisionAdvice.score}</span><span className="text-[6px] font-black uppercase text-slate-400 ml-0.5">Score</span></div>
                </div>
                <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 leading-tight italic">"{decisionAdvice.reasoning}"</p>
              </div>
            )}
          </div>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
           <p className="text-[6px] font-black text-slate-400 uppercase tracking-[0.2em]">Validated for Build 2.0.4 • High Security Mode</p>
        </div>
      </div>
    </div>
  );
};

export default AddRecord;
