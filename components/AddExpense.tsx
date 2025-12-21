
import React, { useState } from 'react';
import { Category, Expense } from '../types';
import { Check, X, Calendar as CalendarIcon, Tag, MessageSquare } from 'lucide-react';

interface AddExpenseProps {
  onAdd: (expense: Omit<Expense, 'id'>) => void;
  onCancel: () => void;
}

const AddExpense: React.FC<AddExpenseProps> = ({ onAdd, onCancel }) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category>('Needs');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    onAdd({
      amount: parseFloat(amount),
      date,
      category,
      note,
      isConfirmed: true
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-3xl p-6 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold">New Expense</h2>
          <button onClick={onCancel} className="p-2 bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-bold text-gray-300">$</span>
            <input
              autoFocus
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 py-4 text-5xl font-extrabold border-none outline-none focus:ring-0 placeholder-gray-100"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-3 rounded-2xl text-gray-500">
                <Tag size={20} />
              </div>
              <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {(['Needs', 'Wants', 'Savings'] as Category[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      category === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-3 rounded-2xl text-gray-500">
                <CalendarIcon size={20} />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 bg-gray-50 p-3 rounded-2xl text-sm font-bold outline-none border-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-3 rounded-2xl text-gray-500">
                <MessageSquare size={20} />
              </div>
              <input
                type="text"
                placeholder="What was this for?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="flex-1 bg-gray-50 p-3 rounded-2xl text-sm font-bold outline-none border-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!amount}
            className="w-full bg-blue-600 text-white font-extrabold py-5 rounded-3xl shadow-xl shadow-blue-200 flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all text-lg"
          >
            Save Transaction <Check size={24} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;
