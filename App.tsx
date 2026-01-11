import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Expense, BudgetRule, UserSettings, Category, UserProfile, Frequency, RecurringItem, Income, IncomeType, AppTheme, Notification, WealthItem, WealthType, WealthCategory, DensityLevel, BudgetItem, Bill } from './types';
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
import SmartAlert from './components/SmartAlert';
import Footer from './components/Footer';
import { Loader2, LayoutDashboard, List, Settings as SettingsIcon, Bell, Wallet, Target } from 'lucide-react';
import { DEFAULT_SPLIT, getCurrencySymbol } from './constants';
import { syncToGoogleDrive, restoreFromGoogleDrive, BackupData } from './services/cloudSync';
import { triggerHaptic } from './utils/haptics';
import { getTacticalStrategy } from './services/geminiService';

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
  const [bills, setBills] = useState<Bill[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  
  const [isShowingNotifications, setIsShowingNotifications] = useState(false);
  const [isShowingVersionLog, setIsShowingVersionLog] = useState(false);
  const [activeSmartAlert, setActiveSmartAlert] = useState<any | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<any | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const addNotification = useCallback((notif: Omit<Notification, 'timestamp' | 'read'> & { id?: string }) => {
    const id = notif.id || Math.random().toString(36).substring(2, 11);
    const newNotif: Notification = { ...notif, id, timestamp: new Date().toISOString(), read: false };
    setNotifications(prev => {
      const index = prev.findIndex(n => n.id === id);
      if (index !== -1) { const updated = [...prev]; updated[index] = { ...updated[index], ...newNotif }; return updated; }
      return [newNotif, ...prev].slice(0, 50);
    });
  }, []);

  const handlePurgeAllMockData = useCallback(() => {
    triggerHaptic(40);
    setExpenses(prev => prev.filter(e => !e.isMock));
    setIncomes(prev => prev.filter(i => !i.isMock));
    setWealthItems(prev => prev.filter(w => !w.isMock));
    setBudgetItems(prev => prev.filter(b => !b.isMock));
    // Also clear mock bills if they exist (none currently added in generateMockData but safe for future)
    setBills(prev => prev.filter(b => !('isMock' in b && b.isMock)));
    
    addNotification({
      type: 'Activity',
      title: 'Historical Cleanse Successful',
      message: 'All simulated mock datasets have been permanently scrubbed from local memory.',
      severity: 'success'
    });
  }, [addNotification]);

  const handleExportData = () => {
    triggerHaptic();
    const data = { settings, expenses, incomes, wealthItems, bills, budgetItems, notifications };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jk_wealth_snapshot_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification({ type: 'Activity', title: 'Snapshot Created', message: 'Application state exported to JSON file.', severity: 'success' });
  };

  const handleImportData = (file: File) => {
    triggerHaptic();
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.incomes) setIncomes(parsed.incomes);
        if (parsed.wealthItems) setWealthItems(parsed.wealthItems);
        if (parsed.bills) setBills(parsed.bills);
        if (parsed.budgetItems) setBudgetItems(parsed.budgetItems);
        if (parsed.notifications) setNotifications(parsed.notifications);
        addNotification({ type: 'Activity', title: 'Snapshot Restored', message: 'Successfully imported application state from file.', severity: 'success' });
      } catch (err) {
        addNotification({ type: 'Activity', title: 'Restoration Failed', message: 'Selected file is corrupted or incompatible.', severity: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handleSyncToCloud = async () => {
    if (!user?.accessToken) return;
    triggerHaptic();
    setIsSyncing(true);
    try {
      const lastSynced = await syncToGoogleDrive(user.accessToken, {
        expenses, incomes, wealthItems, budgetItems, bills, notifications, settings
      });
      setSettings(prev => ({ ...prev, lastSynced }));
      addNotification({ type: 'AI', title: 'Vault Secured', message: 'Current financial state mirrored to secure cloud storage.', severity: 'success' });
    } catch (e) {
      addNotification({ type: 'Activity', title: 'Sync Error', message: 'Cloud handshake interrupted. Check your network.', severity: 'error' });
    } finally { setIsSyncing(false); }
  };

  const handleLogin = async (profile: UserProfile) => { 
    setUser(profile); 
    setSettings(prev => ({ ...prev, isOnboarded: true })); 
    setIsAuthenticated(true); 
    
    // Automatically attempt cloud restore on login if access token exists
    if (profile.accessToken) {
      setIsSyncing(true);
      const restored = await restoreFromGoogleDrive(profile.accessToken);
      if (restored) {
        setExpenses(restored.expenses);
        setIncomes(restored.incomes);
        setWealthItems(restored.wealthItems);
        setBudgetItems(restored.budgetItems);
        setBills(restored.bills);
        setNotifications(restored.notifications);
        setSettings(prev => ({ ...prev, ...restored.settings, lastSynced: restored.timestamp }));
        addNotification({ type: 'AI', title: 'Identity Verified', message: 'Financial state synchronized with your secure Google cloud vault.', severity: 'success' });
      }
      setIsSyncing(false);
    }
  };

  const generateMockData = useCallback(() => {
    const newExpenses: Expense[] = [];
    const newIncomes: Income[] = [];
    const newWealth: WealthItem[] = [];
    const today = new Date();

    newWealth.push({ id: 'mock-w1', type: 'Investment', category: 'Checking Account', name: 'Primary Bank (HDFC)', value: 485000, date: today.toISOString(), isMock: true });
    newWealth.push({ id: 'mock-w2', type: 'Investment', category: 'Savings Account', name: 'Emergency Vault', value: 1250000, date: today.toISOString(), isMock: true });
    newWealth.push({ id: 'mock-w7', type: 'Liability', category: 'Loan', name: 'Home Mortgage', value: 4500000, date: today.toISOString(), isMock: true });

    const merchantPools: Record<Category, { name: string, sub: string, min: number, max: number }[]> = {
      Needs: [
        { name: 'Reliance Fresh', sub: 'Groceries', min: 800, max: 4500 },
        { name: 'Shell Fuel', sub: 'Fuel/Transport', min: 1500, max: 3500 },
        { name: 'Adani Electricity', sub: 'Utilities', min: 2000, max: 6000 },
        { name: 'BigBasket', sub: 'Groceries', min: 400, max: 2200 },
        { name: 'PharmEasy', sub: 'Health/Insurance', min: 300, max: 1800 },
        { name: 'Airtel Broadband', sub: 'Utilities', min: 999, max: 1500 },
        { name: 'Uber India', sub: 'Fuel/Transport', min: 150, max: 800 },
      ],
      Wants: [
        { name: 'Starbucks', sub: 'Dining', min: 350, max: 1200 },
        { name: 'Netflix', sub: 'Subscription', min: 199, max: 649 },
        { name: 'Amazon India', sub: 'Shopping', min: 500, max: 8000 },
        { name: 'Zomato', sub: 'Dining', min: 250, max: 1500 },
        { name: 'H&M', sub: 'Shopping', min: 1200, max: 5000 },
        { name: 'PVR Cinemas', sub: 'Entertainment', min: 600, max: 2500 },
        { name: 'Cult Fit', sub: 'Hobbies', min: 1200, max: 3000 },
        { name: 'Blue Tokai', sub: 'Dining', min: 220, max: 900 },
      ],
      Savings: [
        { name: 'Groww SIP', sub: 'SIP/Mutual Fund', min: 1000, max: 5000 },
        { name: 'CoinDCX', sub: 'Crypto', min: 500, max: 2000 },
        { name: 'Tanishq Digital Gold', sub: 'Gold', min: 1000, max: 10000 },
      ],
      Uncategorized: [{ name: 'ATM Withdrawal', sub: 'General', min: 500, max: 5000 }]
    };

    for (let m = 0; m < 6; m++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      newIncomes.push({
        id: `mock-inc-sal-${m}`,
        amount: 285000,
        date: new Date(year, month, 1).toISOString().split('T')[0],
        type: 'Salary',
        note: 'Primary Employment Credit',
        targetAccountId: 'mock-w1',
        isMock: true
      });

      newExpenses.push({
        id: `mock-rent-${m}`,
        amount: 65000,
        date: new Date(year, month, 5).toISOString().split('T')[0],
        category: 'Needs',
        subCategory: 'Rent/Mortgage',
        merchant: 'Skyline Properties',
        isConfirmed: true,
        sourceAccountId: 'mock-w1',
        isMock: true
      });

      newExpenses.push({
        id: `mock-sip-${m}`,
        amount: 50000,
        date: new Date(year, month, 7).toISOString().split('T')[0],
        category: 'Savings',
        subCategory: 'SIP/Mutual Fund',
        merchant: 'Groww',
        isConfirmed: true,
        sourceAccountId: 'mock-w1',
        isMock: true
      });

      for (let i = 0; i < 105; i++) {
        const day = Math.floor(Math.random() * daysInMonth) + 1;
        const randomCategory: Category = Math.random() > 0.6 ? 'Wants' : Math.random() > 0.2 ? 'Needs' : 'Savings';
        const pool = merchantPools[randomCategory];
        const merchantInfo = pool[Math.floor(Math.random() * pool.length)];
        
        newExpenses.push({
          id: `mock-exp-${m}-${i}`,
          amount: Math.round(Math.random() * (merchantInfo.max - merchantInfo.min) + merchantInfo.min),
          date: new Date(year, month, day).toISOString().split('T')[0],
          category: randomCategory,
          subCategory: merchantInfo.sub,
          merchant: merchantInfo.name,
          isConfirmed: true,
          sourceAccountId: 'mock-w1',
          isMock: true
        });
      }
    }
    return { newExpenses, newIncomes, newWealth };
  }, []);

  const handleLoadMockData = useCallback(() => {
    triggerHaptic(30);
    const { newExpenses, newIncomes, newWealth } = generateMockData();
    setExpenses(prev => [...prev.filter(e => !e.isMock), ...newExpenses]);
    setIncomes(prev => [...prev.filter(i => !i.isMock), ...newIncomes]);
    setWealthItems(prev => [...prev.filter(w => !w.isMock), ...newWealth]);
    
    setBudgetItems(prev => [
      ...prev.filter(b => !b.isMock),
      { id: 'b1', name: 'Rent & Maintenance', amount: 65000, category: 'Needs', subCategory: 'Rent/Mortgage', isMock: true },
      { id: 'b7', name: 'SIP Investment', amount: 50000, category: 'Savings', subCategory: 'SIP/Mutual Fund', isMock: true }
    ]);

    addNotification({
      type: 'Activity',
      title: 'H-D MOCK Data Initialized',
      message: 'Generated 630+ verified historical transactions for audit simulation.',
      severity: 'success'
    });
  }, [generateMockData, addNotification]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let hasFoundExisting = false;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.settings) setSettings({ ...INITIAL_SETTINGS, ...parsed.settings });
        if (parsed.expenses && parsed.expenses.length > 0) { setExpenses(parsed.expenses); hasFoundExisting = true; }
        if (parsed.incomes) setIncomes(parsed.incomes);
        if (parsed.wealthItems) setWealthItems(parsed.wealthItems);
        if (parsed.bills) setBills(parsed.bills);
        if (parsed.budgetItems) setBudgetItems(parsed.budgetItems);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.user) { setUser(parsed.user); setIsAuthenticated(true); }
      } catch (e) {}
    }

    if (!hasFoundExisting) {
      handleLoadMockData();
    }
    setIsLoading(false);
  }, [handleLoadMockData]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, expenses, incomes, wealthItems, bills, user, budgetItems, notifications }));
    }
  }, [settings, expenses, incomes, wealthItems, bills, user, budgetItems, notifications, isLoading]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
    root.setAttribute('data-theme', settings.appTheme || 'Spiderman');
  }, [settings.theme, settings.appTheme]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const today = new Date();
      const dueSoonBills = bills.filter(b => !b.isPaid && new Date(b.dueDate).getTime() - today.getTime() < 172800000);
      if (dueSoonBills.length > 0) {
        const dueSoon = dueSoonBills[0];
        setActiveSmartAlert({
          type: 'Bill',
          title: `Remittance Protocol: ${dueSoonBills.length} Bill${dueSoonBills.length > 1 ? 's' : ''}`,
          message: `Your payment of ${getCurrencySymbol(settings.currency)}${dueSoon.amount} to ${dueSoon.merchant} is due in 48 hours.`,
          data: dueSoon
        });
      }
    }
  }, [isAuthenticated, isLoading, bills, settings.currency]);

  const handleLogout = () => { triggerHaptic(20); setUser(null); setIsAuthenticated(false); };

  const handleTransfer = (fromId: string, toId: string, amount: number, date: string, note: string) => {
    setWealthItems(prev => prev.map(w => {
      if (w.id === fromId) return { ...w, value: w.value - amount };
      if (w.id === toId) return { ...w, value: w.value + amount };
      return w;
    }));
    const transferId = Math.random().toString(36).substring(2, 11);
    setExpenses(prev => [...prev, { id: transferId, amount, date, category: 'Uncategorized', subCategory: 'Transfer', merchant: `Transfer`, note: note || 'Internal', isConfirmed: true, sourceAccountId: fromId }]);
    setIsAddingRecord(false);
  };

  const handleAddExpense = (expense: Omit<Expense, 'id'>, frequency: Frequency) => {
    const id = Math.random().toString(36).substring(2, 11);
    setExpenses(prev => [...prev, { ...expense, id, amount: Math.round(expense.amount) }]);
    if (expense.sourceAccountId) setWealthItems(prev => prev.map(w => w.id === expense.sourceAccountId ? { ...w, value: w.value - Math.round(expense.amount) } : w));
    setIsAddingRecord(false);
  };

  const handleAddIncome = (income: Omit<Income, 'id'>) => {
    setIncomes(prev => [...prev, { ...income, amount: Math.round(income.amount), id: Math.random().toString(36).substring(2, 11) }]);
    if (income.targetAccountId) setWealthItems(prev => prev.map(w => w.id === income.targetAccountId ? { ...w, value: w.value + Math.round(income.amount) } : w));
    setIsAddingRecord(false);
  };

  const handleAddBill = (bill: Omit<Bill, 'id'>) => {
    setBills(prev => [...prev, { ...bill, id: Math.random().toString(36).substring(2, 11) }]);
    addNotification({ type: 'Bill', title: 'Remittance Tracked', message: `${bill.merchant} bill for ${getCurrencySymbol(settings.currency)}${bill.amount} logged.`, severity: 'info' });
    setIsAddingRecord(false);
  };

  const handlePayBill = (bill: Bill) => {
    setRecordToEdit({
      amount: bill.amount,
      merchant: bill.merchant,
      category: bill.category,
      note: bill.note,
      billId: bill.id,
      date: new Date().toISOString().split('T')[0]
    });
    setIsAddingRecord(true);
    
    if (bill.frequency !== 'None') {
      setBills(prev => prev.map(b => b.id === bill.id ? { ...b, dueDate: calculateNextDueDate(b.dueDate, b.frequency) } : b));
      addNotification({ type: 'Activity', title: 'Cycle Rescheduled', message: `Next payment for ${bill.merchant} set for ${new Date(calculateNextDueDate(bill.dueDate, bill.frequency)).toLocaleDateString()}.`, severity: 'success' });
    } else {
      setBills(prev => prev.filter(b => b.id !== bill.id));
    }
  };

  const currentMonthSpent = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    return expenses.filter(e => 
      e.isConfirmed && 
      e.subCategory !== 'Transfer' && 
      new Date(e.date).getMonth() === m && 
      new Date(e.date).getFullYear() === y
    ).reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, viewDate]);

  const currentMonthIncome = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const realized = incomes.filter(i => { 
      const d = new Date(i.date); 
      return d.getMonth() === m && d.getFullYear() === y; 
    }).reduce((sum, i) => sum + i.amount, 0);
    return realized > 0 ? realized : settings.monthlyIncome;
  }, [incomes, viewDate, settings.monthlyIncome]);

  const remainingPercentage = useMemo(() => 
    currentMonthIncome <= 0 ? 100 : Math.round(Math.max(0, 100 - (currentMonthSpent / currentMonthIncome) * 100))
  , [currentMonthSpent, currentMonthIncome]);

  const totalNetWorth = useMemo(() => {
    const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
    const liabilities = wealthItems.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0);
    return assets - liabilities;
  }, [wealthItems]);

  const categoryPercentages = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    
    const spentTotals = { Needs: 0, Wants: 0, Savings: 0 };
    expenses.filter(e => 
      e.isConfirmed && 
      e.subCategory !== 'Transfer' && 
      new Date(e.date).getMonth() === m && 
      new Date(e.date).getFullYear() === y
    ).forEach(e => {
      if (e.category in spentTotals) spentTotals[e.category as keyof typeof spentTotals] += e.amount;
    });

    const plannedTotals = { Needs: 0, Wants: 0, Savings: 0 };
    budgetItems.forEach(item => {
      if (item.category in plannedTotals) plannedTotals[item.category as keyof typeof plannedTotals] += item.amount;
    });

    const incomeBaseline = currentMonthIncome;
    const calculatePerc = (cat: 'Needs' | 'Wants' | 'Savings') => {
      const targetFromIncome = (incomeBaseline * (settings.split[cat] / 100));
      if (targetFromIncome <= 0) return 0;
      return Math.min(100, (plannedTotals[cat] / targetFromIncome) * 100);
    };

    const budgetSum = plannedTotals.Needs + plannedTotals.Wants + plannedTotals.Savings;
    const totalCapacity = Math.max(incomeBaseline, budgetSum);

    return {
      Needs: calculatePerc('Needs'),
      Wants: calculatePerc('Wants'),
      Savings: calculatePerc('Savings'),
      totalSpent: spentTotals.Needs + spentTotals.Wants + spentTotals.Savings,
      totalPlanned: totalCapacity
    };
  }, [expenses, budgetItems, viewDate, currentMonthIncome, settings.split]);

  const handleViewAction = (view: View) => {
    if (view === 'Add') {
      triggerHaptic();
      if (currentView === 'Budget') {
        setIsAddingBudget(true);
      } else if (currentView === 'Accounts') {
        setIsAddingAccount(true);
      } else {
        setRecordToEdit(null);
        setIsAddingRecord(true);
      }
    } else {
      setCurrentView(view);
    }
  };

  if (isLoading) return <div className="w-full h-screen bg-white dark:bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;
  if (!isAuthenticated) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="h-screen overflow-hidden bg-white dark:bg-slate-900 flex flex-col transition-colors duration-300">
      <header className="flex-none bg-white/95 dark:bg-slate-950/95 px-4 py-3 border-b border-slate-100 dark:border-white/10 z-50 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex justify-between items-center w-full">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-brand-primary"><path d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" fill="currentColor" /><path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><text x="12" y="17" fontSize="6" fontWeight="900" textAnchor="middle" fill="white">JK</text></svg>
              <button onClick={() => { triggerHaptic(); setIsShowingVersionLog(true); }} className="bg-white/50 dark:bg-white/5 px-1.5 py-0.5 rounded-full border border-slate-100 dark:border-white/10 active:scale-95 transition-transform mt-1"><span className="text-[8px] font-black text-slate-400 dark:text-slate-500">v1.1.8</span></button>
            </div>
            <h1 className="text-[9px] font-bold text-slate-900 dark:text-white lowercase tracking-tight mt-0.5 ml-1">just keep it</h1>
          </div>

          <nav className="flex items-center gap-1">
            <button onClick={() => { triggerHaptic(); setCurrentView('Dashboard'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Dashboard' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><LayoutDashboard size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Budget'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Budget' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><Target size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Accounts'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Accounts' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><Wallet size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Transactions'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Transactions' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><List size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setIsShowingNotifications(true); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 relative ${isShowingNotifications ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><Bell size={18} strokeWidth={2.5} />{notifications.filter(n=>!n.read).length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-accent text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">{notifications.filter(n=>!n.read).length}</span>}</button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Profile'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 overflow-hidden border-2 ${currentView === 'Profile' ? 'border-brand-primary' : 'border-transparent'}`}>{user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" /> : <SettingsIcon size={17} />}</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-slate-900 relative">
        <div className="max-w-2xl mx-auto w-full px-4 min-h-full flex flex-col">
          <div className="flex-1">
            {currentView === 'Dashboard' && <Dashboard expenses={expenses} incomes={incomes} wealthItems={wealthItems} settings={settings} user={user} onCategorizeClick={() => setIsCategorizing(true)} onConfirmExpense={(id, cat) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: cat, isConfirmed: true } : e))} onSmartAdd={() => {}} viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} onGoToDate={(y, m) => setViewDate(new Date(y, m, 1))} onInsightsReceived={() => {}} />}
            {currentView === 'Budget' && <BudgetPlanner budgetItems={budgetItems} recurringItems={[]} expenses={expenses} bills={bills} settings={settings} onAddBudget={(b) => setBudgetItems(p => [...p, { ...b, id: Math.random().toString(36).substring(2, 11) }])} onUpdateBudget={(id, u) => setBudgetItems(p => p.map(b => b.id === id ? { ...b, ...u } : b))} onDeleteBudget={(id) => setBudgetItems(p => p.filter(b => b.id !== id))} onPayBill={handlePayBill} onDeleteBill={(id) => setBills(p => p.filter(b => b.id !== id))} onSmartAddBill={() => { setRecordToEdit({ mode: 'Bill' }); setIsAddingRecord(true); }} viewDate={viewDate} externalShowAdd={isAddingBudget} onAddClose={() => setIsAddingBudget(false)} />}
            {currentView === 'Accounts' && <Accounts wealthItems={wealthItems} expenses={expenses} incomes={incomes} settings={settings} onUpdateWealth={(id, u) => setWealthItems(p => p.map(w => w.id === id ? { ...w, ...u } : w))} onDeleteWealth={(id) => setWealthItems(p => p.filter(w => w.id !== id))} onAddWealth={(w) => setWealthItems(p => [...p, { ...w, id: Math.random().toString(36).substring(2, 11) }])} externalShowAdd={isAddingAccount} onAddClose={() => setIsAddingAccount(false)} />}
            {currentView === 'Transactions' && <Transactions expenses={expenses} incomes={incomes} wealthItems={wealthItems} settings={settings} onDeleteExpense={(id) => setExpenses(p => p.filter(e => e.id !== id))} onDeleteIncome={(id) => setIncomes(p => p.filter(i => i.id !== id))} onDeleteWealth={() => {}} onConfirm={(id, cat) => setExpenses(p => p.map(e => e.id === id ? { ...e, category: cat, isConfirmed: true } : e))} onUpdateExpense={(id, u) => setExpenses(p => p.map(e => e.id === id ? { ...e, ...u } : e))} onEditRecord={(r) => { triggerHaptic(); setRecordToEdit(r); setIsAddingRecord(true); }} onAddBulk={(n) => setExpenses(p => [...p, ...n.map(x => ({ ...x, id: Math.random().toString(36).substring(2, 11), isConfirmed: true }))])} viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} onGoToDate={(y, m) => setViewDate(new Date(y, m, 1))} addNotification={addNotification} />}
            {currentView === 'Profile' && <Settings settings={settings} user={user} onLogout={handleLogout} onReset={() => { triggerHaptic(30); localStorage.clear(); location.reload(); }} onToggleTheme={() => setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))} onUpdateAppTheme={(t) => setSettings(s => ({ ...s, appTheme: t }))} onUpdateCurrency={(c) => setSettings(s => ({ ...s, currency: c }))} onUpdateDataFilter={(f) => setSettings(s => ({ ...s, dataFilter: f }))} onUpdateSplit={(split) => setSettings(s => ({ ...s, split }))} onUpdateBaseIncome={(income) => setSettings(s => ({ ...s, monthlyIncome: Math.round(income) }))} onSync={handleSyncToCloud} onExport={handleExportData} onImport={handleImportData} isSyncing={isSyncing} onLoadMockData={handleLoadMockData} onPurgeMockData={handlePurgeAllMockData} onClearExpenses={() => setExpenses([])} />}
          </div>
          <Footer />
        </div>
      </main>

      <Navbar 
        currentView={currentView} 
        remainingPercentage={remainingPercentage} 
        netWorth={totalNetWorth}
        categoryPercentages={categoryPercentages}
        onViewChange={handleViewAction} 
      />
      
      {activeSmartAlert && (
        <SmartAlert 
          {...activeSmartAlert} 
          currency={settings.currency} 
          onClose={() => setActiveSmartAlert(null)} 
          onAction={() => {
            if (activeSmartAlert.type === 'Bill') {
              handlePayBill(activeSmartAlert.data);
            }
            setActiveSmartAlert(null);
          }} 
        />
      )}

      {isAddingRecord && (
        <AddRecord 
          settings={settings} wealthItems={wealthItems} expenses={expenses}
          onAdd={handleAddExpense} onAddIncome={handleAddIncome} onAddBill={handleAddBill}
          onTransfer={handleTransfer}
          onUpdateExpense={(id, u) => setExpenses(p => p.map(e => e.id === id ? { ...e, ...u } : e))}
          onUpdateIncome={(id, u) => setIncomes(p => p.map(i => i.id === id ? { ...i, ...u } : i))}
          onDelete={() => {}}
          onCancel={() => { triggerHaptic(); setIsAddingRecord(false); setRecordToEdit(null); }} 
          initialData={recordToEdit} 
        />
      )}
      {isCategorizing && <CategorizationModal settings={settings} expenses={expenses.filter(e => !e.isConfirmed)} onConfirm={(id, cat) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: cat, isConfirmed: true } : e))} onClose={() => setIsCategorizing(false)} />}
      {isShowingNotifications && <NotificationPane notifications={notifications} onClose={() => setIsShowingNotifications(false)} onClear={() => setNotifications([])} />}
      {isShowingVersionLog && <VersionLog onClose={() => setIsShowingVersionLog(false)} />}
    </div>
  );
};

export default App;