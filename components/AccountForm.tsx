import React, { useState, useEffect } from 'react';
import { WealthItem, WealthType, WealthCategory, UserSettings } from '../types';
import { getCurrencySymbol } from '../constants';
import { Check, X, Landmark, CreditCard, Briefcase, Wallet } from 'lucide-react';

interface AccountFormProps {
  settings: UserSettings;
  onSave: (item: Omit<WealthItem, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<WealthItem>) => void;
  onCancel: () => void;
  initialData?: WealthItem | null;
}

const WEALTH_CATEGORIES: WealthCategory[] = [
  'Checking Account', 'Savings Account', 'Cash',
  'Stock', 'Mutual Fund', 'Crypto', 'Gold', 'Real Estate', 
  'Loan', 'Credit Card', 'Other'
];

const AccountForm: React.FC<AccountFormProps> = ({ settings, onSave, onUpdate, onCancel, initialData }) => {
  const isEditing = !!(initialData && initialData.id);
  const [type, setType] = useState<WealthType>('Investment');
  const [category, setCategory] = useState<WealthCategory>('Checking Account');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [limit, setLimit] = useState('');

  const currencySymbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setCategory(initialData.category);
      setName(initialData.name);
      setValue(Math.round(initialData.value).toString());
      if (initialData.limit) setLimit(Math.round(initialData.limit).toString());
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) return;

    const payload: Omit<WealthItem, 'id'> = {
      type,
      category,
      name,
      value: Math.round(parseFloat(value)),
      date: new Date().toISOString()
    };

    if (category === 'Credit Card' && limit) {
      payload.limit = Math.round(parseFloat(limit));
    }

    if (isEditing && onUpdate) {
      onUpdate(initialData!.id, payload);
    } else {
      onSave(payload);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-slide-up">
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">{isEditing ? 'Configure Account' : 'New Account'}</h3>
            <p className="text-[8px] font-black text-slate-400 uppercase mt-0.5">Account Registry</p>
          </div>
          <button onClick={onCancel} className="p-2 bg-white dark:bg-slate-800 rounded-xl text-slate-400"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button 
              type="button" 
              onClick={() => setType('Investment')}
              className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${type === 'Investment' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-slate-400'}`}
            >
              Asset
            </button>
            <button 
              type="button" 
              onClick={() => setType('Liability')}
              className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${type === 'Liability' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-sm' : 'text-slate-400'}`}
            >
              Debt
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrument Category</span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                {WEALTH_CATEGORIES.map(cat => (
                  <button 
                    key={cat} 
                    type="button" 
                    onClick={() => setCategory(cat)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border transition-all ${category === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Label</span>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. HDFC Priority" 
                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-[11px] font-black outline-none border border-transparent focus:border-brand-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Balance</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-black">{currencySymbol}</span>
                  <input 
                    type="number" 
                    step="1"
                    value={value} 
                    onChange={(e) => setValue(e.target.value)} 
                    placeholder="0" 
                    className="w-full bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-3 rounded-2xl text-[11px] font-black outline-none"
                  />
                </div>
              </div>
              {category === 'Credit Card' && (
                <div className="space-y-1.5 animate-kick">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Limit</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-black">{currencySymbol}</span>
                    <input 
                      type="number" 
                      step="1"
                      value={limit} 
                      onChange={(e) => setLimit(e.target.value)} 
                      placeholder="0" 
                      className="w-full bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-3 rounded-2xl text-[11px] font-black outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!name || !value}
            className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-[20px] text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
          >
            {isEditing ? 'Update Registry' : 'Provision Account'} <Check size={16} strokeWidth={3} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountForm;