
import React, { useMemo, useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
} from 'recharts';
import { Expense, UserSettings, Category, Income, WealthItem, UserProfile } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  TrendingUp, Wallet, Loader2, Activity, PieChart as PieChartIcon, 
  Sparkles, BrainCircuit, ShieldCheck, Target, Zap, CreditCard,
  Briefcase
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
    const currentExps = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y);
    const spent = currentExps.reduce((sum, e) => sum + e.amount, 0);
    const income = incomes.filter(i => new Date(i.date).getMonth() === m && new Date(i.date).getFullYear() === y)
                          .reduce((sum, i) => sum + i.amount, 0) || settings.monthlyIncome;
    
    const byCat = currentExps.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<Category, number>);

    return { spent, income, byCat };
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
    <div className="pb-44 pt-4 space-y-8">
      
      {/* 1. PREMIUM NET WORTH CARD */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-brand-accent to-purple-600 rounded-[48px] blur-3xl opacity-25 group-hover:opacity-40 transition-opacity duration-700"></div>
        <div className="relative bg-slate-900 dark:bg-slate-950 p-8 rounded-[48px] shadow-2xl overflow-hidden border border-white/10">
          {/* Animated Glow Elements */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-brand-primary/20 rounded-full blur-[100px] animate-pulse-slow"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-accent/20 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
          
          <div className="relative z-10 flex flex-col gap-8">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-5">
                <div className="p-5 bg-white/10 rounded-[28px] backdrop-blur-2xl border border-white/20 text-brand-accent shadow-xl neon-glow">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none mb-3">Portfolio Net Worth</p>
                  <h2 className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-1.5">
                    <span className="text-2xl text-brand-primary/80">{currencySymbol}</span>
                    {wealthStats.netWorth.toLocaleString()}
                  </h2>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 shadow-xl backdrop-blur-md">
                  <TrendingUp size={16} className="text-emerald-400" />
                  <span className="text-[12px] font-black text-emerald-400 uppercase tracking-widest">Growth</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="p-6 bg-white/5 rounded-[32px] border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors group/card">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <Briefcase size={16} className="text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Assets</span>
                </div>
                <p className="text-2xl font-black text-white">{currencySymbol}{wealthStats.assets.toLocaleString()}</p>
              </div>
              <div className="p-6 bg-white/5 rounded-[32px] border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors group/card">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <CreditCard size={16} className="text-rose-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Liabilities</span>
                </div>
                <p className="text-2xl font-black text-white">{currencySymbol}{wealthStats.liabilities.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CASH FLOW VELOCITY CHART */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-2xl space-y-8">
        <div className="flex justify-between items-center px-2">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Burn Velocity</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Spending trajectory vs income</p>
          </div>
          <div className="p-3.5 bg-brand-primary/10 dark:bg-brand-primary/20 rounded-[22px] text-brand-primary shadow-lg">
             <Activity size={24} />
          </div>
        </div>
        
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '28px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '20px', fontWeight: 900, backgroundColor: 'rgba(255,255,255,0.95)' }}
                labelStyle={{ color: 'var(--brand-secondary)', marginBottom: '6px' }}
              />
              <Area type="monotone" dataKey="spent" stroke="var(--brand-primary)" strokeWidth={6} fillOpacity={1} fill="url(#colorSpent)" animationDuration={1800} />
              <Area type="monotone" dataKey="budget" stroke="#cbd5e1" strokeDasharray="10 10" fillOpacity={0} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-[36px] border border-slate-100 dark:border-slate-800 flex items-center gap-5 group hover:scale-[1.02] transition-transform">
             <div className="w-14 h-14 rounded-[22px] bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg text-brand-primary group-hover:rotate-12 transition-transform">
               <Target size={26} />
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Goal</p>
               <p className="text-base font-black text-slate-900 dark:text-white">{currencySymbol}{stats.income.toLocaleString()}</p>
             </div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-[36px] border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-5 group hover:scale-[1.02] transition-transform">
             <div className="w-14 h-14 rounded-[22px] bg-white dark:bg-emerald-900/20 flex items-center justify-center shadow-lg text-emerald-500 group-hover:rotate-12 transition-transform">
               <Zap size={26} />
             </div>
             <div>
               <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Safe to Spend</p>
               <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{currencySymbol}{(stats.income - stats.spent).toLocaleString()}</p>
             </div>
          </div>
        </div>
      </div>

      {/* 3. ALLOCATION & AI LAB */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Allocation Donut */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-8 px-2">
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest">Allocation</h3>
            <div className="p-3.5 bg-brand-accent/10 rounded-[22px] text-brand-accent shadow-md">
              <PieChartIcon size={24} />
            </div>
          </div>
          
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData.length > 0 ? pieData : [{name: 'Empty', value: 1, color: '#f1f5f9'}]} 
                  cx="50%" cy="50%" 
                  innerRadius={85} outerRadius={110} 
                  paddingAngle={12} dataKey="value" 
                  cornerRadius={15} stroke="none"
                >
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-slate-900 dark:text-white">
                {Math.round((stats.spent / (stats.income || 1)) * 100)}%
              </span>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Utilization</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full mt-8 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-[36px]">
            {['Needs', 'Wants', 'Savings'].map(cat => (
              <div key={cat} className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full mb-2.5 shadow-md" style={{ backgroundColor: CATEGORY_COLORS[cat as Category] }} />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{cat}</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{currencySymbol}{Math.round(stats.byCat[cat as Category] || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Decision Lab - Highly Colorful */}
        <div className="bg-gradient-to-br from-[#2563eb] via-[#8b5cf6] to-[#d946ef] p-8 rounded-[48px] shadow-2xl relative overflow-hidden text-white group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="absolute -bottom-16 -right-16 opacity-15 group-hover:scale-125 transition-transform duration-1000">
            <BrainCircuit size={200} />
          </div>
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-5 mb-8">
              <div className="bg-white/20 p-4 rounded-[28px] backdrop-blur-3xl border border-white/30 shadow-2xl">
                <Zap size={28} className="text-yellow-300 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-widest leading-none">Decision Hub</h3>
                <p className="text-[11px] font-bold text-white/70 uppercase tracking-[0.25em] mt-2">AI-Driven Predictions</p>
              </div>
            </div>

            {!decisionAdvice ? (
              <div className="space-y-6">
                <div className="flex bg-white/10 p-2 rounded-[24px] border border-white/20 backdrop-blur-2xl">
                  <button onClick={() => setDecisionType('Vacation')} className={`flex-1 py-4 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${decisionType === 'Vacation' ? 'bg-white text-indigo-900 shadow-2xl scale-[1.02]' : 'text-white/80 hover:text-white'}`}>Vacation</button>
                  <button onClick={() => setDecisionType('BigPurchase')} className={`flex-1 py-4 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${decisionType === 'BigPurchase' ? 'bg-white text-indigo-900 shadow-2xl scale-[1.02]' : 'text-white/80 hover:text-white'}`}>Purchase</button>
                </div>
                <div className="relative">
                   <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/50 font-black text-xl">{currencySymbol}</div>
                   <input 
                    type="number" 
                    value={estimatedCost} 
                    onChange={(e) => setEstimatedCost(e.target.value)} 
                    placeholder="Planned cost..." 
                    className="w-full bg-white/10 border-2 border-white/20 rounded-[32px] pl-14 pr-8 py-6 text-white font-black text-lg outline-none focus:border-white/40 transition-all placeholder:text-white/40 shadow-inner backdrop-blur-md" 
                  />
                </div>
                <button 
                  onClick={handleConsultAI} 
                  disabled={!estimatedCost || isConsultingAI}
                  className="w-full py-6 bg-white text-indigo-900 font-black rounded-[32px] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50 hover:bg-slate-50"
                >
                  {isConsultingAI ? <Loader2 size={20} className="animate-spin" /> : <><Sparkles size={20} className="text-brand-accent" /> Analyze Path</>}
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-kick">
                <div className="bg-white/15 p-6 rounded-[36px] border border-white/25 flex items-center justify-between shadow-2xl backdrop-blur-3xl">
                   <div className="flex items-center gap-4">
                     <div className={`w-5 h-5 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.6)] animate-pulse ${decisionAdvice.status === 'Green' ? 'bg-emerald-400' : decisionAdvice.status === 'Yellow' ? 'bg-amber-400' : 'bg-rose-500'}`} />
                     <span className="text-base font-black uppercase tracking-wider">{decisionAdvice.status} Light</span>
                   </div>
                   <div className="text-right">
                     <span className="text-2xl font-black">{decisionAdvice.score}%</span>
                     <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest">Score</p>
                   </div>
                </div>
                <p className="text-xs font-bold text-indigo-50 leading-relaxed italic px-2">"{decisionAdvice.reasoning}"</p>
                <div className="flex gap-3">
                   <button onClick={() => setDecisionAdvice(null)} className="flex-1 py-4 bg-white/10 rounded-[20px] text-[10px] font-black uppercase tracking-widest border border-white/20 hover:bg-white/20 transition-colors">Reset</button>
                   <div className="flex-[2] bg-white/20 rounded-[20px] px-6 py-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                      <span className="opacity-70">Wait Time</span>
                      <span className="text-sm">{decisionAdvice.waitTime}</span>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. STRATEGY CHIPS */}
      <div className="space-y-4 px-2">
        <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] pl-2">Portfolio Strategy</h3>
        <div className="flex overflow-x-auto no-scrollbar gap-5 pb-4 -mx-2 px-2">
          {insights ? insights.map((insight, idx) => (
            <div key={idx} className="flex-none w-[320px] bg-white dark:bg-slate-800 p-6 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col justify-between group hover:border-brand-primary transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl text-brand-primary shadow-sm group-hover:scale-110 transition-transform">
                  <Sparkles size={20} />
                </div>
                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 leading-snug">{insight.tip}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Outcome</span>
                 <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{insight.impact}</span>
              </div>
            </div>
          )) : (
            <div className="w-full text-center py-10 bg-slate-50/50 dark:bg-slate-800/20 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-700">
               <div className="flex flex-col items-center justify-center gap-3">
                 <Loader2 size={24} className="animate-spin text-slate-300" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optimizing Financial Path...</p>
               </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
