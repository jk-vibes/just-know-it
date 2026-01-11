import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, BarChart, Bar,
  Tooltip, Legend, LineChart, Line, CartesianGrid
} from 'recharts';
import { Expense, UserSettings, Category, Income, WealthItem, UserProfile } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  TrendingUp, Activity, PieChart as PieChartIcon, 
  Sparkles, ShieldCheck, Zap, 
  Loader2, RefreshCcw, 
  Target, BarChart3, ListOrdered, 
  Clock, Flame, Droplets, ArrowRight, CalendarDays,
  LineChart as LineChartIcon, ArrowLeftRight, Layers, BarChart as BarChartIcon,
  ArrowDownCircle, ArrowUpCircle, AlignLeft, BarChart2
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { getBudgetInsights, getExpensesHash } from '../services/geminiService';

interface DashboardProps {
  expenses: Expense[];
  incomes: Income[];
  wealthItems: WealthItem[];
  settings: UserSettings;
  user: UserProfile | null;
  onCategorizeClick: () => void;
  onConfirmExpense: (id: string, category: Category) => void;
  onSmartAdd: () => void;
  viewDate: Date;
  onMonthChange: (direction: number) => void;
  onGoToDate: (year: number, month: number) => void;
  onInsightsReceived?: (insights: { tip: string, impact: string }[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  expenses, incomes, wealthItems, settings, viewDate, onInsightsReceived, user
}) => {
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState<{ tip: string, impact: string }[] | null>(null);
  const [insightError, setInsightError] = useState(false);
  const [trendChartStyle, setTrendChartStyle] = useState<'grouped' | 'area' | 'stacked'>('area');
  const [momChartStyle, setMomChartStyle] = useState<'doughnut' | 'comparison' | 'variance'>('doughnut');
  
  const initialFetchRef = useRef(false);
  const lastHashRef = useRef<string>("");
  const currencySymbol = getCurrencySymbol(settings.currency);

  const triggerInsightsFetch = async (force = false) => {
    if (force) triggerHaptic();
    const currentHash = getExpensesHash(expenses, settings);
    if (!force && currentHash === lastHashRef.current && insights) return;
    setLoadingInsights(true);
    setInsightError(false);
    try {
      const results = await getBudgetInsights(expenses, settings);
      if (results && results.length > 0) {
        setInsights(results);
        lastHashRef.current = currentHash;
        if (onInsightsReceived) onInsightsReceived(results);
      } else { setInsightError(true); }
    } catch (err) { setInsightError(true); }
    finally { setLoadingInsights(false); }
  };

  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      const timer = setTimeout(() => triggerInsightsFetch(), 3000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  const wealthStats = useMemo(() => {
    const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
    const liabilities = wealthItems.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0);
    const liquid = wealthItems.filter(i => ['Checking Account', 'Savings Account', 'Cash'].includes(i.category)).reduce((sum, i) => sum + i.value, 0);
    return { assets: Math.round(assets), liabilities: Math.round(liabilities), netWorth: Math.round(assets - liabilities), liquid: Math.round(liquid) };
  }, [wealthItems]);

  const stats = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const currentExps = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y);
    const spent = currentExps.reduce((sum, e) => sum + e.amount, 0);
    const monthlyIncomes = incomes.filter(i => new Date(i.date).getMonth() === m && new Date(i.date).getFullYear() === y);
    const totalIncome = monthlyIncomes.reduce((sum, i) => sum + i.amount, 0) || settings.monthlyIncome;
    const byCat = currentExps.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {} as Record<Category, number>);
    
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - spent) / totalIncome) * 100) : 0;
    const today = new Date();
    const isCurrentMonth = today.getMonth() === m && today.getFullYear() === y;
    const dayOfMonth = isCurrentMonth ? today.getDate() : new Date(y, m + 1, 0).getDate();
    const dailyAvg = Math.round(spent / dayOfMonth);
    const burnDays = dailyAvg > 0 ? Math.round(wealthStats.liquid / dailyAvg) : Infinity;

    const merchantMap = currentExps.reduce((acc, e) => {
      const name = e.merchant || e.note || 'General';
      acc[name] = (acc[name] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    const topMerchants = (Object.entries(merchantMap) as [string, number][])
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }));

    return { spent: Math.round(spent), income: Math.round(totalIncome), byCat, savingsRate, dailyAvg, burnDays, topMerchants };
  }, [expenses, incomes, settings.monthlyIncome, viewDate, wealthStats.liquid]);

  const ytdStats = useMemo(() => {
    const y = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const ytdExps = expenses.filter(e => {
      const d = new Date(e.date);
      return e.isConfirmed && d.getFullYear() === y && d.getMonth() <= currentMonth;
    });
    
    const total = ytdExps.reduce((sum, e) => sum + e.amount, 0);
    const monthsElapsed = currentMonth + 1;
    const monthlyAvg = Math.round(total / monthsElapsed);
    
    const byCat = ytdExps.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<Category, number>);

    return { total: Math.round(total), monthlyAvg, byCat };
  }, [expenses, viewDate]);

  const sixMonthTrend = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(viewDate.getFullYear(), viewDate.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthExps = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y);
      
      data.push({
        month: d.toLocaleDateString(undefined, { month: 'short' }),
        Needs: Math.round(monthExps.filter(e => e.category === 'Needs').reduce((s, e) => s + e.amount, 0)),
        Wants: Math.round(monthExps.filter(e => e.category === 'Wants').reduce((s, e) => s + e.amount, 0)),
        Savings: Math.round(monthExps.filter(e => e.category === 'Savings').reduce((s, e) => s + e.amount, 0)),
      });
    }
    return data;
  }, [expenses, viewDate]);

  const efficiencyDoughnutData = useMemo(() => {
    const remaining = Math.max(0, stats.income - stats.spent);
    return [
      { name: 'Needs', value: stats.byCat.Needs || 0, color: CATEGORY_COLORS.Needs },
      { name: 'Wants', value: stats.byCat.Wants || 0, color: CATEGORY_COLORS.Wants },
      { name: 'Savings', value: stats.byCat.Savings || 0, color: CATEGORY_COLORS.Savings },
      { name: 'Available', value: remaining, color: settings.theme === 'dark' ? '#1e293b' : '#f1f5f9' },
    ].filter(d => d.value > 0);
  }, [stats, settings.theme]);

  const momData = useMemo(() => {
    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    const curExps = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === currentMonth && new Date(e.date).getFullYear() === currentYear);

    const prevDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();
    const prevExps = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === prevMonth && new Date(e.date).getFullYear() === prevYear);

    const categories: Category[] = ['Needs', 'Wants', 'Savings'];
    
    const comparisonView = categories.map(cat => ({
      category: cat,
      Previous: Math.round(prevExps.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)),
      Current: Math.round(curExps.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0))
    }));

    const varianceView = categories.map(cat => {
      const p = Math.round(prevExps.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0));
      const c = Math.round(curExps.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0));
      const delta = c - p;
      const perc = p > 0 ? Math.round((delta / p) * 100) : (c > 0 ? 100 : 0);
      return {
        category: cat,
        delta,
        perc,
        isPositiveEfficiency: delta <= 0
      };
    });

    return { comparisonView, varianceView };
  }, [expenses, viewDate]);

  const weeklyData = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const currentExps = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y);
    
    const weeks: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    currentExps.forEach(e => {
      const d = new Date(e.date).getDate();
      const w = Math.ceil(d / 7);
      weeks[w] = (weeks[w] || 0) + e.amount;
    });

    return Object.entries(weeks).map(([week, amount]) => ({ week: `W${week}`, amount: Math.round(amount) }));
  }, [expenses, viewDate]);

  const velocityData = useMemo(() => {
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const data = [];
    let cumulativeSpent = 0;
    const dailyIncome = stats.income / daysInMonth;
    for (let i = 1; i <= daysInMonth; i++) {
      const daySpent = expenses.filter(e => e.isConfirmed && new Date(e.date).getDate() === i && new Date(e.date).getMonth() === viewDate.getMonth()).reduce((sum, e) => sum + e.amount, 0);
      cumulativeSpent += daySpent;
      data.push({ day: i, Actual: Math.round(cumulativeSpent), Budget: Math.round(dailyIncome * i) });
    }
    return data;
  }, [expenses, viewDate, stats.income]);

  const pieData = useMemo(() => [
    { name: 'Needs', value: Math.round(stats.byCat.Needs || 0), color: CATEGORY_COLORS.Needs },
    { name: 'Wants', value: Math.round(stats.byCat.Wants || 0), color: CATEGORY_COLORS.Wants },
    { name: 'Savings', value: Math.round(stats.byCat.Savings || 0), color: CATEGORY_COLORS.Savings },
  ].filter(d => d.value > 0), [stats]);

  const hasData = expenses.length > 0;
  const density = settings.density || 'Compact';
  const itemPadding = density === 'Compact' ? 'p-3' : 'p-5';
  const sectionClass = `bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl mb-1 shadow-sm ${itemPadding}`;

  const renderEmptyState = (msg: string = "No Data Point Recorded") => (
    <div className="h-full w-full flex flex-col items-center justify-center py-10">
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl mb-2 text-slate-200">
        <Activity size={24} />
      </div>
      <p className="text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">{msg}</p>
    </div>
  );

  return (
    <div className="pb-1 pt-1">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-4 rounded-2xl mb-1 shadow-md">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Dashboard</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Real-time Intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            {user?.accessToken && (
              <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1.5 rounded-xl border border-white/10 backdrop-blur-md">
                <ShieldCheck size={10} className="text-emerald-400" />
                <span className="text-[7px] font-black text-white uppercase tracking-widest">Secured</span>
              </div>
            )}
            <button onClick={() => { triggerHaptic(); triggerInsightsFetch(true); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all active:scale-90">
              {loadingInsights ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
            </button>
          </div>
        </div>
      </div>
      
      <div>
        <div className="grid grid-cols-2 gap-2 mb-1">
          <section className={`${sectionClass} !mb-0`}>
            <div className="flex items-center gap-1.5 mb-1.5">
               <div className="p-1 bg-brand-primary/10 rounded-lg text-brand-primary"><Flame size={10} /></div>
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Burn Rate</p>
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">{stats.burnDays === Infinity ? '∞' : stats.burnDays} <span className="text-[10px] opacity-40 uppercase">Days</span></h4>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Liquid cash runway</p>
          </section>
          <section className={`${sectionClass} !mb-0`}>
            <div className="flex items-center gap-1.5 mb-1.5">
               <div className="p-1 bg-emerald-500/10 rounded-lg text-emerald-500"><Droplets size={10} /></div>
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">{stats.savingsRate}% <span className="text-[10px] opacity-40 uppercase">Safe</span></h4>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Current Savings Rate</p>
          </section>
        </div>

        <section className={sectionClass}>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Net Worth</p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                <span className="text-sm opacity-40 mr-1">{currencySymbol}</span>
                {Math.round(wealthStats.netWorth).toLocaleString()}
              </h2>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Assets</p>
                <p className="text-xs font-black text-emerald-500">{currencySymbol}{Math.round(wealthStats.assets).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Debts</p>
                <p className="text-xs font-black text-rose-500">{currencySymbol}{Math.round(wealthStats.liabilities).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={12} className="text-brand-accent" />
            <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">YTD Profile</h3>
          </div>
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Cumulative Outflow</p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                <span className="text-sm opacity-40 mr-1">{currencySymbol}</span>
                {ytdStats.total.toLocaleString()}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Monthly Average</p>
              <p className="text-xs font-black text-slate-600 dark:text-slate-400">{currencySymbol}{ytdStats.monthlyAvg.toLocaleString()}</p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
            {hasData ? (['Needs', 'Wants', 'Savings'] as Category[]).map(cat => {
              const val = ytdStats.byCat[cat] || 0;
              const perc = ytdStats.total > 0 ? (val / ytdStats.total) * 100 : 0;
              return perc > 0 ? (
                <div key={cat} style={{ width: `${perc}%`, backgroundColor: CATEGORY_COLORS[cat] }} />
              ) : null;
            }) : (
              <div className="w-full h-full bg-slate-50 dark:bg-slate-800" />
            )}
          </div>
        </section>

        {/* 6-MONTH TREND: Grouped vs Area vs Stacked */}
        <section className={sectionClass}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LineChartIcon size={12} className="text-indigo-500" />
              <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">6-Month Momentum</h3>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg overflow-x-auto no-scrollbar">
               <button onClick={() => { triggerHaptic(); setTrendChartStyle('grouped'); }} className={`p-1 rounded-md transition-all ${trendChartStyle === 'grouped' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}><BarChartIcon size={10} /></button>
               <button onClick={() => { triggerHaptic(); setTrendChartStyle('area'); }} className={`p-1 rounded-md transition-all ${trendChartStyle === 'area' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}><TrendingUp size={10} /></button>
               <button onClick={() => { triggerHaptic(); setTrendChartStyle('stacked'); }} className={`p-1 rounded-md transition-all ${trendChartStyle === 'stacked' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}><BarChart2 size={10} /></button>
            </div>
          </div>
          <div className="h-36 w-full">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                {trendChartStyle === 'grouped' ? (
                  <BarChart data={sixMonthTrend} margin={{ top: 5, right: 15, left: -30, bottom: 0 }}>
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{fill: 'rgba(0,0,0,0.02)'}}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px', fontSize: '9px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]}
                    />
                    <Bar dataKey="Needs" fill={CATEGORY_COLORS.Needs} radius={[4, 4, 0, 0]} barSize={6} />
                    <Bar dataKey="Wants" fill={CATEGORY_COLORS.Wants} radius={[4, 4, 0, 0]} barSize={6} />
                    <Bar dataKey="Savings" fill={CATEGORY_COLORS.Savings} radius={[4, 4, 0, 0]} barSize={6} />
                  </BarChart>
                ) : trendChartStyle === 'area' ? (
                  <AreaChart data={sixMonthTrend} margin={{ top: 10, right: 15, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNeeds" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CATEGORY_COLORS.Needs} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={CATEGORY_COLORS.Needs} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorWants" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CATEGORY_COLORS.Wants} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={CATEGORY_COLORS.Wants} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CATEGORY_COLORS.Savings} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={CATEGORY_COLORS.Savings} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px', fontSize: '9px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]}
                    />
                    <Area type="monotone" dataKey="Needs" stackId="1" stroke={CATEGORY_COLORS.Needs} strokeWidth={2.5} fillOpacity={1} fill="url(#colorNeeds)" />
                    <Area type="monotone" dataKey="Wants" stackId="1" stroke={CATEGORY_COLORS.Wants} strokeWidth={2.5} fillOpacity={1} fill="url(#colorWants)" />
                    <Area type="monotone" dataKey="Savings" stackId="1" stroke={CATEGORY_COLORS.Savings} strokeWidth={2.5} fillOpacity={1} fill="url(#colorSavings)" />
                  </AreaChart>
                ) : (
                  <BarChart data={sixMonthTrend} margin={{ top: 5, right: 15, left: -30, bottom: 0 }}>
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{fill: 'rgba(0,0,0,0.02)'}}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px', fontSize: '9px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]}
                    />
                    <Bar dataKey="Needs" stackId="q" fill={CATEGORY_COLORS.Needs} barSize={12} />
                    <Bar dataKey="Wants" stackId="q" fill={CATEGORY_COLORS.Wants} barSize={12} />
                    <Bar dataKey="Savings" stackId="q" fill={CATEGORY_COLORS.Savings} radius={[4, 4, 0, 0]} barSize={12} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : renderEmptyState()}
          </div>
          {hasData && (
            <div className={`flex justify-between mt-2 px-2`}>
              {sixMonthTrend.map(t => (
                <span key={t.month} className="text-[7px] font-black text-slate-400 uppercase">{t.month}</span>
              ))}
            </div>
          )}
        </section>

        {/* EFFICIENCY PULSE: Doughnut vs Comparison vs Variance */}
        <section className={sectionClass}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={12} className="text-emerald-500" />
              <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Efficiency Pulse</h3>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
               <button onClick={() => { triggerHaptic(); setMomChartStyle('doughnut'); }} className={`p-1 rounded-md transition-all ${momChartStyle === 'doughnut' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}><PieChartIcon size={10} /></button>
               <button onClick={() => { triggerHaptic(); setMomChartStyle('comparison'); }} className={`p-1 rounded-md transition-all ${momChartStyle === 'comparison' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}><BarChart2 size={10} /></button>
               <button onClick={() => { triggerHaptic(); setMomChartStyle('variance'); }} className={`p-1 rounded-md transition-all ${momChartStyle === 'variance' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}><Activity size={10} /></button>
            </div>
          </div>
          <div className="h-44 w-full relative">
            {hasData ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  {momChartStyle === 'doughnut' ? (
                    <PieChart>
                      <Pie 
                        data={efficiencyDoughnutData} 
                        cx="50%" cy="50%" 
                        innerRadius={55} outerRadius={75} 
                        paddingAngle={4} dataKey="value" stroke="none"
                        animationBegin={0} animationDuration={1000}
                      >
                        {efficiencyDoughnutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px', fontSize: '9px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any) => [`${currencySymbol}${value.toLocaleString()}`, 'Value']}
                      />
                    </PieChart>
                  ) : momChartStyle === 'comparison' ? (
                    <BarChart data={momData.comparisonView} margin={{ top: 5, right: 5, left: -35, bottom: 0 }}>
                      <XAxis dataKey="category" hide />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{fill: 'rgba(0,0,0,0.02)'}}
                        contentStyle={{ borderRadius: '12px', fontSize: '9px', border: 'none', background: '#0f172a', color: '#fff' }}
                      />
                      <Bar dataKey="Previous" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={14} />
                      <Bar dataKey="Current" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} barSize={14} />
                    </BarChart>
                  ) : (
                    <BarChart data={momData.varianceView} margin={{ top: 5, right: 5, left: -35, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="category" hide />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{fill: 'rgba(0,0,0,0.02)'}}
                        content={({active, payload}) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-xl">
                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{data.category} Shift</p>
                                <p className={`text-[12px] font-black ${data.delta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {data.delta > 0 ? '+' : ''}{currencySymbol}{data.delta.toLocaleString()}
                                </p>
                                <p className="text-[8px] font-bold text-white/60 uppercase">{data.perc}% variance</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="delta" radius={[4, 4, 4, 4]} barSize={24}>
                        {momData.varianceView.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.delta <= 0 ? '#10b981' : '#f43f5e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
                {momChartStyle === 'doughnut' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className={`text-2xl font-black tracking-tighter ${stats.savingsRate >= 20 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {stats.savingsRate}%
                    </p>
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest -mt-1">Savings</p>
                  </div>
                )}
              </>
            ) : renderEmptyState()}
          </div>
          
          {hasData && (
            <div className="flex justify-between mt-2 px-2">
              {momChartStyle === 'doughnut' ? (
                <div className="flex justify-center w-full gap-4">
                  {efficiencyDoughnutData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                       <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                       <span className="text-[7px] font-black text-slate-400 uppercase">{d.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                momData.comparisonView.map(d => (
                  <div key={d.category} className="flex flex-col items-center">
                     <div className="w-1.5 h-1.5 rounded-full mb-1" style={{ backgroundColor: CATEGORY_COLORS[d.category as Category] }} />
                     <span className="text-[6px] font-black text-slate-400 uppercase">{d.category}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {momChartStyle !== 'doughnut' && (
            <div className="flex justify-center gap-6 mt-4 pt-2 border-t border-slate-50 dark:border-slate-800">
               {momChartStyle === 'comparison' ? (
                 <>
                   <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-slate-300 rounded-sm" /><span className="text-[7px] font-black uppercase text-slate-400">Prev</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-brand-primary rounded-sm" /><span className="text-[7px] font-black uppercase text-brand-primary">This</span></div>
                 </>
               ) : (
                 <>
                   <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-sm" /><span className="text-[7px] font-black uppercase text-emerald-500">Reduction</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-rose-500 rounded-sm" /><span className="text-[7px] font-black uppercase text-rose-500">Increase</span></div>
                 </>
               )}
            </div>
          )}
        </section>

        <section className={sectionClass}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={12} className="text-brand-primary" />
            <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Weekly Momentum</h3>
          </div>
          <div className="h-24 w-full">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -40, bottom: 0 }}>
                  <XAxis dataKey="week" hide />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={({active, payload}) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/90 backdrop-blur px-2 py-1 rounded-lg border border-white/10">
                            <p className="text-[8px] font-black text-white">{payload[0].payload.week}: {currencySymbol}{(payload[0].value as number).toLocaleString()}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="var(--brand-primary)" barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : renderEmptyState()}
          </div>
          {hasData && (
            <div className="flex justify-between mt-2 px-1">
               {weeklyData.map(w => <span key={w.week} className="text-[7px] font-black text-slate-400 uppercase">{w.week}</span>)}
            </div>
          )}
        </section>

        <section className={sectionClass}>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={12} className="text-brand-primary" />
            <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Spend Velocity</h3>
          </div>
          <div className="h-40 w-full">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData} margin={{ top: 0, right: 10, left: -40, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px' }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                  <Area 
                    name="Actual"
                    type="monotone" 
                    dataKey="Actual" 
                    stroke="var(--brand-primary)" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorSpent)" 
                  />
                  <Area 
                    name="Budget"
                    type="monotone" 
                    dataKey="Budget" 
                    stroke="rgba(148, 163, 184, 0.4)" 
                    strokeWidth={1} 
                    strokeDasharray="5 5"
                    fill="transparent" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : renderEmptyState()}
          </div>
        </section>

        <div className="grid grid-cols-5 gap-2 mb-1">
          <section className={`${sectionClass} col-span-2 !mb-0 flex flex-col items-center justify-center`}>
            <div className="h-40 w-full">
              {hasData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={pieData.length > 0 ? pieData : [{name: 'Empty', value: 1, color: '#f1f5f9'}]} 
                      cx="50%" cy="40%" innerRadius={22} outerRadius={32} paddingAngle={2} dataKey="value" stroke="none"
                    >
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Legend 
                      verticalAlign="bottom" 
                      align="center" 
                      iconType="circle"
                      layout="vertical"
                      wrapperStyle={{ fontSize: '7px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : renderEmptyState("No Categories")}
            </div>
          </section>
          <section className={`${sectionClass} col-span-3 !mb-0`}>
            <div className="flex items-center gap-1.5 mb-2.5">
               <ListOrdered size={10} className="text-slate-400" />
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Top Outflows</p>
            </div>
            <div className="space-y-2">
               {stats.topMerchants.length > 0 ? stats.topMerchants.map((m, i) => (
                 <div key={i} className="flex justify-between items-center group">
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[80px] group-hover:text-brand-primary transition-colors">{m.name}</span>
                    <span className="text-[9px] font-black text-slate-900 dark:text-white">{currencySymbol}{m.amount.toLocaleString()}</span>
                 </div>
               )) : (
                 <p className="text-[8px] font-bold text-slate-300 uppercase py-4">No Data Logged</p>
               )}
            </div>
          </section>
        </div>

        <section className={`${sectionClass} mt-1`}>
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Tactical Insights</h3>
          <div className="flex overflow-x-auto no-scrollbar gap-2 -mx-2 px-2 pb-2">
            {insights ? insights.map((insight, idx) => (
              <div key={idx} className="flex-none w-[160px] bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm flex flex-col justify-between h-24">
                <div className="flex items-start gap-2">
                  <Sparkles size={12} className="text-brand-primary shrink-0" />
                  <p className="text-[8px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-3">{insight.tip}</p>
                </div>
                <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded w-fit">{insight.impact}</span>
              </div>
            )) : (
              <div className="w-full text-center py-6">
                 <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Scanning Financial History...</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;