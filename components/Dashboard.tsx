import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Expense, UserSettings, Category } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { TrendingUp, Sparkles, ArrowUpRight, Wallet, ClipboardPaste, Loader2 } from 'lucide-react';
import { getBudgetInsights } from '../services/geminiService';

interface DashboardProps {
  expenses: Expense[];
  settings: UserSettings;
  onCategorizeClick: () => void;
  onConfirmExpense: (id: string, category: Category) => void;
  onSmartAdd: () => void;
  isProcessingSmartAdd?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ expenses, settings, onCategorizeClick, onConfirmExpense, onSmartAdd, isProcessingSmartAdd }) => {
  const [insights, setInsights] = useState<{ tip: string, impact: string }[] | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const pendingExpenses = expenses.filter(e => !e.isConfirmed);
  const currencySymbol = getCurrencySymbol(settings.currency);
  
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const confirmed = currentMonthExpenses.filter(e => e.isConfirmed);
    const totalsByCat = confirmed.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<Category, number>);

    const limits = {
      Needs: (settings.monthlyIncome * settings.split.Needs) / 100,
      Wants: (settings.monthlyIncome * settings.split.Wants) / 100,
      Savings: (settings.monthlyIncome * settings.split.Savings) / 100,
    };

    const totalSpent = (totalsByCat.Needs || 0) + (totalsByCat.Wants || 0) + (totalsByCat.Savings || 0);

    return { totalsByCat, limits, totalSpent };
  }, [expenses, settings]);

  const chartData = useMemo(() => {
    const data = [
      { name: 'Needs', value: stats.totalsByCat.Needs || 0, color: CATEGORY_COLORS.Needs },
      { name: 'Wants', value: stats.totalsByCat.Wants || 0, color: CATEGORY_COLORS.Wants },
      { name: 'Savings', value: stats.totalsByCat.Savings || 0, color: CATEGORY_COLORS.Savings },
    ].filter(d => d.value > 0);

    return data.length > 0 ? data : [{ name: 'No Data', value: 1, color: '#f1f5f9' }];
  }, [stats]);

  const hasData = chartData[0].name !== 'No Data';

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

  return (
    <div className="pb-32 pt-6 space-y-6 bg-white dark:bg-slate-900 min-h-full">
      {/* Header */}
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
          
          {/* Smart Paste Button */}
          <button 
            onClick={onSmartAdd}
            disabled={isProcessingSmartAdd}
            className="flex items-center gap-2 bg-indigo-600 text-white py-1.5 px-3 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-transform active:scale-95 disabled:opacity-70"
          >
            {isProcessingSmartAdd ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ClipboardPaste size={14} />
            )}
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Magic Paste</span>
          </button>
        </div>
      </div>

      {/* Main Hero Card with Donut Chart */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors">
        <div className="absolute top-6 right-6">
          <div className="bg-[#163074] dark:bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
            <Wallet size={20} strokeWidth={2.5} />
          </div>
        </div>
        
        <div className="relative z-10">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Expenditure</p>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-sm font-black text-slate-900 dark:text-white">{currencySymbol}</span>
            <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.totalSpent.toLocaleString()}</span>
            <span className="text-slate-400 dark:text-slate-500 font-bold text-xs ml-1">/ {currencySymbol}{settings.monthlyIncome.toLocaleString()}</span>
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
                  paddingAngle={hasData ? 5 : 0}
                  dataKey="value"
                  cornerRadius={hasData ? 8 : 0}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                {hasData && <Tooltip 
                  formatter={(value: number) => [`${currencySymbol}${value}`, '']}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    color: '#0f172a'
                  }}
                  itemStyle={{ color: '#0f172a' }}
                />}
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-3xl font-black text-slate-900 dark:text-white">
                 {Math.min(100, Math.round((stats.totalSpent / settings.monthlyIncome) * 100))}%
               </span>
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Spent</span>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-2">
             {(['Needs', 'Wants', 'Savings'] as const).map(cat => (
               <div key={cat} className="flex items-center gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{cat}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Allocation List */}
      <div className="space-y-3">
        {(['Needs', 'Wants', 'Savings'] as Category[]).map((cat) => {
          const spent = stats.totalsByCat[cat] || 0;
          const limit = stats.limits[cat as keyof typeof stats.limits];
          const isOver = spent > limit;
          const perc = Math.min(100, Math.round((spent / limit) * 100));

          return (
            <div key={cat} className="bg-white dark:bg-slate-800 p-4 rounded-[20px] border border-slate-100 dark:border-slate-800 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.02)] flex flex-col gap-3 transition-colors">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md shadow-slate-200 dark:shadow-none" 
                    style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                  >
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm leading-none">{cat}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">Target: {settings.split[cat as keyof typeof settings.split]}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-black ${isOver ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                    {currencySymbol}{spent.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-full overflow-hidden border border-slate-50 dark:border-transparent">
                <div 
                  className="h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ 
                    width: `${perc}%`, 
                    backgroundColor: isOver ? '#ef4444' : CATEGORY_COLORS[cat] 
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Insights */}
      <div className="bg-white dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-800/50 shadow-sm transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-emerald-500" size={16} fill="currentColor" />
          <h3 className="text-xs font-black text-emerald-900 dark:text-white uppercase tracking-wider">Financial Insights</h3>
        </div>
        
        {loadingInsights ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="flex gap-4 items-center animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-white/5"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-2 bg-slate-100 dark:bg-white/10 rounded w-3/4"></div>
                  <div className="h-2 bg-slate-50 dark:bg-white/5 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : insights ? (
          <div className="space-y-4">
            {insights.slice(0, 2).map((insight, idx) => (
              <div key={idx} className="flex gap-4 items-start group">
                <div className="bg-white dark:bg-white/5 p-2 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800 group-hover:scale-105 transition-transform">
                  <ArrowUpRight size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-xs font-bold leading-tight text-slate-800 dark:text-emerald-50">{insight.tip}</p>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400/70 mt-1 block">{insight.impact}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 font-bold text-center py-2 uppercase tracking-widest">Awaiting spending patterns...</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;