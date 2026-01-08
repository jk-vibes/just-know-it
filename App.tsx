
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Expense, BudgetRule, UserSettings, Category, UserProfile, Frequency, RecurringItem, Income, IncomeType, AppTheme } from './types';
import Dashboard from './components/Dashboard';
import RecordList from './components/RecordList';
import AddRecord from './components/AddRecord';
import RulesEngine from './components/RulesEngine';
import Settings from './components/Settings';
import Navbar from './components/Navbar';
import CategorizationModal from './components/CategorizationModal';
import Onboarding from './components/Onboarding';
import AuthScreen from './components/AuthScreen';
import { Loader2, LayoutDashboard, List, Workflow, Settings as SettingsIcon } from 'lucide-react';
import { DEFAULT_SPLIT } from './constants';
import { parseTransactionText } from './services/geminiService';
import { syncToGoogleDrive, restoreFromGoogleDrive, BackupData } from './services/cloudSync';

const STORAGE_KEY = 'jk_budget_data_v4';

const INITIAL_SETTINGS: UserSettings = {
  monthlyIncome: 30000,
  split: DEFAULT_SPLIT,
  isOnboarded: false,
  theme: 'light',
  appTheme: 'Standard',
  isCloudSyncEnabled: false,
  currency: 'INR',
  dataFilter: 'all'
};

const calculateNextDueDate = (currentDate: string, frequency: Frequency): string => {
  const date = new Date(currentDate);
  if (frequency === 'Weekly') date.setDate(date.getDate() + 7);
  if (frequency === 'Monthly') date.setMonth(date.getMonth() + 1);
  if (frequency === 'Yearly') date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split('T')[0];
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [rules, setRules] = useState<BudgetRule[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<Expense | Income | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessingSmartAdd, setIsProcessingSmartAdd] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.incomes) setIncomes(parsed.incomes);
        if (parsed.rules) setRules(parsed.rules);
        if (parsed.user) {
          setUser(parsed.user);
          setIsAuthenticated(true);
        }
        setRecurringItems(parsed.recurringItems || []);
      } catch (e) {
        console.error("Failed to parse storage", e);
      }
    }
    setIsLoading(false);
  }, []);

  // Theme support
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = settings.theme === 'dark' || 
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    
    // Apply Character Theme
    root.setAttribute('data-theme', settings.appTheme || 'Standard');
  }, [settings.theme, settings.appTheme]);

  // Persist to local storage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        settings, 
        expenses, 
        incomes, 
        rules, 
        user, 
        recurringItems 
      }));
    }
  }, [settings, expenses, incomes, rules, user, recurringItems, isLoading]);

  const handleCloudSync = useCallback(async () => {
    if (!user?.accessToken) return;
    setIsSyncing(true);
    try {
      const data: BackupData = { expenses, incomes, rules, recurringItems, settings, timestamp: new Date().toISOString() };
      const syncTime = await syncToGoogleDrive(user.accessToken, data);
      setSettings(prev => ({ ...prev, lastSynced: syncTime }));
    } catch (e) {
      console.error("Cloud sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  }, [user, expenses, incomes, rules, recurringItems, settings]);

  const handleLogin = async (profile: UserProfile) => {
    setUser(profile);
    setIsAuthenticated(true);
    if (profile.accessToken) {
      setIsSyncing(true);
      const remoteData = await restoreFromGoogleDrive(profile.accessToken);
      setIsSyncing(false);
      if (remoteData) {
        if (confirm("Remote backup found! Restore data from Google Drive?")) {
          setExpenses(remoteData.expenses);
          setIncomes(remoteData.incomes);
          setRules(remoteData.rules);
          setRecurringItems(remoteData.recurringItems);
          setSettings(remoteData.settings);
        }
      }
    }
  };

  const handleLogout = () => {
    if (confirm("Sign out of your session? Your local data and settings will be preserved.")) {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const handleFullReset = () => {
    if (confirm("DANGER: This will wipe ALL local data. Remote cloud data is unaffected.")) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };

  // Fix: Added handleEditRecord handler to manage record editing state
  const handleEditRecord = (record: Expense | Income) => {
    setRecordToEdit(record);
    setIsAddingRecord(true);
  };

  // Fix: Added handleAddExpense with support for recurring items
  const handleAddExpense = (expense: Omit<Expense, 'id'>, frequency: Frequency) => {
    const id = Math.random().toString(36).substring(2, 11);
    const newExpense: Expense = { ...expense, id };
    setExpenses(prev => [...prev, newExpense]);
    
    if (frequency !== 'None') {
      const nextDueDate = calculateNextDueDate(expense.date, frequency);
      const recurring: RecurringItem = {
        id: Math.random().toString(36).substring(2, 11),
        amount: expense.amount,
        category: expense.category,
        subCategory: expense.subCategory,
        note: expense.note || '',
        merchant: expense.merchant,
        frequency,
        nextDueDate
      };
      setRecurringItems(prev => [...prev, recurring]);
    }
    setIsAddingRecord(false);
  };

  // Fix: Added handleAddIncome handler
  const handleAddIncome = (income: Omit<Income, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    setIncomes(prev => [...prev, { ...income, id }]);
    setIsAddingRecord(false);
  };

  // Fix: Added handleUpdateExpense handler
  const handleUpdateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    setIsAddingRecord(false);
    setRecordToEdit(null);
  };

  // Fix: Added handleUpdateIncome handler
  const handleUpdateIncome = (id: string, updates: Partial<Income>) => {
    setIncomes(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    setIsAddingRecord(false);
    setRecordToEdit(null);
  };

  const currentMonthIncome = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const sum = incomes.filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, i) => sum + i.amount, 0);
    return sum > 0 ? sum : settings.monthlyIncome;
  }, [incomes, settings.monthlyIncome]);

  const remainingPercentage = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentMonthSpent = expenses.filter(e => {
      const d = new Date(e.date);
      return e.isConfirmed && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, e) => sum + e.amount, 0);
    return Math.max(0, (1 - (currentMonthSpent / currentMonthIncome)) * 100);
  }, [expenses, currentMonthIncome]);

  if (isLoading) return <div className="w-full h-screen bg-white dark:bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;
  if (!isAuthenticated) return <AuthScreen onLogin={handleLogin} />;
  if (!settings.isOnboarded) return <Onboarding onComplete={(s) => setSettings({ ...s, isOnboarded: true })} />;

  return (
    <div className="h-screen overflow-hidden bg-white dark:bg-slate-900 flex flex-col transition-colors duration-300">
      <header className="flex-none bg-white dark:bg-slate-950 px-4 py-3 border-b border-slate-100 dark:border-white/10 shadow-sm transition-colors z-50">
        <div className="max-w-2xl mx-auto flex justify-between items-center w-full">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-brand-primary relative z-10 transition-colors">
                 <path d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" fill="currentColor" />
                 <path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                 <text x="12" y="17" fontSize="8" fontWeight="900" textAnchor="middle" fill="white" style={{ fontFamily: 'Plus Jakarta Sans' }}>JK</text>
              </svg>
              <div className="bg-slate-50 dark:bg-white/5 px-1.5 py-0.5 rounded-full border border-slate-100 dark:border-white/10">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500">v1.3</span>
              </div>
            </div>
            <h1 className="text-[10px] font-bold text-slate-900 dark:text-white lowercase tracking-tight mt-0.5">just know it</h1>
          </div>
          <nav className="flex items-center gap-1">
            {[
              { id: 'Dashboard', icon: LayoutDashboard },
              { id: 'Expenses', icon: List },
              { id: 'Rules', icon: Workflow },
              { id: 'Profile', icon: SettingsIcon }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${currentView === item.id ? 'bg-brand-primary text-white shadow-md' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
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
              expenses={expenses} incomes={incomes}
              settings={{ ...settings, monthlyIncome: currentMonthIncome }} 
              onCategorizeClick={() => setIsCategorizing(true)}
              onConfirmExpense={(id, cat) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: cat, isConfirmed: true } : e))}
              onSmartAdd={() => {}}
              onUpdateTheme={(t) => setSettings(s => ({ ...s, appTheme: t }))}
            />
          )}
          {currentView === 'Expenses' && (
            <RecordList 
              expenses={expenses} incomes={incomes}
              settings={{ ...settings, monthlyIncome: currentMonthIncome }} 
              onDeleteExpense={(id) => setExpenses(prev => prev.filter(e => e.id !== id))} 
              onDeleteIncome={(id) => setIncomes(prev => prev.filter(i => i.id !== id))}
              onConfirm={(id, cat) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: cat, isConfirmed: true } : e))}
              onUpdateExpense={handleUpdateExpense}
              onEditRecord={handleEditRecord}
              onAddBulk={(n) => setExpenses(p => [...p, ...n.map(x => ({ ...x, id: Math.random().toString(36).substring(2, 11), isConfirmed: true }))])}
            />
          )}
          {currentView === 'Rules' && (
            <RulesEngine rules={rules} recurringItems={recurringItems} onAddRule={(r) => setRules(p => [...p, { ...r, id: Math.random().toString(36).substring(2, 11) }])} onDeleteRule={(id) => setRules(p => p.filter(x => x.id !== id))} onDeleteRecurring={(id) => setRecurringItems(p => p.filter(x => x.id !== id))} />
          )}
          {currentView === 'Profile' && (
            <Settings settings={settings} user={user} onLogout={handleLogout} onReset={handleFullReset} onToggleTheme={() => setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))} onUpdateCurrency={(c) => setSettings(s => ({ ...s, currency: c }))} onUpdateDataFilter={(f) => setSettings(s => ({ ...s, dataFilter: f }))} onSync={handleCloudSync} isSyncing={isSyncing} onLoadMockData={() => {}} onClearExpenses={() => { setExpenses([]); setIncomes([]); }} />
          )}
        </div>
      </main>

      <Navbar currentView={currentView} remainingPercentage={remainingPercentage} onViewChange={(v) => { if(v === 'Add') { setRecordToEdit(null); setIsAddingRecord(true); } else { setCurrentView(v); } }} />

      {isAddingRecord && (
        <AddRecord settings={{ ...settings, monthlyIncome: currentMonthIncome }} onAdd={handleAddExpense} onAddIncome={handleAddIncome} onUpdateExpense={handleUpdateExpense} onUpdateIncome={handleUpdateIncome} onCancel={() => { setIsAddingRecord(false); setRecordToEdit(null); }} initialData={recordToEdit} />
      )}

      {isCategorizing && (
        <CategorizationModal settings={{ ...settings, monthlyIncome: currentMonthIncome }} expenses={expenses.filter(e => !e.isConfirmed)} onConfirm={(id, cat) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: cat, isConfirmed: true } : e))} onClose={() => setIsCategorizing(false)} />
      )}
    </div>
  );
};

export default App;
