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

  const hasData = expenses.length > 0;
  const sectionClass = `glass premium-card p-4 rounded-[32px] mb-3 relative overflow-hidden`;

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
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-5 py-4 rounded-2xl mb-4 mx-1 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="flex justify-between items-center w-full relative z-10">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Dashboard</h1>
            <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Real-time Intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            {user?.accessToken && (
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 backdrop-blur-md">
                <ShieldCheck size={10} className="text-emerald-400" />
                <span className="text-[7px] font-black text-white uppercase tracking-widest">Secured</span>
              </div>
            )}
            <button onClick={() => triggerInsightsFetch(true)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all active:scale-90 border border-white/10">
              {loadingInsights ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
            </button>
          </div>
        </div>
      </div>
      
      <div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <section className={`${sectionClass} border-l-4 border-l-brand-primary !mb-0`}>
            <div className="absolute -right-4 -bottom-4 opacity-5 text-brand-primary transform rotate-12 scale-150"><Flame size={64} /></div>
            <div className="flex items-center gap-1.5 mb-1.5 relative z-10">
               <div className="p-1.5 bg-brand-primary/10 rounded-lg text-brand-primary"><Flame size={12} strokeWidth={3} /></div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Burn Rate</p>
            </div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter relative z-10">{stats.burnDays === Infinity ? '∞' : stats.burnDays} <span className="text-[10px] opacity-40 uppercase font-black">Days</span></h4>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-tight mt-0.5 relative z-10">Neural runway estimate</p>
          </section>
          
          <section className={`${sectionClass} border-l-4 border-l-emerald-500 !mb-0`}>
            <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 transform -rotate-12 scale-150"><Droplets size={64} /></div>
            <div className="flex items-center gap-1.5 mb-1.5 relative z-10">
               <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500"><Droplets size={12} strokeWidth={3} /></div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
            </div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter relative z-10">{stats.savingsRate}% <span className="text-[10px] opacity-40 uppercase font-black">Safety</span></h4>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-tight mt-0.5 relative z-10">Realized retention</p>
          </section>
        </div>

        <section className={`${sectionClass} group`}>
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-end relative z-10">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Net Worth</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                <span className="text-sm opacity-40 mr-1 font-bold">{currencySymbol}</span>
                {Math.round(wealthStats.netWorth).toLocaleString()}
              </h2>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Asset Base</p>
                <p className="text-xs font-black text-emerald-500">+{currencySymbol}{Math.round(wealthStats.assets).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Liability</p>
                <p className="text-xs font-black text-rose-500">-{currencySymbol}{Math.round(wealthStats.liabilities).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-brand-accent/10 rounded-xl text-brand-accent"><CalendarDays size={14} strokeWidth={3} /></div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">YTD Profile Breakdown</h3>
          </div>
          <div className="flex justify-between items-end mb-5">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cumulative Outflow</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                <span className="text-sm opacity-40 mr-1 font-bold">{currencySymbol}</span>
                {ytdStats.total.toLocaleString()}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">30d Velocity Avg</p>
              <p className="text-sm font-black text-slate-600 dark:text-slate-300">{currencySymbol}{ytdStats.monthlyAvg.toLocaleString()}</p>
            </div>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
            {hasData ? (['Needs', 'Wants', 'Savings'] as Category[]).map(cat => {
              const val = ytdStats.byCat[cat] || 0;
              const perc = ytdStats.total > 0 ? (val / ytdStats.total) * 100 : 0;
              return perc > 0 ? (
                <div key={cat} style={{ width: `${perc}%`, backgroundColor: CATEGORY_COLORS[cat] }} className="rounded-full mx-0.5 shadow-sm" />
              ) : null;
            }) : (
              <div className="w-full h-full bg-slate-50 dark:bg-slate-800 rounded-full" />
            )}
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500"><LineChartIcon size={14} strokeWidth={3} /></div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth Momentum</h3>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700">
               <button onClick={() => setTrendChartStyle('grouped')} className={`p-1.5 rounded-lg transition-all ${trendChartStyle === 'grouped' ? 'bg-white dark:bg-slate-600 text-brand-primary shadow-md' : 'text-slate-400'}`}><BarChartIcon size={12} /></button>
               <button onClick={() => setTrendChartStyle('area')} className={`p-1.5 rounded-lg transition-all ${trendChartStyle === 'area' ? 'bg-white dark:bg-slate-600 text-brand-primary shadow-md' : 'text-slate-400'}`}><TrendingUp size={12} /></button>
               <button onClick={() => setTrendChartStyle('stacked')} className={`p-1.5 rounded-lg transition-all ${trendChartStyle === 'stacked' ? 'bg-white dark:bg-slate-600 text-brand-primary shadow-md' : 'text-slate-400'}`}><BarChart2 size={12} /></button>
            </div>
          </div>
          <div className="h-40 w-full">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                {trendChartStyle === 'grouped' ? (
                  <BarChart data={sixMonthTrend} margin={{ top: 5, right: 15, left: -30, bottom: 0 }}>
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{fill: 'rgba(0,0,0,0.02)'}}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '16px', fontSize: '10px', fontWeight: 'bold', backdropFilter: 'blur(8px)' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]}
                    />
                    <Bar dataKey="Needs" fill={CATEGORY_COLORS.Needs} radius={[4, 4, 0, 0]} barSize={8} />
                    <Bar dataKey="Wants" fill={CATEGORY_COLORS.Wants} radius={[4, 4, 0, 0]} barSize={8} />
                    <Bar dataKey="Savings" fill={CATEGORY_COLORS.Savings} radius={[4, 4, 0, 0]} barSize={8} />
                  </BarChart>
                ) : trendChartStyle === 'area' ? (
                  <AreaChart data={sixMonthTrend} margin={{ top: 10, right: 15, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNeeds" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CATEGORY_COLORS.Needs} stopOpacity={0.4}/><stop offset="95%" stopColor={CATEGORY_COLORS.Needs} stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorWants" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CATEGORY_COLORS.Wants} stopOpacity={0.4}/><stop offset="95%" stopColor={CATEGORY_COLORS.Wants} stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CATEGORY_COLORS.Savings} stopOpacity={0.4}/><stop offset="95%" stopColor={CATEGORY_COLORS.Savings} stopOpacity={0}/></linearGradient>
                    </defs>
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '16px', fontSize: '10px', fontWeight: 'bold', backdropFilter: 'blur(8px)' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]}
                    />
                    <Area type="monotone" dataKey="Needs" stackId="1" stroke={CATEGORY_COLORS.Needs} strokeWidth={3} fillOpacity={1} fill="url(#colorNeeds)" />
                    <Area type="monotone" dataKey="Wants" stackId="1" stroke={CATEGORY_COLORS.Wants} strokeWidth={3} fillOpacity={1} fill="url(#colorWants)" />
                    <Area type="monotone" dataKey="Savings" stackId="1" stroke={CATEGORY_COLORS.Savings} strokeWidth={3} fillOpacity={1} fill="url(#colorSavings)" />
                  </AreaChart>
                ) : (
                  <BarChart data={sixMonthTrend} margin={{ top: 5, right: 15, left: -30, bottom: 0 }}>
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{fill: 'rgba(0,0,0,0.02)'}}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '16px', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="Needs" stackId="q" fill={CATEGORY_COLORS.Needs} barSize={16} />
                    <Bar dataKey="Wants" stackId="q" fill={CATEGORY_COLORS.Wants} barSize={16} />
                    <Bar dataKey="Savings" stackId="q" fill={CATEGORY_COLORS.Savings} radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : renderEmptyState()}
          </div>
          {hasData && (
            <div className={`flex justify-between mt-4 px-2`}>
              {sixMonthTrend.map(t => (
                <span key={t.month} className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t.month}</span>
              ))}
            </div>
          )}
        </section>

        <section className={sectionClass}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500"><ArrowLeftRight size={14} strokeWidth={3} /></div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Pulse</h3>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700">
               <button onClick={() => setMomChartStyle('doughnut')} className={`p-1.5 rounded-lg transition-all ${momChartStyle === 'doughnut' ? 'bg-white dark:bg-slate-600 text-brand-primary shadow-sm' : 'text-slate-400'}`}><PieChartIcon size={12} /></button>
               <button onClick={() => setMomChartStyle('comparison')} className={`p-1.5 rounded-lg transition-all ${momChartStyle === 'comparison' ? 'bg-white dark:bg-slate-600 text-brand-primary shadow-md' : 'text-slate-400'}`}><BarChart2 size={12} /></button>
               <button onClick={() => setMomChartStyle('variance')} className={`p-1.5 rounded-lg transition-all ${momChartStyle === 'variance' ? 'bg-white dark:bg-slate-600 text-brand-primary shadow-md' : 'text-slate-400'}`}><Activity size={12} /></button>
            </div>
          </div>
          <div className="h-48 w-full relative">
            {hasData ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  {momChartStyle === 'doughnut' ? (
                    <PieChart>
                      <Pie 
                        data={efficiencyDoughnutData} 
                        cx="50%" cy="50%" 
                        innerRadius={65} outerRadius={85} 
                        paddingAngle={6} dataKey="value" stroke="none"
                        animationBegin={0} animationDuration={1000}
                      >
                        {efficiencyDoughnutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '16px', fontSize: '10px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  ) : momChartStyle === 'comparison' ? (
                    <BarChart data={momData.comparisonView} margin={{ top: 5, right: 5, left: -35, bottom: 0 }}>
                      <XAxis dataKey="category" hide />
                      <YAxis hide />
                      <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{ borderRadius: '16px', fontSize: '10px', border: 'none', background: '#0f172a', color: '#fff' }} />
                      <Bar dataKey="Previous" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={18} />
                      <Bar dataKey="Current" fill="var(--brand-primary)" radius={[6, 6, 0, 0]} barSize={18} />
                    </BarChart>
                  ) : (
                    <BarChart data={momData.varianceView} margin={{ top: 5, right: 5, left: -35, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="category" hide />
                      <YAxis hide />
                      <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                      <Bar dataKey="delta" radius={[6, 6, 6, 6]} barSize={32}>
                        {momData.varianceView.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.delta <= 0 ? '#10b981' : '#f43f5e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
                {momChartStyle === 'doughnut' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className={`text-3xl font-black tracking-tighter ${stats.savingsRate >= 20 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {stats.savingsRate}%
                    </p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] -mt-1">Retention</p>
                  </div>
                )}
              </>
            ) : renderEmptyState()}
          </div>
          
          {hasData && (
            <div className="flex justify-between mt-4 px-2">
              {momChartStyle === 'doughnut' ? (
                <div className="flex justify-center w-full gap-5">
                  {efficiencyDoughnutData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{d.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                momData.comparisonView.map(d => (
                  <div key={d.category} className="flex flex-col items-center">
                     <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: CATEGORY_COLORS[d.category as Category] }} />
                     <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{d.category}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        <section className={sectionClass}>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 pl-1">Tactical Insights Feed</h3>
          <div className="flex overflow-x-auto no-scrollbar gap-3 -mx-2 px-2 pb-2">
            {insights ? insights.map((insight, idx) => (
              <div key={idx} className="flex-none w-[180px] bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-brand-primary/10 rounded-lg text-brand-primary shrink-0"><Sparkles size={14} /></div>
                  <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-snug line-clamp-4">{insight.tip}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">{insight.impact}</span>
                  <ArrowRight size={10} className="text-slate-300" />
                </div>
              </div>
            )) : (
              <div className="w-full text-center py-10">
                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] animate-pulse">Running Financial Audit...</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;