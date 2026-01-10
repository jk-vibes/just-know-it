
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Expense, BudgetRule, UserSettings, Category, UserProfile, Frequency, RecurringItem, Income, IncomeType, AppTheme, Notification, WealthItem, WealthType, WealthCategory, DensityLevel, BudgetItem } from './types';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import AddRecord from './components/AddRecord';
import Settings from './components/Settings';
import Navbar from './components/Navbar';
import CategorizationModal from './components/CategorizationModal';
import NotificationPane from './components/NotificationPane';
import AuthScreen from './components/AuthScreen';
import Accounts from './components/Accounts';
import VersionLog from './components/VersionLog';
import BudgetPlanner from './components/BudgetPlanner';
import { Loader2, LayoutDashboard, List, Settings as SettingsIcon, Bell, Wallet, Target } from 'lucide-react';
import { DEFAULT_SPLIT, getCurrencySymbol } from './constants';
import { syncToGoogleDrive, restoreFromGoogleDrive, BackupData } from './services/cloudSync';
import { triggerHaptic } from './utils/haptics';

const STORAGE_KEY = 'jk_budget_data_whole_num_v8';

const INITIAL_SETTINGS: UserSettings = {
  monthlyIncome: 300000,
  split: DEFAULT_SPLIT,
  isOnboarded: true, 
  theme: 'system',
  appTheme: 'Spiderman',
  isCloudSyncEnabled: false,
  currency: 'INR',
  dataFilter: 'all',
  density: 'Compact'
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
  const [wealthItems, setWealthItems] = useState<WealthItem[]>([]);
  const [rules, setRules] = useState<BudgetRule[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [isShowingNotifications, setIsShowingNotifications] = useState(false);
  const [isShowingVersionLog, setIsShowingVersionLog] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<Expense | Income | WealthItem | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const addNotification = useCallback((notif: Omit<Notification, 'timestamp' | 'read'> & { id?: string }) => {
    const id = notif.id || Math.random().toString(36).substring(2, 11);
    const newNotif: Notification = {
      ...notif,
      id,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    setNotifications(prev => {
      const index = prev.findIndex(n => n.id === id);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...newNotif };
        return updated;
      }
      return [newNotif, ...prev].slice(0, 50);
    });
  }, []);

  const generateMockData = useCallback(() => {
    const newExpenses: Expense[] = [];
    const newIncomes: Income[] = [];
    const newWealth: WealthItem[] = [];
    const today = new Date();

    newWealth.push({ id: 'mock-w1', type: 'Investment', category: 'Checking Account', name: 'Primary Bank (HDFC)', value: 485000, date: today.toISOString(), isMock: true });
    newWealth.push({ id: 'mock-w2', type: 'Investment', category: 'Savings Account', name: 'Emergency Vault', value: 1250000, date: today.toISOString(), isMock: true });
    newWealth.push({ id: 'mock-w3', type: 'Investment', category: 'Mutual Fund', name: 'Quant Small Cap', value: 350000, date: today.toISOString(), isMock: true });
    newWealth.push({ id: 'mock-w4', type: 'Investment', category: 'Stock', name: 'Bluechip Portfolio', value: 850000, date: today.toISOString(), isMock: true });
    newWealth.push({ id: 'mock-w7', type: 'Liability', category: 'Loan', name: 'Home Mortgage', value: 4500000, date: today.toISOString(), isMock: true });

    for (let m = 0; m < 6; m++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      // Income
      newIncomes.push({
        id: `mock-inc-sal-${m}`,
        amount: 285000,
        date: new Date(year, month, 1).toISOString().split('T')[0],
        type: 'Salary',
        note: 'Primary Employment Credit',
        isMock: true
      });

      // Needs
      newExpenses.push({
        id: `mock-rent-${m}`,
        amount: 65000,
        date: new Date(year, month, 5).toISOString().split('T')[0],
        category: 'Needs',
        subCategory: 'Rent/Mortgage',
        merchant: 'Skyline Properties',
        isConfirmed: true,
        isMock: true
      });

      newExpenses.push({
        id: `mock-grocery-${m}`,
        amount: Math.round(12000 + Math.random() * 5000),
        date: new Date(year, month, 10).toISOString().split('T')[0],
        category: 'Needs',
        subCategory: 'Groceries',
        merchant: 'BigBasket',
        isConfirmed: true,
        isMock: true
      });

      newExpenses.push({
        id: `mock-util-${m}`,
        amount: Math.round(4000 + Math.random() * 2000),
        date: new Date(year, month, 12).toISOString().split('T')[0],
        category: 'Needs',
        subCategory: 'Utilities',
        merchant: 'Electricity Board',
        isConfirmed: true,
        isMock: true
      });

      // Savings
      newExpenses.push({
        id: `mock-sip-${m}`,
        amount: 50000,
        date: new Date(year, month, 7).toISOString().split('T')[0],
        category: 'Savings',
        subCategory: 'SIP/Mutual Fund',
        merchant: 'Groww',
        isConfirmed: true,
        isMock: true
      });

      newExpenses.push({
        id: `mock-emergency-${m}`,
        amount: 20000,
        date: new Date(year, month, 20).toISOString().split('T')[0],
        category: 'Savings',
        subCategory: 'Emergency Fund',
        merchant: 'Internal Transfer',
        isConfirmed: true,
        isMock: true
      });

      // Wants
      newExpenses.push({
        id: `mock-dining-${m}`,
        amount: Math.round(8000 + Math.random() * 4000),
        date: new Date(year, month, 15).toISOString().split('T')[0],
        category: 'Wants',
        subCategory: 'Dining',
        merchant: 'Zomato',
        isConfirmed: true,
        isMock: true
      });

      newExpenses.push({
        id: `mock-ent-${m}`,
        amount: Math.round(2000 + Math.random() * 3000),
        date: new Date(year, month, 22).toISOString().split('T')[0],
        category: 'Wants',
        subCategory: 'Entertainment',
        merchant: 'PVR Cinemas',
        isConfirmed: true,
        isMock: true
      });

      newExpenses.push({
        id: `mock-sub-${m}`,
        amount: 1499,
        date: new Date(year, month, 12).toISOString().split('T')[0],
        category: 'Wants',
        subCategory: 'Subscription',
        merchant: 'Netflix',
        isConfirmed: true,
        isMock: true
      });
    }
    return { newExpenses, newIncomes, newWealth };
  }, []);

  const handleLoadMockData = () => {
    triggerHaptic(30);
    const { newExpenses, newIncomes, newWealth } = generateMockData();
    setExpenses(newExpenses);
    setIncomes(newIncomes);
    setWealthItems(newWealth);
    
    // Default initial budget items with subcategories
    setBudgetItems([
      { id: 'b1', name: 'Rent & Maintenance', amount: 65000, category: 'Needs', subCategory: 'Rent/Mortgage' },
      { id: 'b2', name: 'Groceries & Household', amount: 18000, category: 'Needs', subCategory: 'Groceries' },
      { id: 'b3', name: 'Utilities & Bills', amount: 8000, category: 'Needs', subCategory: 'Utilities' },
      { id: 'b4', name: 'School Fees', amount: 25000, category: 'Needs', subCategory: 'Education' },
      { id: 'b5', name: 'Leisure & Dining', amount: 20000, category: 'Wants', subCategory: 'Dining' },
      { id: 'b6', name: 'Subscriptions', amount: 5000, category: 'Wants', subCategory: 'Subscription' },
      { id: 'b7', name: 'SIP Investment', amount: 50000, category: 'Savings', subCategory: 'SIP/Mutual Fund' },
      { id: 'b8', name: 'Emergency Buffer', amount: 20000, category: 'Savings', subCategory: 'Emergency Fund' }
    ]);

    // Add default recurring items
    setRecurringItems([
      {
        id: 'rec1',
        amount: 65000,
        category: 'Needs',
        subCategory: 'Rent/Mortgage',
        note: 'Monthly Rent',
        merchant: 'Skyline Properties',
        frequency: 'Monthly',
        nextDueDate: '2025-02-05'
      },
      {
        id: 'rec2',
        amount: 50000,
        category: 'Savings',
        subCategory: 'SIP/Mutual Fund',
        note: 'Equity SIP',
        merchant: 'Groww',
        frequency: 'Monthly',
        nextDueDate: '2025-02-07'
      },
      {
        id: 'rec3',
        amount: 1499,
        category: 'Wants',
        subCategory: 'Subscription',
        note: 'Netflix Premium',
        merchant: 'Netflix',
        frequency: 'Monthly',
        nextDueDate: '2025-02-12'
      }
    ]);

    addNotification({
      type: 'Activity',
      title: 'Sample Data Loaded',
      message: 'Financial state updated with comprehensive 6-month historical mock data.',
      severity: 'success'
    });
    
    setCurrentView('Dashboard');
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let loadedDataFound = false;
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.settings) setSettings({ ...INITIAL_SETTINGS, ...parsed.settings, density: 'Compact' });
        if (parsed.expenses) { setExpenses(parsed.expenses); loadedDataFound = true; }
        if (parsed.incomes) setIncomes(parsed.incomes);
        if (parsed.wealthItems) setWealthItems(parsed.wealthItems);
        if (parsed.rules) setRules(parsed.rules);
        if (parsed.user) { setUser(parsed.user); setIsAuthenticated(true); }
        if (parsed.recurringItems) setRecurringItems(parsed.recurringItems);
        if (parsed.budgetItems) setBudgetItems(parsed.budgetItems);
        if (parsed.notifications) setNotifications(parsed.notifications);
      } catch (e) {
        console.error("Failed to parse local storage", e);
      }
    }

    if (!loadedDataFound) {
      handleLoadMockData();
    }

    setIsLoading(false);
  }, []); // Only run once on mount

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        settings, expenses, incomes, wealthItems, rules, user, recurringItems, budgetItems, notifications 
      }));
    }
  }, [settings, expenses, incomes, wealthItems, rules, user, recurringItems, budgetItems, notifications, isLoading]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = settings.theme === 'dark' || 
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    root.setAttribute('data-theme', settings.appTheme || 'Spiderman');
  }, [settings.theme, settings.appTheme]);

  const handleClearNotifications = () => { triggerHaptic(); setNotifications([]); };
  const handleMarkNotificationsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const handleCloudSync = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    triggerHaptic();
    try {
      const data: BackupData = { 
        expenses, incomes, wealthItems, rules, recurringItems, settings, timestamp: new Date().toISOString() 
      };
      const token = user?.accessToken || 'guest_token';
      const syncTime = await syncToGoogleDrive(token, data);
      setSettings(prev => ({ ...prev, lastSynced: syncTime }));
      addNotification({ type: 'Activity', title: 'State Persisted', message: 'Vault sync verified.', severity: 'success' });
    } catch (error) {
      addNotification({ type: 'Activity', title: 'Sync Error', message: 'Vault unreachable.', severity: 'error' });
    } finally { setIsSyncing(false); }
  }, [user, expenses, incomes, wealthItems, rules, recurringItems, settings, addNotification]);

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    setSettings(prev => ({ ...prev, isOnboarded: true }));
    setIsAuthenticated(true);
  };

  const handleLogout = () => { triggerHaptic(20); setUser(null); setIsAuthenticated(false); };

  const handleAddBudget = (item: Omit<BudgetItem, 'id'>) => {
    triggerHaptic();
    setBudgetItems(prev => [...prev, { ...item, id: Math.random().toString(36).substring(2, 11) }]);
  };

  const handleDeleteBudget = (id: string) => {
    triggerHaptic();
    setBudgetItems(prev => prev.filter(b => b.id !== id));
  };

  const handleDeleteExpense = (id: string) => {
    triggerHaptic(20);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    setIsAddingRecord(false);
  };

  const handleDeleteIncome = (id: string) => {
    triggerHaptic(20);
    setIncomes(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateIncome = (id: string, updates: Partial<Income>) => {
    setIncomes(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    setIsAddingRecord(false);
  };

  const handleAddWealth = (item: Omit<WealthItem, 'id'>) => {
    setWealthItems(prev => [...prev, { ...item, id: Math.random().toString(36).substring(2, 11) }]);
  };

  const handleUpdateWealth = (id: string, updates: Partial<WealthItem>) => {
    setWealthItems(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const handleDeleteWealth = (id: string) => {
    triggerHaptic(20);
    setWealthItems(prev => prev.filter(w => w.id !== id));
  };

  const handleTransfer = (fromId: string, toId: string, amount: number, date: string, note: string) => {
    setWealthItems(prev => prev.map(w => {
      if (w.id === fromId) return { ...w, value: w.value - amount };
      if (w.id === toId) return { ...w, value: w.value + amount };
      return w;
    }));
    addNotification({
      type: 'Activity',
      title: 'Transfer Executed',
      message: `Shifted ${getCurrencySymbol(settings.currency)}${amount} between accounts.`,
      severity: 'success'
    });
    setIsAddingRecord(false);
  };

  const handleAddExpense = (expense: Omit<Expense, 'id'>, frequency: Frequency) => {
    const id = Math.random().toString(36).substring(2, 11);
    const roundedAmt = Math.round(expense.amount);
    setExpenses(prev => [...prev, { ...expense, id, amount: roundedAmt }]);
    if (frequency !== 'None') {
      const nextDueDate = calculateNextDueDate(expense.date, frequency);
      setRecurringItems(prev => [...prev, {
        id: Math.random().toString(36).substring(2, 11),
        amount: roundedAmt,
        category: expense.category,
        subCategory: expense.subCategory,
        note: expense.note || '',
        merchant: expense.merchant,
        frequency,
        nextDueDate
      }]);
    }
    setIsAddingRecord(false);
  };

  const handleAddIncome = (income: Omit<Income, 'id'>) => {
    const roundedAmt = Math.round(income.amount);
    setIncomes(prev => [...prev, { ...income, amount: roundedAmt, id: Math.random().toString(36).substring(2, 11) }]);
    if (income.targetAccountId) {
      setWealthItems(prev => prev.map(w => 
        w.id === income.targetAccountId ? { ...w, value: w.value + roundedAmt } : w
      ));
    }
    setIsAddingRecord(false);
  };

  const currentMonthIncome = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const realized = incomes
      .filter(i => { const d = new Date(i.date); return d.getMonth() === m && d.getFullYear() === y; })
      .reduce((sum, i) => sum + i.amount, 0);
    return Math.round(realized > 0 ? realized : settings.monthlyIncome);
  }, [incomes, viewDate, settings.monthlyIncome]);

  const totalSpent = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    return Math.round(expenses
      .filter(e => e.isConfirmed && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y)
      .reduce((sum, e) => sum + e.amount, 0));
  }, [expenses, viewDate]);

  const remainingPercentage = useMemo(() => {
    if (currentMonthIncome <= 0) return 100;
    const spentPerc = (totalSpent / currentMonthIncome) * 100;
    return Math.round(Math.max(0, 100 - spentPerc));
  }, [totalSpent, currentMonthIncome]);

  const handleViewChange = (v: View) => { triggerHaptic(); setCurrentView(v); };

  if (isLoading) return <div className="w-full h-screen bg-white dark:bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;
  if (!isAuthenticated) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="h-screen overflow-hidden bg-white dark:bg-slate-900 flex flex-col transition-colors duration-300">
      <header className="flex-none bg-gradient-to-b from-white/95 to-slate-50/95 dark:from-slate-950/95 dark:to-slate-900/95 px-4 py-3 border-b border-slate-100 dark:border-white/10 shadow-sm z-50 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex justify-between items-center w-full">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <svg 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                className="drop-shadow-sm active:scale-95 transition-transform"
              >
                <path d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" fill="currentColor" className="text-brand-primary" />
                <path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="currentColor" className="text-brand-primary" strokeWidth="2" strokeLinecap="round" />
                <text x="12" y="17" fontSize="6" fontWeight="900" textAnchor="middle" fill="white" style={{ fontFamily: 'Plus Jakarta Sans' }}>JK</text>
              </svg>
              <button onClick={() => { triggerHaptic(); setIsShowingVersionLog(true); }} className="bg-white/50 dark:bg-white/5 px-1.5 py-0.5 rounded-full border border-slate-100 dark:border-white/10 active:scale-95 transition-transform mt-1">
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500">v1.1.8</span>
              </button>
            </div>
            <h1 className="text-[9px] font-bold text-slate-900 dark:text-white lowercase tracking-tight mt-0.5 ml-1">just keep it</h1>
          </div>

          <nav className="flex items-center gap-1">
            <button onClick={() => handleViewChange('Dashboard')} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 active:scale-90 ${currentView === 'Dashboard' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><LayoutDashboard size={18} strokeWidth={2.5} /></button>
            <button onClick={() => handleViewChange('Budget')} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 active:scale-90 ${currentView === 'Budget' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><Target size={18} strokeWidth={2.5} /></button>
            <button onClick={() => handleViewChange('Accounts')} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 active:scale-90 ${currentView === 'Accounts' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><Wallet size={18} strokeWidth={2.5} /></button>
            <button onClick={() => handleViewChange('Transactions')} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 active:scale-90 ${currentView === 'Transactions' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><List size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setIsShowingNotifications(true); handleMarkNotificationsRead(); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 active:scale-90 relative ${isShowingNotifications ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}>
              <Bell size={18} strokeWidth={2.5} />
              {notifications.filter(n=>!n.read).length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-accent text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">{notifications.filter(n=>!n.read).length}</span>}
            </button>
            <button onClick={() => handleViewChange('Profile')} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 overflow-hidden border-2 ${currentView === 'Profile' ? 'border-brand-primary' : 'border-transparent'}`}>{user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" /> : <SettingsIcon size={17} />}</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-slate-900 relative">
        <div className="max-w-2xl mx-auto w-full px-4 h-full">
          {currentView === 'Dashboard' && <Dashboard expenses={expenses} incomes={incomes} wealthItems={wealthItems} settings={settings} user={user} onCategorizeClick={() => setIsCategorizing(true)} onConfirmExpense={(id, cat) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: cat, isConfirmed: true } : e))} onSmartAdd={() => {}} viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} onGoToDate={(y, m) => setViewDate(new Date(y, m, 1))} />}
          {currentView === 'Budget' && <BudgetPlanner budgetItems={budgetItems} recurringItems={recurringItems} expenses={expenses} settings={settings} onAddBudget={handleAddBudget} onDeleteBudget={handleDeleteBudget} viewDate={viewDate} />}
          {currentView === 'Accounts' && <Accounts wealthItems={wealthItems} settings={settings} onUpdateWealth={handleUpdateWealth} onDeleteWealth={handleDeleteWealth} onAddWealth={handleAddWealth} />}
          {currentView === 'Transactions' && <Transactions expenses={expenses} incomes={incomes} wealthItems={wealthItems} settings={settings} onDeleteExpense={handleDeleteExpense} onDeleteIncome={handleDeleteIncome} onDeleteWealth={handleDeleteWealth} onConfirm={(id, cat) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: cat, isConfirmed: true } : e))} onUpdateExpense={handleUpdateExpense} onEditRecord={(r) => { triggerHaptic(); setRecordToEdit(r); setIsAddingRecord(true); }} onAddBulk={(n) => setExpenses(p => [...p, ...n.map(x => ({ ...x, id: Math.random().toString(36).substring(2, 11), isConfirmed: true }))])} viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} onGoToDate={(y, m) => setViewDate(new Date(y, m, 1))} addNotification={addNotification} />}
          {currentView === 'Profile' && <Settings settings={settings} user={user} onLogout={handleLogout} onReset={() => { triggerHaptic(30); localStorage.removeItem(STORAGE_KEY); location.reload();}} onToggleTheme={() => { triggerHaptic(); setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' })); }} onUpdateAppTheme={(t) => { triggerHaptic(); setSettings(s => ({ ...s, appTheme: t })); }} onUpdateCurrency={(c) => setSettings(s => ({ ...s, currency: c }))} onUpdateDataFilter={(f) => { triggerHaptic(); setSettings(s => ({ ...s, dataFilter: f })); }} onUpdateSplit={(split) => setSettings(s => ({ ...s, split }))} onUpdateBaseIncome={(income) => setSettings(s => ({ ...s, monthlyIncome: Math.round(income) }))} onSync={handleCloudSync} onExport={() => {}} onImport={() => {}} isSyncing={isSyncing} onLoadMockData={handleLoadMockData} onClearExpenses={() => { triggerHaptic(20); setExpenses([]); setRecurringItems([]); addNotification({ type: 'Activity', title: 'History Flushed', message: 'Transaction history has been permanently cleared.', severity: 'warning' }); }} />}
        </div>
      </main>

      <Navbar currentView={currentView} remainingPercentage={remainingPercentage} onViewChange={(v) => { triggerHaptic(); if(v === 'Add') { setRecordToEdit(null); setIsAddingRecord(true); } else { setCurrentView(v); } }} />
      {isAddingRecord && (
        <AddRecord 
          settings={settings} wealthItems={wealthItems} expenses={expenses}
          onAdd={handleAddExpense} onAddIncome={handleAddIncome} 
          onTransfer={handleTransfer}
          onUpdateExpense={handleUpdateExpense}
          onUpdateIncome={handleUpdateIncome}
          onCancel={() => { triggerHaptic(); setIsAddingRecord(false); setRecordToEdit(null); }} 
          initialData={recordToEdit} 
        />
      )}
      {isCategorizing && <CategorizationModal settings={settings} expenses={expenses.filter(e => !e.isConfirmed)} onConfirm={(id, cat) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: cat, isConfirmed: true } : e))} onClose={() => { triggerHaptic(); setIsCategorizing(false); }} />}
      {isShowingNotifications && <NotificationPane notifications={notifications} onClose={() => { triggerHaptic(); setIsShowingNotifications(false); }} onClear={handleClearNotifications} />}
      {isShowingVersionLog && <VersionLog onClose={() => { triggerHaptic(); setIsShowingVersionLog(false); }} />}
    </div>
  );
};

export default App;
