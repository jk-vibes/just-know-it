import React, { useState, useEffect } from 'react';
import { BudgetRule, Category, RecurringItem, UserSettings } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { Plus, Trash2, Tag, Repeat, Clock, Workflow, Zap, Info } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface RulesEngineProps {
  rules: BudgetRule[];
  highlightRuleId?: string | null;
  onClearHighlight?: () => void;
  recurringItems: RecurringItem[];
  settings: UserSettings;
  onAddRule: (rule: Omit<BudgetRule, 'id'>) => void;
  onDeleteRule: (id: string) => void;
  onDeleteRecurring: (id: string) => void;
}

const RulesEngine: React.FC<RulesEngineProps> = ({ rules, highlightRuleId, onClearHighlight, recurringItems, settings, onAddRule, onDeleteRule, onDeleteRecurring }) => {
  const [activeTab, setActiveTab] = useState<'mapping' | 'recurring'>('mapping');
  const [isAdding, setIsAdding] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<Category>('Needs');

  useEffect(() => {
    if (highlightRuleId) {
      setActiveTab('mapping');
      // Auto-clear highlight after some time to stop the animation
      const timer = setTimeout(() => {
        if (onClearHighlight) onClearHighlight();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightRuleId, onClearHighlight]);

  const handleAdd = () => {
    if (!keyword) return;
    onAddRule({ keyword, category });
    setKeyword('');
    setIsAdding(false);
  };

  const density = settings.density || 'Simple';
  const containerPadding = 'pb-4 pt-1';
  const itemPadding = density === 'Compact' ? 'p-2' : 'p-3';

  return (
    <div className={`${containerPadding} space-y-4`}>
      {/* PAGE HEADER - Unified with Ledger design */}
      <div className={`bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-4 rounded-2xl mb-1 shadow-md mx-1 group relative overflow-hidden`}>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Automation Logic</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Engine Config & Schedules</p>
          </div>
          {activeTab === 'mapping' && (
            <button onClick={() => { triggerHaptic(); setIsAdding(true); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all active:scale-95 border border-white/10">
               <Plus size={14} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {highlightRuleId && (
        <div className="mx-1 p-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800 rounded-xl flex items-center gap-3 animate-kick">
           <Info size={14} className="text-indigo-500" />
           <p className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Highlighting the rule matched to your entry</p>
        </div>
      )}

      <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl mx-1">
        <button onClick={() => { triggerHaptic(); setActiveTab('mapping'); }} className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all ${activeTab === 'mapping' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}>Keyword Mapping</button>
        <button onClick={() => { triggerHaptic(); setActiveTab('recurring'); }} className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all ${activeTab === 'recurring' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}>Recurring ({recurringItems.length})</button>
      </div>

      {activeTab === 'mapping' && (
        <>
          {isAdding && (
            <div className="animate-slide-up px-1">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm space-y-4">
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Merchant Keyword (e.g. Uber)" className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-black outline-none border border-transparent focus:border-brand-primary dark:text-white" />
                <div className="grid grid-cols-3 gap-2">
                  {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)} className={`p-2 rounded-xl text-[8px] font-black uppercase border transition-all ${category === cat ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-700'}`}>{cat}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsAdding(false)} className="flex-1 bg-slate-100 dark:bg-slate-900 text-slate-500 font-black py-3 rounded-xl text-[9px] uppercase tracking-widest">Cancel</button>
                  <button onClick={handleAdd} className="flex-[2] bg-brand-primary text-white font-black py-3 rounded-xl text-[9px] uppercase tracking-widest shadow-lg">Save Rule</button>
                </div>
              </div>
            </div>
          )}

          <div className={`px-1 ${density === 'Compact' ? 'space-y-0.5' : 'space-y-1'}`}>
            {rules.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/10 rounded-2xl border border-dashed border-slate-100">
                <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest">No mapping rules</p>
              </div>
            ) : (
              rules.map(rule => (
                <div 
                  key={rule.id} 
                  className={`bg-white dark:bg-slate-800 ${itemPadding} rounded-xl border flex items-center justify-between group transition-all duration-500 ${highlightRuleId === rule.id ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse' : 'border-slate-50 dark:border-slate-800'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`${highlightRuleId === rule.id ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {highlightRuleId === rule.id ? <Zap size={14} className="fill-emerald-500" /> : <Tag size={14} />}
                    </div>
                    <div>
                      <h4 className={`font-black text-slate-900 dark:text-white ${density === 'Compact' ? 'text-[11px]' : 'text-xs'}`}>{rule.keyword}</h4>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[rule.category] }} />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{rule.category}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => onDeleteRule(rule.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'recurring' && (
        <div className={`px-1 ${density === 'Compact' ? 'space-y-0.5' : 'space-y-1'}`}>
          {recurringItems.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/10 rounded-2xl border border-dashed border-slate-100">
              <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest">No recurring nodes</p>
            </div>
          ) : (
            recurringItems.map(item => (
              <div key={item.id} className={`bg-white dark:bg-slate-800 ${itemPadding} rounded-xl border border-slate-50 dark:border-slate-800 flex items-center justify-between group`}>
                <div className="flex items-center gap-3">
                  <Repeat size={14} className="text-blue-500" />
                  <div>
                    <h4 className={`font-black text-slate-900 dark:text-white ${density === 'Compact' ? 'text-[11px]' : 'text-xs'} truncate max-w-[140px]`}>{item.note || item.merchant}</h4>
                    <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Next: {new Date(item.nextDueDate).toLocaleDateString(undefined, {month:'short', day: 'numeric'})}</p>
                  </div>
                </div>
                <button onClick={() => onDeleteRecurring(item.id)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RulesEngine;