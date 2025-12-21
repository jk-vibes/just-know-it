
import React, { useState } from 'react';
import { Expense, Category } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { Filter, Calendar, DollarSign, Trash2, CheckCircle2 } from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onConfirm: (id: string, category: Category) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, onConfirm }) => {
  const [filter, setFilter] = useState<Category | 'All'>('All');

  const filtered = expenses.filter(e => filter === 'All' || e.category === filter);

  return (
    <div className="pb-24 pt-4 px-4">
      <div className="sticky top-4 z-40 bg-gray-50/90 backdrop-blur-sm pb-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
          <button 
            onClick={() => setFilter('All')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              filter === 'All' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            All Transactions
          </button>
          {['Needs', 'Wants', 'Savings', 'Uncategorized'].map((cat) => (
            <button 
              key={cat}
              onClick={() => setFilter(cat as Category)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filter === cat ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 mt-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Filter size={32} />
            </div>
            <p className="text-gray-500 font-medium">No expenses found.</p>
          </div>
        ) : (
          filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp) => (
            <div key={exp.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: CATEGORY_COLORS[exp.category] }}
                >
                  {exp.category[0]}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{exp.merchant || exp.note || 'Expense'}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                    <Calendar size={10} />
                    {new Date(exp.date).toLocaleDateString()}
                    {!exp.isConfirmed && <span className="text-amber-500 ml-1">• Needs Confirm</span>}
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <p className="font-extrabold text-gray-900">${exp.amount.toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => onDelete(exp.id)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExpenseList;
