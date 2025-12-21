
import React, { useState, useEffect, useCallback } from 'react';
import { View, Expense, BudgetRule, UserSettings, Category } from './types';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import ExpenseList from './components/ExpenseList';
import AddExpense from './components/AddExpense';
import RulesEngine from './components/RulesEngine';
import ProfileSettings from './components/ProfileSettings';
import Navbar from './components/Navbar';
import CategorizationModal from './components/CategorizationModal';
import { Smartphone } from 'lucide-react';

const STORAGE_KEY = 'jk_budget_data';

const App: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rules, setRules] = useState<BudgetRule[]>([]);
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);

  // Load Initial Data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(parsed.settings);
      setExpenses(parsed.expenses || []);
      setRules(parsed.rules || []);
    }
  }, []);

  // Persist Data
  useEffect(() => {
    if (settings) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, expenses, rules }));
    }
  }, [settings, expenses, rules]);

  const handleOnboarding = (newSettings: UserSettings) => {
    setSettings(newSettings);
    setCurrentView('Dashboard');
  };

  const handleAddExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expense,
      id: Math.random().toString(36).substr(2, 9),
    };
    setExpenses(prev => [...prev, newExpense]);
    setIsAddingExpense(false);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleConfirmExpense = (id: string, category: Category) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, category, isConfirmed: true } : e));
  };

  const handleAddRule = (rule: Omit<BudgetRule, 'id'>) => {
    setRules(prev => [...prev, { ...rule, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const simulateSms = () => {
    const merchants = ['Uber', 'Starbucks', 'Walmart', 'Netflix', 'Apartment Rent'];
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    
    // Check rules
    let category: Category = 'Uncategorized';
    for (const rule of rules) {
      if (merchant.toLowerCase().includes(rule.keyword.toLowerCase())) {
        category = rule.category;
        break;
      }
    }

    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      amount: Math.floor(Math.random() * 200) + 10,
      date: new Date().toISOString().split('T')[0],
      category,
      isConfirmed: false,
      merchant
    };
    setExpenses(prev => [...prev, newExpense]);
    alert(`Simulated SMS detected from ${merchant}!`);
  };

  if (!settings?.isOnboarded) {
    return <Onboarding onComplete={handleOnboarding} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'Dashboard':
        return (
          <Dashboard 
            expenses={expenses} 
            settings={settings} 
            onCategorizeClick={() => setIsCategorizing(true)}
            onConfirmExpense={handleConfirmExpense}
          />
        );
      case 'Expenses':
        return <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} onConfirm={handleConfirmExpense} />;
      case 'Rules':
        return <RulesEngine rules={rules} onAddRule={handleAddRule} onDeleteRule={handleDeleteRule} />;
      case 'Profile':
        return <ProfileSettings settings={settings} onReset={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-gray-50 flex flex-col">
      {/* App Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 p-4 flex justify-between items-center">
        <h1 className="text-xl font-extrabold text-blue-600">JK Budget</h1>
        <div className="flex gap-2">
          <button 
            onClick={simulateSms}
            className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-xl"
            title="Simulate Transaction SMS"
          >
            <Smartphone size={20} />
          </button>
        </div>
      </header>

      {/* View Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {renderView()}
      </main>

      {/* Navigation */}
      <Navbar 
        currentView={currentView} 
        onViewChange={(v) => {
          if (v === 'Add') setIsAddingExpense(true);
          else setCurrentView(v);
        }} 
      />

      {/* Modals */}
      {isAddingExpense && (
        <AddExpense 
          onAdd={handleAddExpense} 
          onCancel={() => setIsAddingExpense(false)} 
        />
      )}

      {isCategorizing && (
        <CategorizationModal 
          expenses={expenses.filter(e => !e.isConfirmed)} 
          onConfirm={handleConfirmExpense} 
          onClose={() => setIsCategorizing(false)}
        />
      )}
    </div>
  );
};

export default App;
