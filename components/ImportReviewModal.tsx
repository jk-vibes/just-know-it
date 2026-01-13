
import React, { useState, useMemo } from 'react';
import { X, Check, ArrowDownCircle, ArrowUpCircle, Edit3, Trash2, Save, Wallet, ShieldCheck, RefreshCw } from 'lucide-react';
import { WealthItem, UserSettings } from '../types';
import { getCurrencySymbol } from '../constants';
import { triggerHaptic } from '../utils/haptics';

interface ImportReviewModalProps {
  stagedItems: any[];
  wealthItems: WealthItem[];
  settings: UserSettings;
  onConfirm: (finalItems: any[]) => void;
  onCancel: () => void;
}

const ImportReviewModal: React.FC<ImportReviewModalProps> = ({ stagedItems, wealthItems, settings, onConfirm, onCancel }) => {
  const currencySymbol = getCurrencySymbol(settings.currency);
  
  // Define filtering logic for use both in state initialization and render
  const getLiquidAccounts = (items: WealthItem[]) => 
    items.filter(i => ['Checking Account', 'Savings Account', 'Cash', 'Credit Card'].includes(i.category));

  const liquidAccounts = useMemo(() => getLiquidAccounts(wealthItems), [wealthItems]);

  // Initialize state with auto-mapping heuristics
  // We use wealthItems directly here to avoid TDZ issues with liquidAccounts
  const [items, setItems] = useState(() => {
    const activeLiquidAccounts = getLiquidAccounts(wealthItems);
    
    return stagedItems.map((item, idx) => {
      let targetAccountId = item.entryType === 'Account' ? 'SYSTEM' : (item.targetAccountId || '');
      
      // Auto-mapping heuristics for accounts based on source hints
      if (item.entryType !== 'Account' && !targetAccountId) {
        const hint = (item.accountName || item.merchant || '').toLowerCase();
        const match = activeLiquidAccounts.find(w => 
          w.name.toLowerCase().includes(hint) || hint.includes(w.name.toLowerCase())
        );
        if (match) {
          targetAccountId = match.id;
        } else if (activeLiquidAccounts.length === 1) {
          targetAccountId = activeLiquidAccounts[0].id;
        }
      }

      return { 
        ...item, 
        tempId: idx, 
        action: 'create' as 'create' | 'skip', 
        targetAccountId 
      };
    });
  });

  const handleUpdateItem = (tempId: number, updates: any) => {
    setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, ...updates } : item));
  };

  const handleRemove = (tempId: number) => {
    triggerHaptic();
    setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, action: 'skip' } : item));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] animate-slide-up overflow-hidden border border-white/10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">Audit Ingestion</h3>
            <p className="text-[8px] font-black text-slate-400 uppercase mt-0.5">Validating {items.filter(i => i.action !== 'skip').length} signals</p>
          </div>
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <Check size={10} className="text-indigo-500" />
                <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase">Ready</span>
             </div>
             <button onClick={onCancel} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-transform"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
          {items.map((item) => {
            if (item.action === 'skip') return null;

            return (
              <div key={item.tempId} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm group animate-kick">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-opacity-10 shrink-0 ${
                      item.entryType === 'Expense' ? 'bg-rose-500 text-rose-500' : 
                      item.entryType === 'Income' ? 'bg-emerald-500 text-emerald-500' :
                      item.entryType === 'Account' ? 'bg-blue-500 text-blue-500' : 'bg-indigo-500 text-indigo-500'
                    }`}>
                      {item.entryType === 'Expense' ? <ArrowDownCircle size={16} /> : 
                       item.entryType === 'Income' ? <ArrowUpCircle size={16} /> :
                       item.entryType === 'Account' ? <ShieldCheck size={16} /> : <RefreshCw size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={item.merchant || item.source || item.name || 'General'} 
                          onChange={(e) => handleUpdateItem(item.tempId, { merchant: e.target.value, name: e.target.value })}
                          className="text-[11px] font-black text-slate-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 w-32 p-0 leading-none"
                        />
                        <Edit3 size={8} className="text-slate-300 opacity-0 group-hover:opacity-100" />
                      </div>
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        {item.date} • {item.entryType} {item.wealthCategory ? `(${item.wealthCategory})` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[10px] font-black text-slate-300">{currencySymbol}</span>
                      <input 
                        type="number" 
                        value={item.amount || item.value} 
                        onChange={(e) => handleUpdateItem(item.tempId, { amount: Math.round(parseFloat(e.target.value)), value: Math.round(parseFloat(e.target.value)) })}
                        className="text-[14px] font-black text-slate-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 text-right w-20 p-0 leading-none"
                      />
                    </div>
                  </div>
                </div>

                {item.entryType !== 'Account' && (
                  <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                       <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Wallet size={8} /> Account Binding</span>
                       {item.targetAccountId ? (
                         <span className="text-[7px] font-black text-emerald-500 uppercase bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-1">Mapped</span>
                       ) : (
                         <span className="text-[7px] font-black text-amber-500 uppercase bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/40 flex items-center gap-1">Required</span>
                       )}
                    </div>
                    <select 
                      value={item.targetAccountId}
                      onChange={(e) => handleUpdateItem(item.tempId, { targetAccountId: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none border border-transparent focus:border-indigo-500/30 dark:text-white appearance-none"
                    >
                      <option value="">Select binding account...</option>
                      {liquidAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({currencySymbol}{Math.round(acc.value).toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mt-2 flex justify-end">
                   <button onClick={() => handleRemove(item.tempId)} className="text-slate-300 hover:text-rose-500 transition-colors p-1 active:scale-90"><Trash2 size={12} /></button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button 
            onClick={() => {
              triggerHaptic(20);
              const readyItems = items.filter(i => i.action !== 'skip');
              if (readyItems.some(i => i.entryType !== 'Account' && !i.targetAccountId)) {
                alert("Binding failed. Please map all records to an account.");
                return;
              }
              onConfirm(readyItems);
            }}
            className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] transition-all"
          >
            <Save size={16} /> Authorize Ledger Ingestion
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportReviewModal;
