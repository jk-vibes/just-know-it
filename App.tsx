import React, { useState, useEffect, useMemo } from 'react';
import { View, Expense, BudgetRule, UserSettings, Category, UserProfile, Frequency, RecurringItem } from './types';
import Dashboard from './components/Dashboard';
import ExpenseList from './components/ExpenseList';
import AddExpense from './components/AddExpense';
import RulesEngine from './components/RulesEngine';
import ProfileSettings from './components/ProfileSettings';
import Navbar from './components/Navbar';
import CategorizationModal from './components/CategorizationModal';
import { Loader2, LayoutDashboard, List, Workflow, LogOut, Settings } from 'lucide-react';
import { DEFAULT_SPLIT } from './constants';
import { parseTransactionText } from './services/geminiService';

const STORAGE_KEY = 'jk_budget_data_v3';

const DEFAULT_USER: UserProfile = {
  id: 'local-user',
  name: 'Jay',
  email: 'jay@justknowit.app',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jay'
};

const INITIAL_SETTINGS: UserSettings = {
  monthlyIncome: 30000,
  split: DEFAULT_SPLIT,
  isOnboarded: true,
  theme: 'light',
  isCloudSyncEnabled: false,
  currency: 'INR'
};

const generateMockExpenses = (monthlyIncome: number): Expense[] => {
  const mock: Expense[] = [];
  const categories: Category[] = ['Needs', 'Wants', 'Savings'];
  const merchants = {
    Needs: ['Big Bazaar', 'Rent', 'Electricity', 'Water', 'Internet', 'Petrol Pump', 'Pharmacy', 'Grocery Store', 'House Help', 'Maintenance'],
    Wants: ['Starbucks', 'Netflix', 'Amazon', 'Uber', 'Zomato', 'Cinema', 'Apple Store', 'Restaurant', 'Bar', 'Spotify', 'Myntra', 'Weekend Trip'],
    Savings: ['Stocks', 'Mutual Funds', 'Fixed Deposit', 'Gold', 'Emergency Fund', 'Crypto', 'SIP']
  };

  const now = new Date();
  // Generate 120 days of data (approx 4 months)
  for (let i = 0; i < 120; i++) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // 0 to 4 transactions per day for density
    const dailyCount = Math.floor(Math.random() * 5); 

    for (let j = 0; j < dailyCount; j++) {
      const catIndex = Math.floor(Math.random() * categories.length);
      const cat = categories[catIndex];
      const merchantList = merchants[cat as keyof typeof merchants];
      const merchant = merchantList[Math.floor(Math.random() * merchantList.length)];
      
      let amount = Math.floor(Math.random() * 1000 + 50);
      
      // Make data more realistic
      if (cat === 'Needs') amount = Math.floor(Math.random() * 3000 + 200);
      if (cat === 'Wants') amount = Math.floor(Math.random() * 2000 + 100);
      if (cat === 'Savings') amount = Math.floor(Math.random() * 10000 + 1000);
      
      // Occasional large transaction
      if (Math.random() > 0.95) amount = amount * 3;

      mock.push({
        id: Math.random().toString(36).substring(2, 11) + i + j,
        amount,
        date: dateStr,
        category: cat,
        merchant,
        note: merchant,
        isConfirmed: true
      });
    }
  }
  return mock;
};

// Helper to calculate next due date
const calculateNextDueDate = (currentDate: string, frequency: Frequency): string => {
  const date = new Date(currentDate);
  if (frequency === 'Weekly') date.setDate(date.getDate() + 7);
  if (frequency === 'Monthly') date.setMonth(date.getMonth() + 1);
  if (frequency === 'Yearly') date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split('T')[0];
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rules, setRules] = useState<BudgetRule[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [addExpenseInitialData, setAddExpenseInitialData] = useState<Partial<Expense> | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessingSmartAdd, setIsProcessingSmartAdd] = useState(false);

  // Load Data & Process Recurring
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.rules) setRules(parsed.rules);
        if (parsed.user) setUser(parsed.user);
        
        // Handle Recurring Items
        let currentExpenses = parsed.expenses || [];
        let currentRecurring = (parsed.recurringItems || []) as RecurringItem[];
        
        if (currentRecurring.length > 0) {
           const today = new Date();
           today.setHours(0,0,0,0);
           
           const newExpenses: Expense[] = [];
           const updatedRecurring = currentRecurring.map(item => {
             let nextDate = new Date(item.nextDueDate);
             let modifiedItem = { ...item };
             
             // Check if due date has passed or is today
             while (nextDate <= today) {
               // Create Expense
               newExpenses.push({
                 id: Math.random().toString(36).substring(2, 11),
                 amount: item.amount,
                 category: item.category,
                 note: item.note,
                 merchant: item.merchant,
                 date: modifiedItem.nextDueDate,
                 isConfirmed: true
               });
               
               // Advance Date
               const nextDateStr = calculateNextDueDate(modifiedItem.nextDueDate, item.frequency);
               modifiedItem.nextDueDate = nextDateStr;
               nextDate = new Date(nextDateStr);
             }
             return modifiedItem;
           });

           if (newExpenses.length > 0) {
             setExpenses([...currentExpenses, ...newExpenses]);
             setRecurringItems(updatedRecurring);
           } else {
             setRecurringItems(currentRecurring);
           }
        } else {
          setRecurringItems([]);
        }

      } catch (e) {
        console.error("Failed to parse storage", e);
        setExpenses(generateMockExpenses(30000));
      }
    } else {
      setExpenses(generateMockExpenses(30000));
    }
    setIsLoading(false);
  }, []);

  // Theme Handling
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = settings.theme === 'dark' || 
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [settings.theme]);

  // Persist Data
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, expenses, rules, user, recurringItems }));
    }
  }, [settings, expenses, rules, user, recurringItems, isLoading]);

  const remainingPercentage = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthSpent = expenses
      .filter(e => {
        const d = new Date(e.date);
        return e.isConfirmed && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const income = settings.monthlyIncome || 1;
    return Math.max(0, (1 - (currentMonthSpent / income)) * 100);
  }, [expenses, settings.monthlyIncome]);

  const handleAddExpense = (expenseData: Omit<Expense, 'id'>, frequency: Frequency) => {
    const newExp: Expense = {
      ...expenseData,
      id: Math.random().toString(36).substring(2, 11)
    };
    
    setExpenses(prev => [...prev, newExp]);

    // If recurring, add to recurring list with NEXT due date
    if (frequency !== 'None') {
      const nextDue = calculateNextDueDate(expenseData.date, frequency);
      const newRecurring: RecurringItem = {
        id: Math.random().toString(36).substring(2, 11),
        amount: expenseData.amount,
        category: expenseData.category,
        note: expenseData.note || 'Recurring Expense',
        merchant: expenseData.merchant,
        frequency,
        nextDueDate: nextDue
      };
      setRecurringItems(prev => [...prev, newRecurring]);
    }

    setIsAddingExpense(false);
    setAddExpenseInitialData(null); // Clear prefilled data
  };

  const handleAddBulkExpenses = (newExpenses: Omit<Expense, 'id'>[]) => {
    const expensesWithIds = newExpenses.map(e => ({
      ...e,
      id: Math.random().toString(36).substring(2, 11),
      isConfirmed: true,
      note: e.merchant 
    }));
    setExpenses(prev => [...prev, ...expensesWithIds]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleConfirmExpense = (id: string, category: Category) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, category, isConfirmed: true } : e));
  };

  const handleSmartAdd = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        alert("Clipboard is empty! Copy an SMS first.");
        return;
      }
      
      setIsProcessingSmartAdd(true);
      const result = await parseTransactionText(text, settings.currency);
      setIsProcessingSmartAdd(false);

      if (result) {
        setAddExpenseInitialData({
          amount: result.amount,
          merchant: result.merchant,
          category: result.category,
          date: result.date,
          note: result.merchant
        });
        setIsAddingExpense(true);
      } else {
        alert("Couldn't find a transaction in your clipboard.");
      }
    } catch (e) {
      console.error(e);
      setIsProcessingSmartAdd(false);
      alert("Please check your clipboard permissions or copy text manually.");
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-red-500" size={32} />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-white dark:bg-slate-900 flex flex-col transition-colors duration-300">
      <header className="flex-none bg-white dark:bg-slate-950 px-4 py-3 border-b border-slate-100 dark:border-white/10 shadow-sm transition-colors z-50">
        <div className="max-w-2xl mx-auto flex justify-between items-center w-full">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-red-500 relative z-10">
                 <path d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" fill="currentColor" />
                 <path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                 <text x="12" y="17" fontSize="8" fontWeight="900" textAnchor="middle" fill="white" style={{ fontFamily: 'Plus Jakarta Sans' }}>JK</text>
              </svg>
              <div className="bg-slate-50 dark:bg-white/5 px-1.5 py-0.5 rounded-full border border-slate-100 dark:border-white/10">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500">v1.0</span>
              </div>
            </div>
            <h1 className="text-[10px] font-bold text-slate-900 dark:text-white lowercase tracking-tight mt-0.5">just know it</h1>
          </div>
          
          <nav className="flex items-center gap-1">
            {[
              { id: 'Dashboard', icon: LayoutDashboard },
              { id: 'Expenses', icon: List },
              { id: 'Rules', icon: Workflow },
              { id: 'Profile', icon: Settings }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${currentView === item.id ? 'bg-[#163074] text-white shadow-md' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
              >
                <item.icon size={16} />
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar animate-kick bg-white dark:bg-slate-900 relative">
        <div className="max-w-2xl mx-auto w-full px-4 h-full">
          {currentView === 'Dashboard' && (
            <Dashboard 
              expenses={expenses} 
              settings={settings} 
              onCategorizeClick={() => setIsCategorizing(true)}
              onConfirmExpense={handleConfirmExpense}
              onSmartAdd={handleSmartAdd}
              isProcessingSmartAdd={isProcessingSmartAdd}
            />
          )}
          {currentView === 'Expenses' && (
            <ExpenseList 
              expenses={expenses} 
              settings={settings} 
              onDelete={handleDeleteExpense} 
              onConfirm={handleConfirmExpense} 
              onAddBulk={handleAddBulkExpenses}
            />
          )}
          {currentView === 'Rules' && (
            <RulesEngine 
              rules={rules} 
              recurringItems={recurringItems}
              onAddRule={(r) => setRules(prev => [...prev, { ...r, id: Math.random().toString(36).substring(2, 11) }])} 
              onDeleteRule={(id) => setRules(prev => prev.filter(rule => rule.id !== id))} 
              onDeleteRecurring={(id) => setRecurringItems(prev => prev.filter(item => item.id !== id))}
            />
          )}
          {currentView === 'Profile' && (
            <ProfileSettings 
              settings={settings} 
              user={user}
              onLogout={() => { if(confirm("Wipe data?")) { localStorage.removeItem(STORAGE_KEY); location.reload(); } }}
              onReset={() => { if(confirm("Reset?")) { localStorage.removeItem(STORAGE_KEY); location.reload(); } }}
              onToggleTheme={() => setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))}
              onUpdateCurrency={(code) => setSettings(s => ({ ...s, currency: code }))}
              onSync={() => { setIsSyncing(true); setTimeout(() => { setIsSyncing(false); alert("Synced!"); }, 1000); }}
              isSyncing={isSyncing}
              onLoadMockData={() => setExpenses(generateMockExpenses(settings.monthlyIncome))}
              onClearExpenses={() => setExpenses([])}
            />
          )}
        </div>
      </main>

      <Navbar 
        currentView={currentView} 
        remainingPercentage={remainingPercentage}
        onViewChange={(v) => { 
          if(v === 'Add') {
            setAddExpenseInitialData(null); // Clear if manual add
            setIsAddingExpense(true);
          } else {
            setCurrentView(v);
          }
        }} 
      />

      {isAddingExpense && (
        <AddExpense 
          settings={settings}
          onAdd={handleAddExpense} 
          onCancel={() => setIsAddingExpense(false)}
          initialData={addExpenseInitialData}
        />
      )}

      {isCategorizing && (
        <CategorizationModal 
          settings={settings}
          expenses={expenses.filter(e => !e.isConfirmed)} 
          onConfirm={handleConfirmExpense} 
          onClose={() => setIsCategorizing(false)}
        />
      )}
    </div>
  );
};

export default App;