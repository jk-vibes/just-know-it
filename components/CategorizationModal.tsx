
import React, { useState } from 'react';
import { Expense, Category } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { Check, ArrowRight, Smartphone, Building2 } from 'lucide-react';

interface CategorizationModalProps {
  expenses: Expense[];
  onConfirm: (id: string, category: Category) => void;
  onClose: () => void;
}

const CategorizationModal: React.FC<CategorizationModalProps> = ({ expenses, onConfirm, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = expenses[currentIndex];

  if (!current) {
    return (
      <div className="fixed inset-0 bg-white z-[70] flex flex-col items-center justify-center p-8 text-center animate-slide-up">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <Check size={48} strokeWidth={3} />
        </div>
        <h2 className="text-3xl font-extrabold mb-2 text-gray-900">All Done!</h2>
        <p className="text-gray-500 mb-8 max-w-xs">You've successfully categorized all pending transactions.</p>
        <button 
          onClick={onClose}
          className="w-full max-w-xs bg-blue-600 text-white font-extrabold py-5 rounded-3xl shadow-xl shadow-blue-100"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[70] flex flex-col animate-slide-up overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <Smartphone size={18} />
          </div>
          <span className="font-extrabold text-blue-900 uppercase text-xs tracking-widest">New Alerts</span>
        </div>
        <span className="font-bold text-gray-400 text-sm">{currentIndex + 1} / {expenses.length}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="bg-gray-50 w-24 h-24 rounded-3xl flex items-center justify-center text-gray-300 mb-6 border-2 border-dashed border-gray-200">
          <Building2 size={40} />
        </div>
        <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">Merchant</h3>
        <h2 className="text-3xl font-extrabold text-center mb-8 text-gray-900">{current.merchant || 'Unidentified'}</h2>
        
        <div className="text-5xl font-extrabold text-gray-900 mb-12">
          ${current.amount.toLocaleString()}
        </div>

        <div className="w-full space-y-3">
          {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
            <button
              key={cat}
              onClick={() => {
                onConfirm(current.id, cat);
                setCurrentIndex(currentIndex + 1);
              }}
              className="w-full flex items-center justify-between p-5 rounded-3xl border-2 border-gray-100 hover:border-blue-600 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                <span className="font-bold text-gray-700 text-lg">{cat}</span>
              </div>
              <ArrowRight className="text-gray-300 group-hover:text-blue-600" size={24} />
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <button 
          onClick={onClose}
          className="w-full text-gray-400 font-bold text-sm hover:text-gray-600 py-4"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default CategorizationModal;
