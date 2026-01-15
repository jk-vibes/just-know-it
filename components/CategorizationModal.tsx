import React, { useState, useEffect } from 'react';
import { Expense, Category, UserSettings } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { Check, ArrowRight, Smartphone, Building2, Sparkles, Loader2, BrainCircuit, Zap } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { auditTransaction } from '../services/geminiService';

interface CategorizationModalProps {
  settings: UserSettings;
  expenses: Expense[];
  onConfirm: (id: string, category: Category) => void;
  onClose: () => void;
}

const CategorizationModal: React.FC<CategorizationModalProps> = ({ settings, expenses, onConfirm, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ suggestedCategory: string, insight: string } | null>(null);
  
  const current = expenses[currentIndex];
  const currencySymbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    const getSuggestion = async () => {
      if (!current) return;
      
      setIsAnalyzing(true);
      setAiSuggestion(null);
      
      try {
        const result = await auditTransaction(current, settings.currency);
        if (result) {
          setAiSuggestion({
            suggestedCategory: result.suggestedCategory,
            insight: result.insight
          });
        }
      } catch (e) {
        console.error("AI Categorization failed", e);
      } finally {
        setIsAnalyzing(false);
      }
    };

    getSuggestion();
  }, [current, settings.currency]);

  const handleSelection = (cat: Category) => {
    triggerHaptic();
    onConfirm(current.id, cat);
    setCurrentIndex(currentIndex + 1);
  };

  const handleApplySuggestion = () => {
    if (aiSuggestion) {
      handleSelection(aiSuggestion.suggestedCategory as Category);
    }
  };

  if (!current) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[70] flex flex-col items-center justify-center p-6 text-center animate-slide-up">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-[32px] flex items-center justify-center mb-6">
          <Check size={40} strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-extrabold mb-2 text-slate-900 dark:text-white">All Clear!</h2>
        <p className="text-slate-500 text-sm mb-8 max-w-[240px]">Your registry is fully audited and up to date.</p>
        <button 
          onClick={() => { triggerHaptic(); onClose(); }}
          className="w-full max-w-xs bg-brand-primary text-white font-black py-4 rounded-[24px] shadow-xl active:scale-95 transition-transform uppercase tracking-widest text-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[70] flex flex-col animate-slide-up overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
        <div className="flex items-center gap-2">
          <div className="bg-brand-primary text-white p-1.5 rounded-lg shadow-sm">
            <BrainCircuit size={16} />
          </div>
          <span className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-[0.2em]">Neural Audit</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black text-brand-primary text-[10px] tracking-widest">{currentIndex + 1} OF {expenses.length}</span>
          <button onClick={onClose} className="p-1.5 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500 active:scale-90">
             <X size={14} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="bg-slate-50 dark:bg-slate-800 w-24 h-24 rounded-[36px] flex items-center justify-center text-slate-200 dark:text-slate-700 mb-8 border border-slate-100 dark:border-slate-700 shadow-inner group">
          <Building2 size={40} className="group-hover:scale-110 transition-transform duration-500" />
        </div>
        
        <div className="text-center space-y-1 mb-8">
          <h3 className="text-slate-400 font-black uppercase tracking-[0.3em] text-[8px]">Transaction Source</h3>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{current.merchant || 'Unidentified'}</h2>
          <div className="text-5xl font-black text-slate-900 dark:text-white mt-4 tracking-tighter">
            <span className="text-xl opacity-30 mr-1">{currencySymbol}</span>
            {Math.round(current.amount).toLocaleString()}
          </div>
        </div>

        {/* AI Suggestion Box */}
        <div className="w-full max-w-sm mb-8">
          <div className="bg-indigo-600 rounded-3xl p-6 shadow-2xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-white group-hover:scale-110 transition-transform">
              <Sparkles size={64} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-white/20 p-1.5 rounded-lg text-white backdrop-blur-md">
                   <Zap size={14} fill="currentColor" />
                </div>
                <span className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em]">Neural Intelligence</span>
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center py-4 gap-3">
                   <Loader2 size={24} className="animate-spin text-white/50" />
                   <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest animate-pulse">Consulting Knowledge Base...</p>
                </div>
              ) : aiSuggestion ? (
                <div className="animate-kick">
                  <p className="text-white text-sm font-bold leading-snug mb-4">
                    Based on semantic history, this should be marked as <span className="underline decoration-indigo-300 underline-offset-4">{aiSuggestion.suggestedCategory}</span>.
                  </p>
                  <button 
                    onClick={handleApplySuggestion}
                    className="w-full bg-white text-indigo-700 font-black py-3.5 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-[11px] uppercase tracking-widest"
                  >
                    Apply Suggestion <Check size={16} strokeWidth={4} />
                  </button>
                </div>
              ) : (
                <p className="text-white/60 text-[10px] font-bold text-center py-4 uppercase tracking-widest">Awaiting Insight...</p>
              )}
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-2">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] text-center mb-4">Manual Override</p>
          <div className="grid grid-cols-3 gap-2">
            {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
              <button
                key={cat}
                onClick={() => handleSelection(cat)}
                className="flex flex-col items-center justify-center py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm active:scale-95 transition-all group"
              >
                <div className="w-2.5 h-2.5 rounded-full mb-2 shadow-sm" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                <span className="font-black text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-widest group-hover:text-brand-primary">{cat}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
        <button 
          onClick={() => { triggerHaptic(); onClose(); }}
          className="w-full text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-slate-600 py-3 active:scale-95 transition-all"
        >
          Postpone Audit
        </button>
      </div>
    </div>
  );
};

const X = ({ size, strokeWidth }: { size: number, strokeWidth: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default CategorizationModal;