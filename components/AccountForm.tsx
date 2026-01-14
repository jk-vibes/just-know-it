import React, { useState, useEffect } from 'react';
import { WealthItem, WealthType, WealthCategory, UserSettings } from '../types';
import { getCurrencySymbol } from '../constants';
import { Check, X, Landmark, CreditCard, Briefcase, Wallet, Trash2, Tag, Info } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AccountFormProps {
  settings: UserSettings;
  onSave: (item: Omit<WealthItem, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<WealthItem>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  initialData?: WealthItem | null;
}

const DEBIT_CATEGORIES: WealthCategory[] = ['Savings', 'Overdraft', 'Cash', 'Investment'];
const CREDIT_CATEGORIES: WealthCategory[] = ['Card', 'Loan', 'Other'];

const AccountForm: React.FC<AccountFormProps> = ({ settings, onSave, onUpdate, onDelete, onCancel, initialData }) => {
  const isEditing = !!(initialData && initialData.id);
  const [type, setType] = useState<WealthType>(initialData?.type || 'Investment');
  const [category, setCategory] = useState<WealthCategory>(initialData?.category || 'Savings');
  const [name, setName] = useState(initialData?.name || '');
  const [alias, setAlias] = useState(initialData?.alias || '');
  const [value, setValue] = useState(initialData ? Math.round(initialData.value).toString() : '');
  const [limit, setLimit] = useState(initialData?.limit ? Math.round(initialData.limit).toString() : '');

  const currencySymbol = getCurrencySymbol(settings.currency);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) return;

    const payload: Omit<WealthItem, 'id'> = {
      type,
      category,
      name: name.trim(),
      alias: (alias || name).trim(),
      value: Math.round(parseFloat(value)),
      date: new Date().toISOString()
    };

    if (category === 'Card' && limit) {
      payload.limit = Math.round(parseFloat(limit));
    }

    if (isEditing && onUpdate && initialData?.id) {
      onUpdate(initialData.id, payload);
    } else {
      onSave(payload);
    }
  };

  const handleDelete = () => {
    if (!initialData || !initialData.id || !onDelete) return;
    triggerHaptic(40);
    if (window.confirm(`Permanently remove "${initialData.alias || initialData.name}"? This action cannot be undone.`)) {
      onDelete(initialData.id);
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
          <div className="flex items-center gap-1">
            {isEditing && onDelete && initialData?.id && (
              <button 
                type="button" 
                onClick={handleDelete}
                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all active:scale-90"
                title="Delete Account"
              >
                <Trash2 size={18} strokeWidth={2.5} />
              </button>
            )}
            <button 
              type="button" 
              onClick={onCancel} 
              className="p-2 bg-white dark:bg-slate-800 rounded-xl text-slate-400 active:scale-90 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto no-scrollbar max-h-[70vh]">
          {/* Group Type Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button 
              type="button" 
              onClick={() => { setType('Investment'); if (!DEBIT_CATEGORIES.includes(category)) setCategory('Savings'); }}
              className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${type === 'Investment' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-slate-400'}`}
            >
              Debit (Asset)
            </button>
            <button 
              type="button" 
              onClick={() => { setType('Liability'); if (!CREDIT_CATEGORIES.includes(category)) setCategory('Card'); }}
              className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${type === 'Liability' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-sm' : 'text-slate-400'}`}
            >
              Credit (Debt)
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrument Category</span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                {(type === 'Investment' ? DEBIT_CATEGORIES : CREDIT_CATEGORIES).map(cat => (
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
              <div className="flex items-center gap-1.5 ml-1">
                <Tag size={10} className="text-slate-400" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Account Alias</span>
              </div>
              <input 
                type="text" 
                value={alias} 
                onChange={(e) => setAlias(e.target.value)} 
                placeholder="e.g. Daily Spending" 
                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-[11px] font-black outline-none border border-transparent focus:border-brand-primary dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 ml-1">
                <Landmark size={10} className="text-slate-400" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Account Label (Key)</span>
              </div>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. HDFC 1234 (Used for mapping)" 
                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-[11px] font-black outline-none border border-transparent focus:border-brand-primary dark:text-white"
              />
              <p className="text-[7px] text-slate-400 font-bold px-1 italic">This label must match the account name in your bank logs.</p>
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
                    className="w-full bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-3 rounded-2xl text-[11px] font-black outline-none dark:text-white"
                  />
                </div>
              </div>
              {category === 'Card' && (
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
                      className="w-full bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-3 rounded-2xl text-[11px] font-black outline-none dark:text-white"
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