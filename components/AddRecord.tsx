
import React, { useState, useEffect } from 'react';
import { 
  Category, Expense, UserSettings, Frequency, 
  Income, IncomeType, WealthItem, PaymentMethod 
} from '../types';
import { CATEGORY_COLORS, getCurrencySymbol, SUB_CATEGORIES, PAYMENT_METHODS } from '../constants';
import { 
  Check, X, Calendar as CalendarIcon, Tag, 
  MessageSquare, Sparkles, Loader2, 
  Store, ChevronDown, ChevronUp, TrendingUp, Wallet,
  ArrowRightLeft, Landmark, Zap, AlertCircle
} from 'lucide-react';
import { parseTransactionText, getDecisionAdvice } from '../services/geminiService';
import { triggerHaptic } from '../utils/haptics';

interface AddRecordProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  onAdd: (expense: Omit<Expense, 'id'>, frequency: Frequency) => void;
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onTransfer?: (fromId: string, toId: string, amount: number, date: string, note: string) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  onUpdateIncome?: (id: string, updates: Partial<Income>) => void;
  onCancel: () => void;
  initialData?: Expense | Income | any | null;
  expenses?: Expense[]; // Added to provide context for AI Risk Engine
}

const AddRecord: React.FC<AddRecordProps> = ({ 
  settings, wealthItems, onAdd, onAddIncome, onTransfer, onUpdateExpense, onUpdateIncome, onCancel, initialData, expenses = []
}) => {
  const isEditing = !!(initialData && initialData.id);
  const [mode, setMode] = useState<'Expense' | 'Income' | 'Transfer'>('Expense');
  const [showExtras, setShowExtras] = useState(false);
  
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  
  const [category, setCategory] = useState<Category>('Needs');
  const [subCategory, setSubCategory] = useState('General');
  const [merchant, setMerchant] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('None');
  
  const [isInvestment, setIsInvestment] = useState(false);
  const [targetWealthId, setTargetWealthId] = useState<string>('');
  const [sourceWealthId, setSourceWealthId] = useState<string>('');
  const [incomeType, setIncomeType] = useState<IncomeType>('Salary');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [decisionAdvice, setDecisionAdvice] = useState<any | null>(null);

  const currencySymbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    if (initialData) {
      if ('category' in initialData) {
        setMode('Expense');
        setCategory(initialData.category);
        setSubCategory(initialData.subCategory || 'General');
        setMerchant(initialData.merchant || '');
        setPaymentMethod(initialData.paymentMethod || 'UPI');
      } else if ('type' in initialData) {
        setMode('Income');
        setIncomeType(initialData.type as IncomeType);
        setPaymentMethod(initialData.paymentMethod || 'UPI');
        setTargetWealthId(initialData.targetAccountId || '');
      }
      setAmount(Math.round(initialData.amount || 0).toString() || '');
      setNote(initialData.note || '');
      setDate(initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    }
  }, [initialData]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    triggerHaptic();
    const roundedAmount = Math.round(parseFloat(amount));

    if (mode === 'Expense') {
      const payload = { amount: roundedAmount, date, category, subCategory, note, merchant: merchant || note, paymentMethod, isConfirmed: true };
      if (isEditing && onUpdateExpense) onUpdateExpense(initialData.id, payload);
      else onAdd(payload, frequency);
    } else if (mode === 'Income') {
      const payload = { amount: roundedAmount, date, type: incomeType, note, paymentMethod, targetAccountId: targetWealthId };
      if (isEditing && onUpdateIncome) onUpdateIncome(initialData.id, payload);
      else onAddIncome(payload);
    } else if (mode === 'Transfer' && onTransfer) {
      if (sourceWealthId && targetWealthId) {
        onTransfer(sourceWealthId, targetWealthId, roundedAmount, date, note);
      }
    }
  };

  const liquidAccounts = wealthItems.filter(i => ['Checking Account', 'Savings Account', 'Cash', 'Credit Card'].includes(i.category));
  const portfolioItems = wealthItems.filter(i => i.type === 'Investment');

  const handleModeChange = (m: any) => {
    triggerHaptic();
    setMode(m);
    setDecisionAdvice(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm p-0">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col animate-slide-up max-h-[90dvh]">
        
        <div className="flex border-b dark:border-slate-800">
          {[
            { id: 'Expense', color: 'border-brand-primary text-brand-primary' },
            { id: 'Income', color: 'border-indigo-500 text-indigo-500' },
            { id: 'Transfer', color: 'border-emerald-500 text-emerald-500' }
          ].map(m => (
            <button 
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 active:scale-95 ${mode === m.id ? m.color : 'border-transparent text-slate-400'}`}
            >
              {m.id}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Transaction Value</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-300">{currencySymbol}</span>
                  <input
                    autoFocus={!isEditing}
                    type="number"
                    step="1"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setDecisionAdvice(null); }}
                    placeholder="0"
                    className="w-full text-4xl font-black border-none outline-none bg-transparent text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              {mode === 'Expense' && (
                <div className="flex gap-2">
                  <button type="button" onClick={async () => {
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
                        setDate(result.date);
                        setDecisionAdvice(null);
                      }
                    } catch (err) {} finally { setIsAnalyzing(false); }
                  }} className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl border border-indigo-100 dark:border-indigo-800 transition-transform active:scale-90">
                    {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  </button>
                </div>
              )}
            </div>

            {/* AI RISK ENGINE INTEGRATION */}
            {mode === 'Expense' && amount && (merchant || note) && (
              <div className={`p-4 rounded-2xl border transition-all duration-500 ${decisionAdvice ? (decisionAdvice.status === 'Green' ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40' : decisionAdvice.status === 'Yellow' ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40' : 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40') : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800'}`}>
                {decisionAdvice ? (
                  <div className="animate-kick">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2">
                          <div className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${decisionAdvice.status === 'Green' ? 'bg-emerald-500 text-white' : decisionAdvice.status === 'Yellow' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>{decisionAdvice.status} IMPACT</div>
                          <span className="text-[10px] font-black text-slate-900 dark:text-white">{decisionAdvice.score}/100</span>
                       </div>
                       <button type="button" onClick={() => { triggerHaptic(); setDecisionAdvice(null); }} className="text-slate-400"><X size={12} /></button>
                    </div>
                    <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300 leading-tight mb-2 italic">"{decisionAdvice.reasoning}"</p>
                    <div className="flex flex-wrap gap-1.5">
                       {decisionAdvice.actionPlan?.slice(0, 2).map((plan: string, idx: number) => (
                         <div key={idx} className="bg-white/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700 text-[7px] font-black text-slate-500 uppercase tracking-tighter">✓ {plan}</div>
                       ))}
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={handleRunAssessment} disabled={isAssessing} className="w-full flex items-center justify-center gap-2 py-1.5 text-brand-primary active:scale-95 transition-all">
                    {isAssessing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} fill="currentColor" />}
                    <span className="text-[9px] font-black uppercase tracking-widest">{isAssessing ? 'Calculating Impact...' : 'AI Risk Assessment'}</span>
                  </button>
                )}
              </div>
            )}

            {mode === 'Transfer' ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <Landmark size={12} />
                    <span className="text-[8px] font-black uppercase">Debit From</span>
                  </div>
                  <select value={sourceWealthId} onChange={(e) => setSourceWealthId(e.target.value)} className="w-full bg-transparent text-[11px] font-black outline-none appearance-none">
                    <option value="">Select Account</option>
                    {liquidAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <ArrowRightLeft size={16} className="text-slate-300 shrink-0" />
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <Landmark size={12} />
                    <span className="text-[8px] font-black uppercase">Credit To</span>
                  </div>
                  <select value={targetWealthId} onChange={(e) => setTargetWealthId(e.target.value)} className="w-full bg-transparent text-[11px] font-black outline-none appearance-none">
                    <option value="">Select Account</option>
                    {liquidAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <CalendarIcon size={12} />
                    <span className="text-[8px] font-black uppercase">Date</span>
                  </div>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent text-[11px] font-black outline-none" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <Store size={12} />
                    <span className="text-[8px] font-black uppercase">{mode === 'Expense' ? 'Vendor' : 'Inflow Source'}</span>
                  </div>
                  <input type="text" value={merchant} onChange={(e) => { setMerchant(e.target.value); setDecisionAdvice(null); }} placeholder="..." className="w-full bg-transparent text-[11px] font-black outline-none" />
                </div>
              </div>
            )}

            {mode !== 'Transfer' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                  {mode === 'Expense' && category === 'Savings' && (
                    <button type="button" onClick={() => { triggerHaptic(); setIsInvestment(!isInvestment); }} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase border transition-all active:scale-95 ${isInvestment ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'}`}>
                      <TrendingUp size={10} /> Link Investment
                    </button>
                  )}
                </div>
                
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {mode === 'Expense' ? (
                    (['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
                      <button key={cat} type="button" onClick={() => { triggerHaptic(); setCategory(cat); setSubCategory(SUB_CATEGORIES[cat][0]); }} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 ${category === cat ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                        {cat}
                      </button>
                    ))
                  ) : (
                    (['Salary', 'Freelance', 'Investment', 'Gift'] as IncomeType[]).map(type => (
                      <button key={type} type="button" onClick={() => { triggerHaptic(); setIncomeType(type); }} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 ${incomeType === type ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                        {type}
                      </button>
                    ))
                  )}
                </div>

                {(isInvestment || mode === 'Income') && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 animate-kick">
                    <div className="flex items-center gap-2 mb-2 text-emerald-600">
                      <Wallet size={12} />
                      <span className="text-[8px] font-black uppercase">{mode === 'Income' ? 'Direct Deposit To' : 'Target Portfolio Item'}</span>
                    </div>
                    <select value={targetWealthId} onChange={(e) => setTargetWealthId(e.target.value)} className="w-full bg-white dark:bg-slate-800 p-2 rounded-xl text-[10px] font-bold outline-none border border-emerald-100 dark:border-emerald-900 appearance-none">
                      <option value="">{mode === 'Income' ? 'External Account' : 'Choose Account...'}</option>
                      {(mode === 'Income' ? liquidAccounts : portfolioItems).map(item => (
                        <option key={item.id} value={item.id}>{item.name} ({getCurrencySymbol(settings.currency)}{Math.round(item.value)})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button type="button" onClick={() => { triggerHaptic(); setShowExtras(!showExtras); }} className="w-full flex items-center justify-between py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest border-t dark:border-slate-800 active:bg-slate-50 transition-colors">
                Advanced Details {showExtras ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showExtras && (
                <div className="space-y-4 animate-kick">
                  {mode !== 'Transfer' && (
                    <div className="space-y-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Method</span>
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                        {PAYMENT_METHODS.map(m => (
                          <button key={m} type="button" onClick={() => { triggerHaptic(); setPaymentMethod(m); }} className={`shrink-0 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border transition-transform active:scale-95 ${paymentMethod === m ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'}`}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Narrative</span>
                    <input type="text" value={note} onChange={(e) => { setNote(e.target.value); setDecisionAdvice(null); }} placeholder="Type memo..." className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-[11px] font-bold outline-none border border-slate-100 dark:border-slate-700" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onCancel} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest active:scale-[0.98] transition-all">Cancel</button>
              <button type="submit" disabled={!amount || (mode === 'Transfer' && (!sourceWealthId || !targetWealthId))} className={`flex-[2] text-white font-black py-4 rounded-2xl shadow-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${mode === 'Expense' ? 'bg-brand-primary' : mode === 'Income' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                {isEditing ? 'Save Changes' : `Confirm ${mode}`} <Check size={16} strokeWidth={3} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddRecord;
