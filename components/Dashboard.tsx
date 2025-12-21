
import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Expense, UserSettings, Category } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { TrendingUp, AlertCircle, Sparkles, ChevronRight, Check } from 'lucide-react';
import { getBudgetInsights } from '../services/geminiService';

interface DashboardProps {
  expenses: Expense[];
  settings: UserSettings;
  onCategorizeClick: () => void;
  onConfirmExpense: (id: string, category: Category) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ expenses, settings, onCategorizeClick, onConfirmExpense }) => {
  const [insights, setInsights] = useState<{ tip: string, impact: string }[] | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const pendingExpenses = expenses.filter(e => !e.isConfirmed);
  
  const stats = useMemo(() => {
    const confirmed = expenses.filter(e => e.isConfirmed);
    const totalsByCat = confirmed.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<Category, number>);

    const limits = {
      Needs: (settings.monthlyIncome * settings.split.Needs) / 100,
      Wants: (settings.monthlyIncome * settings.split.Wants) / 100,
      Savings: (settings.monthlyIncome * settings.split.Savings) / 100,
    };

    return { totalsByCat, limits };
  }, [expenses, settings]);

  const chartData = [
    { name: 'Needs', value: stats.totalsByCat.Needs || 0, color: CATEGORY_COLORS.Needs },
    { name: 'Wants', value: stats.totalsByCat.Wants || 0, color: CATEGORY_COLORS.Wants },
    { name: 'Savings', value: stats.totalsByCat.Savings || 0, color: CATEGORY_COLORS.Savings },
  ];

  const totalSpent = chartData.reduce((a, b) => a + b.value, 0);
  /* Fixed operator '+' cannot be applied to types 'unknown' and 'unknown' by adding explicit type annotations to reduce params */
  const totalLimit = Object.values(stats.limits).reduce((a: number, b: number) => a + b, 0);

  useEffect(() => {
    async function loadInsights() {
      if (expenses.length > 2 && !insights) {
        setLoadingInsights(true);
        const data = await getBudgetInsights(expenses, settings);
        setInsights(data);
        setLoadingInsights(false);
      }
    }
    loadInsights();
  }, [expenses, settings, insights]);

  return (
    <div className="pb-24 pt-4 px-4 space-y-6">
      {/* Pending Items Banner */}
      {pendingExpenses.length > 0 && (
        <button 
          onClick={onCategorizeClick}
          className="w-full bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-full">
              <AlertCircle size={20} />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-blue-900">{pendingExpenses.length} New Expenses</h4>
              <p className="text-xs text-blue-700">Need to be categorized</p>
            </div>
          </div>
          <ChevronRight className="text-blue-600" size={20} />
        </button>
      )}

      {/* Main Stats */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Spending</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-gray-900">${totalSpent.toLocaleString()}</span>
              <span className="text-gray-400 text-sm">/ ${settings.monthlyIncome.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-full text-green-600">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="h-48 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
             <span className="text-2xl font-bold">{Math.round((totalSpent / settings.monthlyIncome) * 100)}%</span>
             <span className="text-[10px] text-gray-400 font-semibold uppercase">Budget Used</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          {(['Needs', 'Wants', 'Savings'] as Category[]).map((cat) => (
            <div key={cat} className="text-center">
              <div 
                className="w-2 h-2 rounded-full mx-auto mb-1" 
                style={{ backgroundColor: CATEGORY_COLORS[cat] }} 
              />
              <span className="text-[10px] font-bold text-gray-400 uppercase">{cat}</span>
              <p className="text-sm font-bold">${(stats.totalsByCat[cat] || 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Bars */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-900 text-lg">Category Breakdown</h3>
        {(['Needs', 'Wants', 'Savings'] as Category[]).map((cat) => {
          const spent = stats.totalsByCat[cat] || 0;
          const limit = stats.limits[cat as keyof typeof stats.limits];
          const perc = Math.min((spent / limit) * 100, 100);
          const isOver = spent > limit;

          return (
            <div key={cat} className="bg-white p-4 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-700">{cat}</span>
                <span className={`text-sm font-bold ${isOver ? 'text-red-600' : 'text-gray-500'}`}>
                  ${spent.toLocaleString()} / ${limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${isOver ? 'bg-red-500' : ''}`}
                  style={{ 
                    width: `${perc}%`, 
                    backgroundColor: isOver ? undefined : CATEGORY_COLORS[cat] 
                  }}
                />
              </div>
              {isOver && <p className="text-[10px] text-red-500 mt-1 font-bold">Over limit by ${(spent - limit).toLocaleString()}</p>}
            </div>
          );
        })}
      </div>

      {/* Smart Insights */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl text-white shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-yellow-400" size={24} fill="currentColor" />
          <h3 className="text-lg font-bold">Smart Insights</h3>
        </div>
        
        {loadingInsights ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-12 bg-white/10 rounded-xl animate-pulse" />)}
          </div>
        ) : insights ? (
          <div className="space-y-4">
            {insights.map((insight, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="bg-white/20 p-2 rounded-lg h-fit">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight mb-1">{insight.tip}</p>
                  <p className="text-[10px] text-indigo-200 font-semibold uppercase">{insight.impact}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-indigo-100 italic">Add more confirmed expenses to get AI-powered spending tips!</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
