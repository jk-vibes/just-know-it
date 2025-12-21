
import React, { useState } from 'react';
import { BudgetRule, Category } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { Settings2, Plus, Trash2, Tag, ChevronRight } from 'lucide-react';

interface RulesEngineProps {
  rules: BudgetRule[];
  onAddRule: (rule: Omit<BudgetRule, 'id'>) => void;
  onDeleteRule: (id: string) => void;
}

const RulesEngine: React.FC<RulesEngineProps> = ({ rules, onAddRule, onDeleteRule }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<Category>('Needs');

  const handleAdd = () => {
    if (!keyword) return;
    onAddRule({ keyword, category });
    setKeyword('');
    setIsAdding(false);
  };

  return (
    <div className="pb-24 pt-4 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">Custom Rules</h2>
          <p className="text-gray-500 text-sm">Automate your categorization</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg"
        >
          <Plus size={24} />
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-xl animate-slide-up">
          <h3 className="font-bold mb-4 text-gray-900">Add New Mapping</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">When merchant includes</label>
              <input 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Starbucks, Uber, Rent"
                className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Map to category</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`p-3 rounded-xl text-xs font-bold border transition-all ${
                      category === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setIsAdding(false)}
                className="flex-1 bg-gray-100 text-gray-500 font-bold py-3 rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={handleAdd}
                className="flex-2 bg-blue-600 text-white font-bold py-3 px-8 rounded-xl"
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
            <Settings2 className="mx-auto text-gray-200 mb-4" size={48} />
            <p className="text-gray-400 font-medium px-8">Define rules like "Amazon = Wants" to categorize upcoming transactions automatically.</p>
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">
                  <Tag size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900">{rule.keyword}</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[rule.category] }} />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{rule.category}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => onDeleteRule(rule.id)}
                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-6 bg-blue-50 rounded-3xl">
        <h4 className="font-bold text-blue-900 mb-2">How it works</h4>
        <p className="text-xs text-blue-700 leading-relaxed">
          When an SMS or unmapped transaction is detected, the app checks if the merchant name contains any of your keywords. If a match is found, the category is pre-selected for your confirmation.
        </p>
      </div>
    </div>
  );
};

export default RulesEngine;
