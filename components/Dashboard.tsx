
import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Expense, UserSettings, Category, Income, AppTheme } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { TrendingUp, Sparkles, ArrowUpRight, Wallet, ClipboardPaste, Loader2, Landmark, Shield } from 'lucide-react';
import { getBudgetInsights } from '../services/geminiService';

interface DashboardProps {
  expenses: Expense[];
  incomes: Income[];
  settings: UserSettings;
  onCategorizeClick: () => void;
  onConfirmExpense: (id: string, category: Category) => void;
  onSmartAdd: () => void;
  isProcessingSmartAdd?: boolean;
  onUpdateTheme: (theme: AppTheme) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ expenses, incomes, settings, onCategorizeClick, onConfirmExpense, onSmartAdd, isProcessingSmartAdd, onUpdateTheme }) => {
  const [insights, setInsights] = useState<{ tip: string, impact: string }[] | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const pendingExpenses = expenses.filter(e => !e.isConfirmed);
  const currencySymbol = getCurrencySymbol(settings.currency);
  
  const stats = useMemo(() => {
    const now = new Date();
    const confirmed = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === now.getMonth());
    const totalsByCat = confirmed.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<Category, number>);

    const realizedIncome = settings.monthlyIncome;
    const limits = {
      Needs: (realizedIncome * settings.split.Needs) / 100,
      Wants: (realizedIncome * settings.split.Wants) / 100,
      Savings: (realizedIncome * settings.split.Savings) / 100,
    };
    const totalSpent = (totalsByCat.Needs || 0) + (totalsByCat.Wants || 0) + (totalsByCat.Savings || 0);
    return { totalsByCat, limits, totalSpent, realizedIncome };
  }, [expenses, settings]);

  const chartData = useMemo(() => {
    const data = [
      { name: 'Needs', value: stats.totalsByCat.Needs || 0, color: CATEGORY_COLORS.Needs },
      { name: 'Wants', value: stats.totalsByCat.Wants || 0, color: CATEGORY_COLORS.Wants },
      { name: 'Savings', value: stats.totalsByCat.Savings || 0, color: CATEGORY_COLORS.Savings },
    ].filter(d => d.value > 0);
    return data.length > 0 ? data : [{ name: 'No Data', value: 1, color: '#f1f5f9' }];
  }, [stats]);

  useEffect(() => {
    async function loadInsights() {
      if (expenses.length > 1 && !insights) {
        setLoadingInsights(true);
        const data = await getBudgetInsights(expenses, settings);
        setInsights(data);
        setLoadingInsights(false);
      }
    }
    loadInsights();
  }, [expenses, settings, insights]);

  const themes: { id: AppTheme, label: string, icon: React.ReactNode }[] = [
    { 
      id: 'Standard', 
      label: 'Standard', 
      icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="4" /></svg> 
    },
    { 
      id: 'Spiderman', 
      label: 'Spidey', 
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 2L4.5 9V15L12 22L19.5 15V9L12 2ZM12 4.5L17.5 9.5H15L12 6.5L9 9.5H6.5L12 4.5ZM7 11V13.5L12 18.5L17 13.5V11H7Z" />
        </svg>
      ) 
    },
    { 
      id: 'CaptainAmerica', 
      label: 'Cap', 
      icon: <Shield size={18} strokeWidth={2.5} /> 
    },
    { 
      id: 'Naruto', 
      label: 'Naruto', 
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 12C12 12 15 11 15 8C15 5 12 5 12 5C12 5 9 5 9 8C9 11 12 12 12 12Z" />
          <path d="M12 12C12 12 11 15 8 15C5 15 5 12 5 12C5 12 5 9 8 9C11 9 12 12 12 12Z" />
        </svg>
      ) 
    }
  ];

  return (
    <div className="pb-32 pt-6 space-y-6 bg-white dark:bg-slate-900 min-h-full">
      {/* Theme Selector */}
      <div className="bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-2xl flex gap-1 border border-slate-100 dark:border-slate-800">
        {themes.map(t => (
          <button
            key={t.id}
            onClick={() => onUpdateTheme(t.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
              settings.appTheme === t.id 
                ? 'bg-brand-primary text-white shadow-md scale-[1.02]' 
                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
            }`}
          >
            {t.icon}
            <span className="text-[8px] font-black uppercase tracking-widest">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Finance Summary</p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Overview</h2>
        </div>
        <div className="flex items-center gap-2">
          {pendingExpenses.length > 0 && (
            <button 
              onClick={onCategorizeClick}
              className="flex items-center gap-2 bg-white dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 py-1.5 px-3 rounded-xl border border-emerald-100 dark:border-emerald-800/50 shadow-sm animate-pulse"
            >
              <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></div>
              <span className="text-[10px] font-black uppercase tracking-wider">{pendingExpenses.length} Alerts</span>
            </button>
          )}
          <button 
            onClick={onSmartAdd}
            disabled={isProcessingSmartAdd}
            className="flex items-center gap-2 bg-brand-primary text-white py-1.5 px-3 rounded-xl shadow-md transition-transform active:scale-95 disabled:opacity-70"
          >
            {isProcessingSmartAdd ? <Loader2 size={14} className="animate-spin" /> : <ClipboardPaste size={14} />}
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Magic Paste</span>
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl transition-colors">
        <div className="absolute top-6 right-6">
          <div className="bg-brand-primary text-white p-3 rounded-2xl shadow-lg transition-colors">
            <Wallet size={20} strokeWidth={2.5} />
          </div>
        </div>
        
        <div className="relative z-10">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Current Balance</p>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-sm font-black text-slate-900 dark:text-white">{currencySymbol}</span>
            <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter transition-all">
              {(stats.realizedIncome - stats.totalSpent).toLocaleString()}
            </span>
          </div>

          <div className="h-64 w-full relative -my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  cornerRadius={8}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-3xl font-black text-slate-900 dark:text-white">
                 {Math.min(100, Math.round((stats.totalSpent / stats.realizedIncome) * 100))}%
               </span>
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Spent</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {(['Needs', 'Wants', 'Savings'] as Category[]).map((cat) => {
          const spent = stats.totalsByCat[cat] || 0;
          const limit = stats.limits[cat as keyof typeof stats.limits];
          const isOver = spent > limit;
          const perc = Math.min(100, Math.round((spent / limit) * 100));

          return (
            <div key={cat} className="bg-white dark:bg-slate-800 p-4 rounded-[20px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white" 
                    style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                  >
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm leading-none">{cat}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">Goal: {currencySymbol}{Math.round(limit).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-black ${isOver ? 'text-brand-accent' : 'text-slate-900 dark:text-white'}`}>
                    {currencySymbol}{spent.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${perc}%`, backgroundColor: isOver ? 'var(--brand-accent)' : CATEGORY_COLORS[cat] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
