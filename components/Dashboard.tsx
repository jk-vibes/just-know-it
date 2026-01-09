
import React, { useMemo, useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  BarChart, Bar
} from 'recharts';
import { Expense, UserSettings, Category, Income, WealthItem, UserProfile } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  TrendingUp, Wallet, Loader2, Activity, PieChart as PieChartIcon, 
  Sparkles, BrainCircuit, ShieldCheck, Target, Zap, CreditCard,
  Briefcase, BarChart3, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { getBudgetInsights, getDecisionAdvice } from '../services/geminiService';

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
  expenses, incomes, wealthItems, settings, viewDate, onMonthChange, onInsightsReceived
}) => {
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState<{ tip: string, impact: string }[] | null>(null);
  const [decisionType, setDecisionType] = useState<'Vacation' | 'BigPurchase'>('Vacation');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [isConsultingAI, setIsConsultingAI] = useState(false);
  const [decisionAdvice, setDecisionAdvice] = useState<any | null>(null);

  const currencySymbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoadingInsights(true);
      try {
        const results = await getBudgetInsights(expenses, settings);
        if (results) {
          setInsights(results);
          if (onInsightsReceived) onInsightsReceived(results);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard insights", err);
      } finally {
        setLoadingInsights(false);
      }
    };
    fetchInsights();
  }, [expenses, settings, onInsightsReceived]);
  
  const wealthStats = useMemo(() => {
    const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
    const liabilities = wealthItems.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0);
    return { assets, liabilities, netWorth: assets - liabilities };
  }, [wealthItems]);

  const stats = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    
    // Get last month context
    const lastM = m === 0 ? 11 : m - 1;
    const lastY = m === 0 ? y - 1 : y;

    const currentExps = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y);
    const lastMonthExps = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === lastM && new Date(e.date).getFullYear() === lastY);

    const spent = currentExps.reduce((sum, e) => sum + e.amount, 0);
    const lastSpent = lastMonthExps.reduce((sum, e) => sum + e.amount, 0);
    
    const income = incomes.filter(i => new Date(i.date).getMonth() === m && new Date(i.date).getFullYear() === y)
                          .reduce((sum, i) => sum + i.amount, 0) || settings.monthlyIncome;
    
    const byCat = currentExps.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<Category, number>);

    // Variance percentage
    const variance = lastSpent > 0 ? ((spent - lastSpent) / lastSpent) * 100 : 0;

    return { spent, lastSpent, income, byCat, variance };
  }, [expenses, incomes, settings.monthlyIncome, viewDate]);

  const velocityData = useMemo(() => {
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const data = [];
    let cumulativeSpent = 0;
    const dailyIncome = stats.income / daysInMonth;

    for (let i = 1; i <= daysInMonth; i++) {
      const daySpent = expenses
        .filter(e => e.isConfirmed && new Date(e.date).getDate() === i && new Date(e.date).getMonth() === viewDate.getMonth())
        .reduce((sum, e) => sum + e.amount, 0);
      
      cumulativeSpent += daySpent;
      data.push({
        day: i,
        spent: cumulativeSpent,
        budget: dailyIncome * i,
      });
    }
    return data;
  }, [expenses, viewDate, stats.income]);

  const comparisonData = [
    { name: 'Last Month', amount: stats.lastSpent, fill: '#cbd5e1' },
    { name: 'This Month', amount: stats.spent, fill: 'var(--brand-primary)' }
  ];

  const handleConsultAI = async () => {
    if (!estimatedCost || isConsultingAI) return;
    setIsConsultingAI(true);
    const advice = await getDecisionAdvice(expenses, settings, decisionType, parseFloat(estimatedCost));
    setDecisionAdvice(advice);
    setIsConsultingAI(false);
  };

  const pieData = useMemo(() => [
    { name: 'Needs', value: stats.byCat.Needs || 0, color: CATEGORY_COLORS.Needs },
    { name: 'Wants', value: stats.byCat.Wants || 0, color: CATEGORY_COLORS.Wants },
    { name: 'Savings', value: stats.byCat.Savings || 0, color: CATEGORY_COLORS.Savings },
  ].filter(d => d.value > 0), [stats]);

  return (
    <div className="pb-32 pt-2 space-y-4">
      
      {/* 1. PREMIUM NET WORTH CARD */}
      <div className="relative group px-0">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-brand-accent to-purple-600 rounded-2xl blur-3xl opacity-20 transition-opacity duration-700"></div>
        <div className="relative bg-slate-900 dark:bg-slate-950 p-4 rounded-2xl shadow-xl overflow-hidden border border-white/10">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-brand-primary/10 rounded-full blur-[100px] animate-pulse-slow"></div>
          
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-2xl border border-white/20 text-brand-accent">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Portfolio Net Worth</p>
                  <h2 className="text-3xl font-black text-white tracking-tighter flex items-baseline gap-1">
                    <span className="text-lg text-brand-primary/80">{currencySymbol}</span>
                    {wealthStats.netWorth.toLocaleString()}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <TrendingUp size={10} className="text-emerald-400" />
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Growth</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase size={12} className="text-emerald-400" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Assets</span>
                </div>
                <p className="text-base font-black text-white">{currencySymbol}{wealthStats.assets.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard size={12} className="text-rose-500" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Debts</span>
                </div>
                <p className="text-base font-black text-white">{currencySymbol}{wealthStats.liabilities.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CASH FLOW VELOCITY & COMPARISON */}
      <div className="grid grid-cols-1 gap-4">
        {/* Burn Velocity */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-md space-y-4">
          <div className="flex justify-between items-center px-1">
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Burn Velocity</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Trajectory vs income</p>
            </div>
            <div className="p-2 bg-brand-primary/10 dark:bg-brand-primary/20 rounded-xl text-brand-primary">
              <Activity size={16} />
            </div>
          </div>
          
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 800, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 800, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)', padding: '10px', fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.95)' }}
                  labelStyle={{ color: 'var(--brand-secondary)', marginBottom: '4px', fontSize: '10px' }}
                  itemStyle={{ fontSize: '9px' }}
                />
                <Area type="monotone" dataKey="spent" stroke="var(--brand-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorSpent)" animationDuration={1800} />
                <Area type="monotone" dataKey="budget" stroke="#e2e8f0" strokeDasharray="6 6" fillOpacity={0} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm text-brand-primary">
                <Target size={14} />
              </div>
              <div>
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Target</p>
                <p className="text-[11px] font-black text-slate-900 dark:text-white">{currencySymbol}{stats.income.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-emerald-900/20 flex items-center justify-center shadow-sm text-emerald-500">
                <Zap size={14} />
              </div>
              <div>
                <p className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">Safe</p>
                <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">{currencySymbol}{(stats.income - stats.spent).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Month Comparison Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-md space-y-4">
          <div className="flex justify-between items-center px-1">
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Benchmark</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">vs previous month</p>
            </div>
            <div className={`px-2 py-1 rounded-lg flex items-center gap-1 ${stats.variance <= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}>
              {stats.variance <= 0 ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
              <span className="text-[10px] font-black">{Math.abs(Math.round(stats.variance))}%</span>
            </div>
          </div>

          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 800, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 800, fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)', padding: '10px', fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.95)' }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={32}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-between items-center px-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
             <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Difference</span>
                <span className={`text-xs font-black ${stats.spent < stats.lastSpent ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                  {currencySymbol}{Math.abs(stats.spent - stats.lastSpent).toLocaleString()}
                </span>
             </div>
             <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-brand-primary">
                <BarChart3 size={14} />
             </div>
          </div>
        </div>
      </div>

      {/* 3. ALLOCATION & AI LAB */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Allocation Donut */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-md flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-3 px-1">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Allocation</h3>
            <div className="p-1.5 bg-brand-accent/10 rounded-lg text-brand-accent">
              <PieChartIcon size={14} />
            </div>
          </div>
          
          <div className="h-40 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData.length > 0 ? pieData : [{name: 'Empty', value: 1, color: '#f1f5f9'}]} 
                  cx="50%" cy="50%" 
                  innerRadius={50} outerRadius={65} 
                  paddingAngle={8} dataKey="value" 
                  cornerRadius={6} stroke="none"
                >
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {Math.round((stats.spent / (stats.income || 1)) * 100)}%
              </span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Use</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 w-full mt-4 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
            {['Needs', 'Wants', 'Savings'].map(cat => (
              <div key={cat} className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full mb-1 shadow-sm" style={{ backgroundColor: CATEGORY_COLORS[cat as Category] }} />
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{cat}</span>
                <span className="text-[9px] font-black text-slate-900 dark:text-white">{currencySymbol}{Math.round(stats.byCat[cat as Category] || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Decision Lab */}
        <div className="bg-gradient-to-br from-[#2563eb] via-[#8b5cf6] to-[#d946ef] p-4 rounded-2xl shadow-xl relative overflow-hidden text-white group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-3xl border border-white/30 shadow-xl">
                <Zap size={18} className="text-yellow-300 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest leading-none">Decision Hub</h3>
                <p className="text-[7px] font-bold text-white/70 uppercase tracking-[0.2em] mt-1">AI-Driven Path</p>
              </div>
            </div>

            {!decisionAdvice ? (
              <div className="space-y-3">
                <div className="flex bg-white/10 p-1 rounded-xl border border-white/20 backdrop-blur-2xl">
                  <button onClick={() => setDecisionType('Vacation')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${decisionType === 'Vacation' ? 'bg-white text-indigo-900 shadow-xl' : 'text-white/80 hover:text-white'}`}>Vacation</button>
                  <button onClick={() => setDecisionType('BigPurchase')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${decisionType === 'BigPurchase' ? 'bg-white text-indigo-900 shadow-xl' : 'text-white/80 hover:text-white'}`}>Purchase</button>
                </div>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-black text-base">{currencySymbol}</div>
                   <input 
                    type="number" 
                    value={estimatedCost} 
                    onChange={(e) => setEstimatedCost(e.target.value)} 
                    placeholder="Planned cost..." 
                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white font-black text-sm outline-none focus:border-white/40 placeholder:text-white/40 shadow-inner backdrop-blur-md" 
                  />
                </div>
                <button 
                  onClick={handleConsultAI} 
                  disabled={!estimatedCost || isConsultingAI}
                  className="w-full py-3 bg-white text-indigo-900 font-black rounded-xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  {isConsultingAI ? <Loader2 size={14} className="animate-spin" /> : <><Sparkles size={14} className="text-brand-accent" /> Analyze Path</>}
                </button>
              </div>
            ) : (
              <div className="space-y-3 animate-kick">
                <div className="bg-white/15 p-3 rounded-xl border border-white/25 flex items-center justify-between shadow-lg backdrop-blur-3xl">
                   <div className="flex items-center gap-2">
                     <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.6)] animate-pulse ${decisionAdvice.status === 'Green' ? 'bg-emerald-400' : decisionAdvice.status === 'Yellow' ? 'bg-amber-400' : 'bg-rose-500'}`} />
                     <span className="text-[11px] font-black uppercase tracking-wider">{decisionAdvice.status} Light</span>
                   </div>
                   <div className="text-right">
                     <span className="text-lg font-black">{decisionAdvice.score}%</span>
                   </div>
                </div>
                <p className="text-[10px] font-bold text-indigo-50 leading-relaxed italic px-1">"{decisionAdvice.reasoning}"</p>
                <div className="flex gap-2">
                   <button onClick={() => setDecisionAdvice(null)} className="flex-1 py-2 bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/20">Reset</button>
                   <div className="flex-[2] bg-white/20 rounded-lg px-3 py-2 flex items-center justify-between text-[8px] font-black uppercase tracking-widest backdrop-blur-md">
                      <span className="opacity-70">Wait Time</span>
                      <span className="text-[10px]">{decisionAdvice.waitTime}</span>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. STRATEGY CHIPS */}
      <div className="space-y-2 px-1">
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Portfolio Strategy</h3>
        <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2 -mx-1 px-1">
          {insights ? insights.map((insight, idx) => (
            <div key={idx} className="flex-none w-[220px] bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-md flex flex-col justify-between group transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg text-brand-primary shadow-sm group-hover:scale-110 transition-transform">
                  <Sparkles size={14} />
                </div>
                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-snug">{insight.tip}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center">
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Outcome</span>
                 <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{insight.impact}</span>
              </div>
            </div>
          )) : (
            <div className="w-full text-center py-6 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
               <div className="flex flex-col items-center justify-center gap-2">
                 <Loader2 size={16} className="animate-spin text-slate-300" />
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Finding Opportunities...</p>
               </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
