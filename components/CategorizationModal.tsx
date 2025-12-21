
import React, { useState } from 'react';
import { Expense, Category, UserSettings } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { Check, ArrowRight, Smartphone, Building2 } from 'lucide-react';

interface CategorizationModalProps {
  settings: UserSettings;
  expenses: Expense[];
  onConfirm: (id: string, category: Category) => void;
  onClose: () => void;
}

const CategorizationModal: React.FC<CategorizationModalProps> = ({ settings, expenses, onConfirm, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = expenses[currentIndex];
  const currencySymbol = getCurrencySymbol(settings.currency);

  if (!current) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[70] flex flex-col items-center justify-center p-6 text-center animate-slide-up">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-[32px] flex items-center justify-center mb-6">
          <Check size={40} strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-extrabold mb-2 text-slate-900 dark:text-white">All Done!</h2>
        <p className="text-slate-500 text-sm mb-8 max-w-[240px]">You've successfully categorized all pending transactions.</p>
        <button 
          onClick={onClose}
          className="w-full max-w-xs bg-indigo-600 text-white font-extrabold py-4 rounded-[24px] shadow-xl shadow-indigo-100 dark:shadow-none"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[70] flex flex-col animate-slide-up overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
            <Smartphone size={16} />
          </div>
          <span className="font-extrabold text-indigo-900 dark:text-indigo-400 uppercase text-[10px] tracking-widest">New Alerts</span>
        </div>
        <span className="font-bold text-slate-400 text-xs">{currentIndex + 1} / {expenses.length}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-[32px] flex items-center justify-center text-slate-300 mb-6 border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Building2 size={32} />
        </div>
        <h3 className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mb-1.5">Merchant</h3>
        <h2 className="text-2xl font-extrabold text-center mb-6 text-slate-900 dark:text-white">{current.merchant || 'Unidentified'}</h2>
        
        <div className="text-4xl font-extrabold text-slate-900 dark:text-white mb-10">
          {currencySymbol}{current.amount.toLocaleString()}
        </div>

        <div className="w-full space-y-2.5">
          {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
            <button
              key={cat}
              onClick={() => {
                onConfirm(current.id, cat);
                setCurrentIndex(currentIndex + 1);
              }}
              className="w-full flex items-center justify-between p-4 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                <span className="font-bold text-slate-700 dark:text-slate-300 text-base">{cat}</span>
              </div>
              <ArrowRight className="text-slate-300 group-hover:text-indigo-600" size={20} />
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <button 
          onClick={onClose}
          className="w-full text-slate-400 font-bold text-xs hover:text-slate-600 py-3"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default CategorizationModal;
