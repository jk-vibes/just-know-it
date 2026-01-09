
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Expense, BudgetRule, UserSettings, Category, UserProfile, Frequency, RecurringItem, Income, IncomeType, AppTheme, Notification, WealthItem, WealthType, WealthCategory } from './types';
import Dashboard from './components/Dashboard';
import RecordList from './components/RecordList';
import AddRecord from './components/AddRecord';
import RulesEngine from './components/RulesEngine';
import Settings from './components/Settings';
import Navbar from './components/Navbar';
import CategorizationModal from './components/CategorizationModal';
import NotificationPane from './components/NotificationPane';
import AuthScreen from './components/AuthScreen';
import { Loader2, LayoutDashboard, List, Workflow, Settings as SettingsIcon, Bell, X, Sparkles, ShieldCheck, Zap, Globe, Wallet } from 'lucide-react';
import { DEFAULT_SPLIT, getCurrencySymbol } from './constants';
import { syncToGoogleDrive, restoreFromGoogleDrive, BackupData } from './services/cloudSync';

const STORAGE_KEY = 'jk_budget_data_v5';

const INITIAL_SETTINGS: UserSettings = {
  monthlyIncome: 300000,
  split: DEFAULT_SPLIT,
  isOnboarded: true, 
  theme: 'system',
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
  const [wealthItems, setWealthItems] = useState<WealthItem[]>([]);
  const [rules, setRules] = useState<BudgetRule[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [isShowingNotifications, setIsShowingNotifications] = useState(false);
  const [isShowingVersionLog, setIsShowingVersionLog] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<Expense | Income | WealthItem | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.incomes) setIncomes(parsed.incomes);
        if (parsed.wealthItems) setWealthItems(parsed.wealthItems);
        if (parsed.rules) setRules(parsed.rules);
        if (parsed.user) {
          setUser(parsed.user);
          setIsAuthenticated(true);
        }
        if (parsed.recurringItems) setRecurringItems(parsed.recurringItems);
        if (parsed.notifications) setNotifications(parsed.notifications);
      } catch (e) {
        console.error("Failed to parse local storage", e);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        settings, expenses, incomes, wealthItems, rules, user, recurringItems, notifications 
      }));
    }
  }, [settings, expenses, incomes, wealthItems, rules, user, recurringItems, notifications, isLoading]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = settings.theme === 'dark' || 
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    root.setAttribute('data-theme', settings.appTheme || 'Standard');
  }, [settings.theme, settings.appTheme]);

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

  const handleClearNotifications = () => setNotifications([]);
  const handleMarkNotificationsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const handleLoadMockData = useCallback(() => {
    const newExpenses: Expense[] = [];
    const newIncomes: Income[] = [];
    const newWealth: WealthItem[] = [];
    const today = new Date();

    // Generate 6 months of data
    for (let m = 0; m < 6; m++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      // Income
      newIncomes.push({
        id: `mock-inc-${m}`,
        amount: 250000 + Math.random() * 50000,
        date: monthDate.toISOString().split('T')[0],
        type: 'Salary',
        note: 'Monthly Salary Credit',
        isMock: true
      });

      if (Math.random() > 0.5) {
        newIncomes.push({
          id: `mock-freelance-${m}`,
          amount: 20000 + Math.random() * 30000,
          date: new Date(year, month, 15).toISOString().split('T')[0],
          type: 'Freelance',
          note: 'Project Payment',
          isMock: true
        });
      }

      // Expenses - Fixed
      newExpenses.push({
        id: `mock-rent-${m}`,
        amount: 45000,
        date: new Date(year, month, 5).toISOString().split('T')[0],
        category: 'Needs',
        merchant: 'Home Rental Corp',
        isConfirmed: true,
        isMock: true
      });

      // Expenses - Variable
      const merchants = [
        { name: 'Starbucks', cat: 'Wants' as Category, amt: [200, 800] },
        { name: 'Walmart', cat: 'Needs' as Category, amt: [2000, 6000] },
        { name: 'Amazon', cat: 'Wants' as Category, amt: [500, 5000] },
        { name: 'Netflix', cat: 'Wants' as Category, amt: [800, 800] },
        { name: 'Uber', cat: 'Needs' as Category, amt: [300, 1200] },
        { name: 'Shell Oil', cat: 'Needs' as Category, amt: [1500, 3500] },
        { name: 'Local Cafe', cat: 'Wants' as Category, amt: [400, 1200] },
        { name: 'Gym Membership', cat: 'Needs' as Category, amt: [2500, 2500] },
      ];

      for (let i = 0; i < 15; i++) {
        const mIdx = Math.floor(Math.random() * merchants.length);
        const merchant = merchants[mIdx];
        newExpenses.push({
          id: `mock-exp-${m}-${i}`,
          amount: merchant.amt[0] + Math.random() * (merchant.amt[1] - merchant.amt[0]),
          date: new Date(year, month, Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
          category: merchant.cat,
          merchant: merchant.name,
          isConfirmed: true,
          isMock: true
        });
      }
    }

    // Wealth Items (Current Portfolio)
    newWealth.push({
      id: 'mock-wealth-1',
      type: 'Investment',
      category: 'Stock',
      name: 'NVIDIA Portfolio',
      value: 1250000,
      date: today.toISOString(),
      isMock: true
    });
    newWealth.push({
      id: 'mock-wealth-2',
      type: 'Investment',
      category: 'Mutual Fund',
      name: 'HDFC Index Fund',
      value: 840000,
      date: today.toISOString(),
      isMock: true
    });
    newWealth.push({
      id: 'mock-wealth-3',
      type: 'Liability',
      category: 'Credit Card',
      name: 'Amex Platinum',
      value: 42000,
      date: today.toISOString(),
      isMock: true
    });

    setExpenses(newExpenses);
    setIncomes(newIncomes);
    setWealthItems(newWealth);
    
    addNotification({
      type: 'Activity',
      title: 'Demo Data Injected',
      message: '6 months of transactions and a sample portfolio have been loaded for preview.',
      severity: 'success'
    });
  }, [addNotification]);

  const handleCloudSync = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const data: BackupData = { 
        expenses, incomes, wealthItems, rules, recurringItems, settings, timestamp: new Date().toISOString() 
      };
      const token = user?.accessToken || 'guest_sync_token';
      const syncTime = await syncToGoogleDrive(token, data);
      setSettings(prev => ({ ...prev, lastSynced: syncTime }));
      addNotification({
        type: 'Activity',
        title: 'Cloud Backup Complete',
        message: 'Your transactions and portfolio were successfully synced to Google Drive.',
        severity: 'success'
      });
    } catch (error) {
      addNotification({
        type: 'Activity',
        title: 'Sync Failed',
        message: 'Unable to connect to Google Drive. Your data remains safe in local storage.',
        severity: 'error'
      });
    } finally {
      setIsSyncing(false);
    }
  }, [user, expenses, incomes, wealthItems, rules, recurringItems, settings, addNotification]);

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    setSettings(prev => ({ ...prev, isOnboarded: true }));
    setIsAuthenticated(true);
    addNotification({
      type: 'Activity',
      title: 'Success',
      message: profile.id.startsWith('guest') ? 'Welcome, Guest! Data is stored locally.' : `Welcome back, ${profile.name}!`,
      severity: 'success'
    });
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    addNotification({
      type: 'Activity',
      title: 'Signed Out',
      message: 'You have been securely logged out.',
      severity: 'info'
    });
  };

  const handleAddExpense = (expense: Omit<Expense, 'id'>, frequency: Frequency) => {
    const id = Math.random().toString(36).substring(2, 11);
    setExpenses(prev => [...prev, { ...expense, id }]);
    if (frequency !== 'None') {
      const nextDueDate = calculateNextDueDate(expense.date, frequency);
      setRecurringItems(prev => [...prev, {
        id: Math.random().toString(36).substring(2, 11),
        amount: expense.amount,
        category: expense.category,
        subCategory: expense.subCategory,
        note: expense.note || '',
        merchant: expense.merchant,
        frequency,
        nextDueDate
      }]);
    }
    setIsAddingRecord(false);
    addNotification({
      type: 'Activity',
      title: 'Expense Saved',
      message: `${expense.merchant} recorded in ${expense.category}.`,
      severity: 'success'
    });
  };

  const handleAddIncome = (income: Omit<Income, 'id'>) => {
    setIncomes(prev => [...prev, { ...income, id: Math.random().toString(36).substring(2, 11) }]);
    setIsAddingRecord(false);
    addNotification({
      type: 'Activity',
      title: 'Income Added',
      message: `${getCurrencySymbol(settings.currency)}${income.amount} inflow recorded.`,
      severity: 'success'
    });
  };

  const handleAddWealth = (item: Omit<WealthItem, 'id'>) => {
    setWealthItems(prev => [...prev, { ...item, id: Math.random().toString(36).substring(2, 11) }]);
    setIsAddingRecord(false);
    addNotification({
      type: 'Activity',
      title: 'Portfolio Updated',
      message: `${item.name} added to your ${item.type}s.`,
      severity: 'success'
    });
  };

  const handleUpdateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    setIsAddingRecord(false);
    setRecordToEdit(null);
    addNotification({
      type: 'Activity',
      title: 'Update Success',
      message: 'Transaction details modified.',
      severity: 'success'
    });
  };

  const handleUpdateIncome = (id: string, updates: Partial<Income>) => {
    setIncomes(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    setIsAddingRecord(false);
    setRecordToEdit(null);
    addNotification({
      type: 'Activity',
      title: 'Update Success',
      message: 'Income source updated.',
      severity: 'success'
    });
  };

  const handleUpdateWealth = (id: string, updates: Partial<WealthItem>) => {
    setWealthItems(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    setIsAddingRecord(false);
    setRecordToEdit(null);
    addNotification({
      type: 'Activity',
      title: 'Portfolio Updated',
      message: 'Asset valuation synchronized.',
      severity: 'success'
    });
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    addNotification({
      type: 'Activity',
      title: 'Deleted',
      message: 'Expense removed from history.',
      severity: 'warning'
    });
  };
  const handleDeleteIncome = (id: string) => {
    setIncomes(prev => prev.filter(i => i.id !== id));
    addNotification({
      type: 'Activity',
      title: 'Deleted',
      message: 'Income record removed.',
      severity: 'warning'
    });
  };
  const handleDeleteWealth = (id: string) => {
    setWealthItems(prev => prev.filter(w => w.id !== id));
    addNotification({
      type: 'Activity',
      title: 'Deleted',
      message: 'Asset/Liability removed from portfolio.',
      severity: 'warning'
    });
  };

  const filteredExpenses = useMemo(() => {
    if (settings.dataFilter === 'all') return expenses;
    if (settings.dataFilter === 'mock') return expenses.filter(e => e.isMock);
    return expenses.filter(e => !e.isMock);
  }, [expenses, settings.dataFilter]);

  const filteredIncomes = useMemo(() => {
    if (settings.dataFilter === 'all') return incomes;
    if (settings.dataFilter === 'mock') return incomes.filter(i => i.isMock);
    return incomes.filter(i => !i.isMock);
  }, [incomes, settings.dataFilter]);

  const filteredWealth = useMemo(() => {
    if (settings.dataFilter === 'all') return wealthItems;
    if (settings.dataFilter === 'mock') return wealthItems.filter(w => w.isMock);
    return wealthItems.filter(w => !w.isMock);
  }, [wealthItems, settings.dataFilter]);

  const currentMonthIncome = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const realized = filteredIncomes
      .filter(i => {
        const d = new Date(i.date);
        return d.getMonth() === m && d.getFullYear() === y;
      })
      .reduce((sum, i) => sum + i.amount, 0);
    return realized > 0 ? realized : settings.monthlyIncome;
  }, [filteredIncomes, viewDate, settings.monthlyIncome]);

  const totalSpent = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    return filteredExpenses
      .filter(e => e.isConfirmed && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses, viewDate]);

  const remainingPercentage = useMemo(() => {
    if (currentMonthIncome <= 0) return 100;
    const spentPerc = (totalSpent / currentMonthIncome) * 100;
    return Math.max(0, 100 - spentPerc);
  }, [totalSpent, currentMonthIncome]);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading) return (
    <div className="w-full h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
      <Loader2 className="animate-spin text-brand-primary" size={32} />
    </div>
  );

  if (!isAuthenticated) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="h-screen overflow-hidden bg-white dark:bg-slate-900 flex flex-col transition-colors duration-300">
      <header className="flex-none bg-gradient-to-b from-white/95 to-slate-50/95 dark:from-slate-950/95 dark:to-slate-900/95 px-4 py-2 border-b border-slate-100 dark:border-white/10 shadow-sm transition-colors z-50 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex justify-between items-center w-full">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-brand-primary">
                 <path d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" fill="currentColor" />
                 <path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                 <text x="12" y="17" fontSize="8" fontWeight="900" textAnchor="middle" fill="white">JK</text>
              </svg>
              <button 
                onClick={() => setIsShowingVersionLog(true)}
                className="bg-white/50 dark:bg-white/5 px-1.5 py-0.5 rounded-full border border-slate-100 dark:border-white/10 active:scale-95 transition-transform"
              >
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500">v1.0</span>
              </button>
            </div>
            <h1 className="text-[9px] font-bold text-slate-900 dark:text-white lowercase tracking-tight">just keep it</h1>
          </div>

          <nav className="flex items-center gap-1">
            {/* Unified Dashboard/Expenses Toggle with Active Highlighter */}
            <button
              onClick={() => setCurrentView(currentView === 'Dashboard' ? 'Expenses' : 'Dashboard')}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${
                (currentView === 'Dashboard' || currentView === 'Expenses') 
                ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' 
                : 'border-transparent text-slate-400'
              } active:scale-95`}
              title={currentView === 'Dashboard' ? 'View Transactions' : 'View Dashboard'}
            >
              {currentView === 'Dashboard' ? (
                <List size={20} strokeWidth={2.5} />
              ) : (
                <LayoutDashboard size={20} strokeWidth={2.5} />
              )}
            </button>

            <button
              onClick={() => setCurrentView('Rules')}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${
                currentView === 'Rules' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'
              }`}
            >
              <Workflow size={20} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => {
                setIsShowingNotifications(true);
                handleMarkNotificationsRead();
              }}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 relative ${
                isShowingNotifications ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'
              }`}
            >
              <Bell size={20} strokeWidth={2.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-accent text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentView('Profile')}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all overflow-hidden border-2 ${
                currentView === 'Profile' ? 'border-brand-primary' : 'border-transparent'
              }`}
            >
              {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="User Profile" /> : <SettingsIcon size={17} />}
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-slate-900 relative">
        <div className="max-w-2xl mx-auto w-full px-4 h-full">
          {currentView === 'Dashboard' && <Dashboard 
            expenses={filteredExpenses} incomes={filteredIncomes} wealthItems={filteredWealth}
            settings={{ ...settings, monthlyIncome: currentMonthIncome }} user={user} 
            onCategorizeClick={() => setIsCategorizing(true)} 
            onConfirmExpense={(id, cat) => {
              setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: cat, isConfirmed: true } : e));
              addNotification({ type: 'Activity', title: 'Confirmed', message: 'Transaction verified.', severity: 'success' });
            }} 
            onSmartAdd={() => {}} viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} 
            onGoToDate={(y, m) => setViewDate(new Date(y, m, 1))} 
          />}
          {currentView === 'Expenses' && <RecordList 
            expenses={filteredExpenses} incomes={filteredIncomes} wealthItems={filteredWealth}
            settings={{ ...settings, monthlyIncome: currentMonthIncome }} 
            onDeleteExpense={handleDeleteExpense} onDeleteIncome={handleDeleteIncome} onDeleteWealth={handleDeleteWealth}
            onConfirm={(id, cat) => {
              setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: cat, isConfirmed: true } : e));
              addNotification({ type: 'Activity', title: 'Confirmed', message: 'Transaction verified.', severity: 'success' });
            }} 
            onUpdateExpense={handleUpdateExpense} onEditRecord={(r) => { setRecordToEdit(r); setIsAddingRecord(true); }} 
            onAddBulk={(n) => {
              setExpenses(p => [...p, ...n.map(x => ({ ...x, id: Math.random().toString(36).substring(2, 11), isConfirmed: true }))]);
            }} 
            viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} 
            onGoToDate={(y, m) => setViewDate(new Date(y, m, 1))} addNotification={addNotification}
          />}
          {currentView === 'Rules' && <RulesEngine 
            rules={rules} recurringItems={recurringItems} 
            onAddRule={(r) => { 
              setRules(p => [...p, { ...r, id: Math.random().toString(36).substring(2, 11) }]); 
              addNotification({ type: 'Activity', title: 'Rule Created', message: `Keywords matching "${r.keyword}" will now be auto-assigned to ${r.category}.`, severity: 'success' }); 
            }} 
            onDeleteRule={(id) => {
              setRules(p => p.filter(x => x.id !== id));
              addNotification({ type: 'Activity', title: 'Rule Deleted', message: 'Keyword mapping removed.', severity: 'warning' });
            }} 
            onDeleteRecurring={(id) => {
              setRecurringItems(p => p.filter(x => x.id !== id));
              addNotification({ type: 'Activity', title: 'Subscription Cancelled', message: 'Recurring tracking stopped.', severity: 'warning' });
            }} 
          />}
          {currentView === 'Profile' && <Settings 
            settings={settings} user={user} onLogout={handleLogout} 
            onReset={() => {localStorage.removeItem(STORAGE_KEY); location.reload();}} onToggleTheme={() => setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))} 
            onUpdateAppTheme={(t) => {
              setSettings(s => ({ ...s, appTheme: t }));
              addNotification({ type: 'Activity', title: 'Theme Applied', message: `Interface switched to ${t}.`, severity: 'info' });
            }} 
            onUpdateCurrency={(c) => {
              setSettings(s => ({ ...s, currency: c }));
              addNotification({ type: 'Activity', title: 'Currency Changed', message: `Values now displaying in ${c}.`, severity: 'info' });
            }} 
            onUpdateDataFilter={(f) => {
              setSettings(s => ({ ...s, dataFilter: f }));
              addNotification({ type: 'Activity', title: 'View Filtered', message: `Displaying ${f} entries only.`, severity: 'info' });
            }} 
            onUpdateSplit={(split) => {
              setSettings(s => ({ ...s, split }));
              addNotification({ type: 'Activity', title: 'Budget Updated', message: 'Allocation targets synchronized.', severity: 'success' });
            }} 
            onUpdateBaseIncome={(income) => {
              setSettings(s => ({ ...s, monthlyIncome: income }));
              addNotification({ type: 'Activity', title: 'Base Updated', message: `Monthly expectation set to ${getCurrencySymbol(settings.currency)}${income.toLocaleString()}`, severity: 'info' });
            }} 
            onSync={handleCloudSync} isSyncing={isSyncing} onLoadMockData={handleLoadMockData} onClearExpenses={() => { setExpenses([]); setIncomes([]); setWealthItems([]); addNotification({ type: 'Activity', title: 'History Cleared', message: 'All transactions have been purged.', severity: 'warning' }); }} 
          />}
        </div>
      </main>

      <Navbar currentView={currentView} remainingPercentage={remainingPercentage} onViewChange={(v) => { if(v === 'Add') { setRecordToEdit(null); setIsAddingRecord(true); } else { setCurrentView(v); } }} />
      {isAddingRecord && <AddRecord 
        settings={{ ...settings, monthlyIncome: currentMonthIncome }} 
        onAdd={handleAddExpense} onAddIncome={handleAddIncome} onAddWealth={handleAddWealth}
        onUpdateExpense={handleUpdateExpense} onUpdateIncome={handleUpdateIncome} onUpdateWealth={handleUpdateWealth}
        onCancel={() => { setIsAddingRecord(false); setRecordToEdit(null); }} initialData={recordToEdit} 
      />}
      {isCategorizing && <CategorizationModal settings={{ ...settings, monthlyIncome: currentMonthIncome }} expenses={expenses.filter(e => !e.isConfirmed)} onConfirm={(id, cat) => {
        setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: cat, isConfirmed: true } : e));
      }} onClose={() => setIsCategorizing(false)} />}
      {isShowingNotifications && <NotificationPane notifications={notifications} onClose={() => setIsShowingNotifications(false)} onClear={handleClearNotifications} />}
      
      {/* Version Log Modal */}
      {isShowingVersionLog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-md bg-black/40">
          <div className="bg-white dark:bg-slate-900 w-full max-sm rounded-[40px] shadow-2xl overflow-hidden border border-white/10 animate-slide-up">
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">v1.0 Stable</h2>
                  <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.25em]">Release Notes</p>
                </div>
                <button onClick={() => setIsShowingVersionLog(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                {[
                  { icon: Sparkles, title: 'AI Decisions', desc: 'Predictive analysis for big purchases using Gemini 3 Pro.' },
                  { icon: Zap, title: 'Smart Sync', desc: 'Real-time transaction extraction from SMS/text clipboard.' },
                  { icon: Globe, title: 'Cloud Portal', desc: 'Secure Google Drive backups for cross-device wealth tracking.' },
                  { icon: Wallet, title: 'Net Worth', desc: 'Combined asset & liability management with growth charts.' },
                  { icon: ShieldCheck, title: 'Rule Engine', desc: 'Automated merchant-to-category mapping system.' }
                ].map((f, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex-none p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-brand-primary group-hover:scale-110 transition-transform">
                      <f.icon size={18} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{f.title}</h4>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed mt-1">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setIsShowingVersionLog(false)}
                className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-3xl text-xs uppercase tracking-[0.2em] shadow-xl hover:opacity-90 active:scale-95 transition-all"
              >
                Continue Exploring
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
