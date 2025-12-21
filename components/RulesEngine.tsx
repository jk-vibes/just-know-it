import React, { useState } from 'react';
import { BudgetRule, Category, RecurringItem } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { Settings2, Plus, Trash2, Tag, Repeat, Clock } from 'lucide-react';

interface RulesEngineProps {
  rules: BudgetRule[];
  recurringItems: RecurringItem[];
  onAddRule: (rule: Omit<BudgetRule, 'id'>) => void;
  onDeleteRule: (id: string) => void;
  onDeleteRecurring: (id: string) => void;
}

const RulesEngine: React.FC<RulesEngineProps> = ({ rules, recurringItems, onAddRule, onDeleteRule, onDeleteRecurring }) => {
  const [activeTab, setActiveTab] = useState<'mapping' | 'recurring'>('mapping');
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
    <div className="pb-24 pt-4 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white leading-none">Automation</h2>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mt-1">Smart Rules & Subscriptions</p>
        </div>
        {activeTab === 'mapping' && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-transform active:scale-95"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-4">
        <button 
          onClick={() => setActiveTab('mapping')}
          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'mapping' ? 'bg-white dark:bg-slate-700 text-[#163074] dark:text-white shadow-sm' : 'text-slate-400'}`}
        >
          Keyword Mapping
        </button>
        <button 
          onClick={() => setActiveTab('recurring')}
          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'recurring' ? 'bg-white dark:bg-slate-700 text-[#163074] dark:text-white shadow-sm' : 'text-slate-400'}`}
        >
          Recurring ({recurringItems.length})
        </button>
      </div>

      {activeTab === 'mapping' && (
        <>
          {isAdding && (
            <div className="animate-slide-up">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-[10px] uppercase tracking-widest">New Mapping Rule</h3>
                <div className="space-y-3">
                  <input 
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Merchant Keyword (e.g. Uber)"
                    className="w-full p-3 bg-gray-50 dark:bg-slate-900 rounded-2xl text-sm font-bold outline-none text-slate-900 dark:text-white border border-transparent focus:border-indigo-500 transition-colors"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`p-2.5 rounded-xl text-[9px] font-black uppercase border transition-all ${
                          category === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-gray-500 border-gray-200 dark:border-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => setIsAdding(false)}
                      className="flex-1 bg-gray-100 dark:bg-slate-900 text-gray-500 font-bold py-3 rounded-2xl text-xs uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleAdd}
                      className="flex-[2] bg-indigo-600 text-white font-bold py-3 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none"
                    >
                      Save Rule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {rules.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800/50 rounded-3xl border border-dashed border-gray-100 dark:border-slate-800">
                <Tag size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">No mapping rules yet</p>
              </div>
            ) : (
              rules.map(rule => (
                <div key={rule.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-gray-50 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-50 dark:bg-slate-900 p-2.5 rounded-2xl">
                      <Tag size={16} className="text-gray-400" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-gray-900 dark:text-white text-sm truncate max-w-[150px]">{rule.keyword}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[rule.category] }} />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{rule.category}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => onDeleteRule(rule.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'recurring' && (
        <div className="space-y-2">
          {recurringItems.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800/50 rounded-3xl border border-dashed border-gray-100 dark:border-slate-800">
              <Repeat size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">No recurring expenses</p>
              <p className="text-gray-400 text-[9px] mt-1">Add one from the main menu</p>
            </div>
          ) : (
            recurringItems.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-gray-50 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-2xl">
                    <Repeat size={16} className="text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-gray-900 dark:text-white text-sm truncate max-w-[150px]">{item.note || item.merchant || 'Recurring'}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-1.5 rounded">{item.frequency}</span>
                      <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold">
                        <Clock size={10} />
                        Next: {new Date(item.nextDueDate).toLocaleDateString(undefined, {month:'short', day: 'numeric'})}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-black text-gray-900 dark:text-white text-sm">{item.amount}</span>
                  <button 
                    onClick={() => onDeleteRecurring(item.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RulesEngine;