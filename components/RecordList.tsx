
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Expense, Income, Category, UserSettings } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { Filter, Trash2, Search, X, Sparkles, ClipboardPaste, MessageSquare, Loader2, ArrowUpCircle, Landmark, ArrowDownCircle, Plus, Edit2, Check } from 'lucide-react';
import { parseBulkTransactions } from '../services/geminiService';

interface RecordListProps {
  expenses: Expense[];
  incomes: Income[];
  settings: UserSettings;
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  onConfirm: (id: string, category: Category) => void;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  onEditRecord: (record: Expense | Income) => void;
  onAddBulk: (expenses: Omit<Expense, 'id'>[]) => void;
}

interface SwipeableItemProps {
  item: Expense | Income;
  isIncome: boolean;
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (item: Expense | Income) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  suggestions?: string[];
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({ item, isIncome, currencySymbol, onDelete, onEdit, onUpdateExpense, suggestions = [] }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingSub, setIsEditingSub] = useState(false);
  const [newSub, setNewSub] = useState('');
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting || isEditingSub) return;
    if (e.touches.length > 0) {
      touchStartX.current = e.touches[0].clientX;
      setIsSwiping(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting || touchStartX.current === null || e.touches.length === 0 || isEditingSub) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    if (diff < 0) setOffsetX(diff);
  };

  const handleTouchEnd = () => {
    if (isDeleting || isEditingSub) return;
    if (offsetX < -75) {
      triggerDelete();
    } else {
      setOffsetX(0);
    }
    setIsSwiping(false);
    touchStartX.current = null;
  };

  const triggerDelete = () => {
    setOffsetX(-1000);
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(item.id);
    }, 300);
  };

  const handleSaveSub = (val: string) => {
    if (!isIncome && onUpdateExpense) {
      onUpdateExpense(item.id, { subCategory: val || 'General' });
    }
    setIsEditingSub(false);
  };

  const amount = item.amount;
  const dateStr = new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const label = isIncome ? (item as Income).type : (item as Expense).category;
  const subLabel = !isIncome ? (item as Expense).subCategory : null;
  const note = item.note || (isIncome ? 'Income Source' : 'General Expense');

  return (
    <div className={`relative overflow-hidden rounded-2xl group select-none transition-all duration-300 ease-out ${isDeleting ? 'max-h-0 opacity-0 mb-0 scale-95' : 'max-h-40 opacity-100 mb-2 scale-100'} animate-slide-up`}>
      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end px-5 rounded-2xl">
        <Trash2 className="text-white animate-pulse" size={20} />
      </div>

      <div 
        className={`bg-white dark:bg-slate-800 p-2 rounded-2xl border shadow-[0_1px_4px_-1px_rgba(0,0,0,0.02)] relative z-10 transition-transform ${isIncome ? 'border-indigo-100 dark:border-indigo-900/30' : 'border-slate-100 dark:border-slate-800'}`}
        style={{ 
          transform: `translateX(${offsetX}px)`, 
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-[10px] shadow-sm transition-transform group-hover:scale-105`}
              style={{ backgroundColor: isIncome ? '#4f46e5' : CATEGORY_COLORS[(item as Expense).category] }}
            >
              {isIncome ? <Landmark size={14} /> : label[0]}
            </div>
            <div className="min-w-0">
              <h4 className="font-black text-slate-900 dark:text-white text-xs leading-tight truncate max-w-[120px]">{note}</h4>
              <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-tight">
                {dateStr}
                {!isIncome && !(item as Expense).isConfirmed && <span className="text-amber-500 font-black animate-pulse">• Pending</span>}
                {isIncome && <span className="text-indigo-500 font-black tracking-widest">• Inflow</span>}
              </div>
            </div>
          </div>
          <div className="text-right flex items-center gap-2">
            <div className="flex flex-col items-end">
              <p className={`font-black text-sm ${isIncome ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                {isIncome ? '+' : '-'}{currencySymbol}{amount.toLocaleString()}
              </p>
              <p className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">{label}</p>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                className="p-1.5 text-slate-300 hover:text-indigo-500 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100 hidden sm:block"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); triggerDelete(); }}
                className="p-1.5 text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 hidden sm:block"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Sub-category area */}
        {!isIncome && (
          <div className="mt-2 pl-12 pr-2">
            {isEditingSub ? (
              <div className="space-y-2 animate-kick">
                <div className="flex gap-2">
                  <input 
                    autoFocus
                    type="text"
                    value={newSub}
                    onChange={(e) => setNewSub(e.target.value)}
                    placeholder="New Sub Category..."
                    className="flex-1 bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-slate-700 outline-none focus:border-indigo-500 dark:text-white"
                  />
                  <button 
                    onClick={() => handleSaveSub(newSub)}
                    className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-sm active:scale-95"
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <button 
                    onClick={() => setIsEditingSub(false)}
                    className="bg-slate-100 dark:bg-slate-700 text-slate-400 p-1.5 rounded-lg active:scale-95"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>
                {suggestions.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {suggestions.map(s => (
                      <button 
                        key={s}
                        onClick={() => handleSaveSub(s)}
                        className="whitespace-nowrap bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50 active:scale-95"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => {
                    setNewSub(subLabel || '');
                    setIsEditingSub(true);
                  }}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-all group/sub"
                >
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${subLabel ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50' : 'text-slate-300 dark:text-slate-600 border border-dashed border-slate-200 dark:border-slate-700'}`}>
                    {subLabel || 'Add Sub Category'}
                  </span>
                  <Edit2 size={8} className="text-slate-300 opacity-0 group-hover/sub:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => onEdit(item)}
                  className="p-1 text-indigo-500 sm:hidden"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {isIncome && (
          <div className="mt-1 pl-12 flex justify-end pr-2">
            <button 
              onClick={() => onEdit(item)}
              className="p-1 text-indigo-500 sm:hidden flex items-center gap-1"
            >
              <span className="text-[9px] font-black uppercase tracking-widest">Edit</span>
              <Edit2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const RecordList: React.FC<RecordListProps> = ({ expenses, incomes, settings, onDeleteExpense, onDeleteIncome, onConfirm, onUpdateExpense, onEditRecord, onAddBulk }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const currencySymbol = getCurrencySymbol(settings.currency);

  const subCategorySuggestions = useMemo(() => {
    const suggestions: Record<string, Set<string>> = {};
    expenses.forEach(e => {
      if (e.subCategory && e.subCategory !== 'General') {
        if (!suggestions[e.category]) suggestions[e.category] = new Set();
        suggestions[e.category].add(e.subCategory);
      }
    });
    const final: Record<string, string[]> = {};
    Object.keys(suggestions).forEach(cat => {
      final[cat] = Array.from(suggestions[cat]).slice(0, 5);
    });
    return final;
  }, [expenses]);

  const combinedRecords = useMemo(() => {
    const exps = expenses.map(e => ({ ...e, recordType: 'expense' as const }));
    const incs = incomes.map(i => ({ ...i, recordType: 'income' as const }));
    const all = [...exps, ...incs] as ( (Expense & { recordType: 'expense' }) | (Income & { recordType: 'income' }) )[];
    
    return all.filter(rec => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      const note = (rec.note || '').toLowerCase();
      const amount = rec.amount.toString();
      const catOrType = rec.recordType === 'expense' ? (rec as Expense).category.toLowerCase() : (rec as Income).type.toLowerCase();
      const subCat = rec.recordType === 'expense' ? (rec as Expense).subCategory?.toLowerCase() || '' : '';
      return note.includes(query) || amount.includes(query) || catOrType.includes(query) || subCat.includes(query);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, incomes, searchQuery]);

  const handleBulkImport = async () => {
    if (!importText.trim()) return;
    setIsAnalyzing(true);
    const results = await parseBulkTransactions(importText, settings.currency);
    setIsAnalyzing(false);
    if (results && results.length > 0) {
      onAddBulk(results);
      setImportText('');
      setShowImportModal(false);
    }
  };

  return (
    <div className="pb-32 pt-2 min-h-full">
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-2 -mx-4 px-4 mb-2 flex gap-2 transition-colors">
        <div className="relative group flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all records..."
            className="w-full bg-slate-100 dark:bg-slate-800 pl-10 pr-10 py-3 rounded-2xl text-sm font-bold outline-none border border-transparent focus:border-slate-200 dark:focus:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 transition-all shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500"><X size={12} /></button>
          )}
        </div>
        <button onClick={() => setShowImportModal(true)} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg transition-transform active:scale-95"><Sparkles size={20} /></button>
      </div>

      <div className="space-y-0">
        {combinedRecords.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800/50 rounded-[24px] border-2 border-dashed border-slate-100 dark:border-slate-800 transition-colors">
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No matching records</p>
          </div>
        ) : (
          combinedRecords.map((rec) => (
            <SwipeableItem 
              key={rec.id} 
              item={rec} 
              isIncome={rec.recordType === 'income'} 
              currencySymbol={currencySymbol} 
              onDelete={rec.recordType === 'income' ? onDeleteIncome : onDeleteExpense} 
              onEdit={onEditRecord}
              onUpdateExpense={onUpdateExpense}
              suggestions={rec.recordType === 'expense' ? subCategorySuggestions[(rec as Expense).category] : []}
            />
          ))
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[32px] animate-slide-up shadow-2xl p-1">
             <div className="flex justify-between items-center px-6 py-4 border-b dark:border-slate-800">
               <h3 className="text-sm font-black dark:text-white uppercase tracking-wider">Import Records</h3>
               <button onClick={() => setShowImportModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"><X size={16} /></button>
             </div>
             <div className="p-6 space-y-4">
               <textarea
                 value={importText}
                 onChange={(e) => setImportText(e.target.value)}
                 placeholder="Paste SMS/text logs here..."
                 className="w-full h-40 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-xs font-medium dark:text-white resize-none outline-none border dark:border-slate-700"
               />
               <button
                 onClick={handleBulkImport}
                 disabled={!importText || isAnalyzing}
                 className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-xs"
               >
                 {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                 {isAnalyzing ? 'Analyzing...' : 'Process Import'}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordList;
