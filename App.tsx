import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Expense, BudgetRule, UserSettings, Category, UserProfile, Frequency, RecurringItem, Income, IncomeType, AppTheme, Notification, WealthItem, WealthType, WealthCategory, DensityLevel, BudgetItem, Bill } from './types';
import Dashboard from './components/Dashboard';
import Ledger from './components/Ledger';
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
import RulesEngine from './components/RulesEngine';
import AccountForm from './components/AccountForm';
import { Loader2, LayoutDashboard, List, Settings as SettingsIcon, Bell, Wallet, Target, Cpu, X, Sparkles } from 'lucide-react';
import { DEFAULT_SPLIT, getCurrencySymbol } from './constants';
import { syncToGoogleDrive, restoreFromGoogleDrive, BackupData } from './services/cloudSync';
import { triggerHaptic } from './utils/haptics';
import { parseSmsLocally } from './utils/smsParser';

const STORAGE_KEY = 'jk_budget_data_whole_num_v11';
const INSIGHT_CACHE_KEY = 'jk_ai_insights_cache';

const INITIAL_SETTINGS: UserSettings = {
  monthlyIncome: 300000,
  split: DEFAULT_SPLIT,
  isOnboarded: true, 
  theme: 'system',
  appTheme: 'Spiderman',
  isCloudSyncEnabled: false,
  currency: 'INR',
  dataFilter: 'all',
  density: 'Compact',
  hasLoadedMockData: false
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
  const [rules, setRules] = useState<BudgetRule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isImportingToLedger, setIsImportingToLedger] = useState(false);
  const [isAnalyzingImport, setIsAnalyzingImport] = useState(false);
  const [importText, setImportText] = useState('');
  
  const [accountToEdit, setAccountToEdit] = useState<WealthItem | null>(null);
  const [highlightedRuleId, setHighlightedRuleId] = useState<string | null>(null);
  
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

  const onUpdateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setExpenses(prev => {
      const original = prev.find(e => e.id === id);
      if (!original) return prev;
      const newExpenses = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      if (updates.category || updates.subCategory) {
        const merchantToMatch = updates.merchant || original.merchant;
        if (merchantToMatch && merchantToMatch !== 'General' && merchantToMatch !== 'Transfer' && merchantToMatch !== 'Unknown') {
          return newExpenses.map(e => {
            if (e.id !== id && e.merchant === merchantToMatch) {
              return { ...e, category: updates.category ?? e.category, subCategory: updates.subCategory ?? e.subCategory, isConfirmed: true, isAIUpgraded: true };
            }
            return e;
          });
        }
      }
      return newExpenses;
    });
  }, []);

  const handleAddRule = (rule: Omit<BudgetRule, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    setRules(prev => [...prev, { ...rule, id }]);
    addNotification({ type: 'Activity', title: 'Rule Provisioned', message: `Keyword "${rule.keyword}" mapped to ${rule.category}.`, severity: 'success' });
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    addNotification({ type: 'Activity', title: 'Rule Decommissioned', message: `Automation logic removed.`, severity: 'info' });
  };

  const handleViewRule = (ruleId: string) => {
    triggerHaptic();
    setHighlightedRuleId(ruleId);
    setCurrentView('Rules');
  };

  useEffect(() => {
    if (isLoading) return;
    const scanBills = () => {
      const today = new Date();
      bills.forEach(bill => {
        if (bill.isPaid) return;
        const dueDate = new Date(bill.dueDate);
        const timeDiff = dueDate.getTime() - today.getTime();
        const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const notificationId = `bill-remind-${bill.id}-${bill.dueDate}`;
        const existing = notifications.find(n => n.id === notificationId);
        if (!existing && dayDiff <= 3 && dayDiff >= 0) {
          addNotification({ id: notificationId, type: 'Bill', title: 'Upcoming Remittance', message: `${bill.merchant} bill for ${getCurrencySymbol(settings.currency)}${bill.amount} is due in ${dayDiff} days.`, severity: dayDiff === 0 ? 'error' : 'warning' });
        }
      });
    };
    const timer = setTimeout(scanBills, 5000);
    return () => clearTimeout(timer);
  }, [bills, notifications, isLoading, settings.currency, addNotification]);

  const handlePurgeAllMockData = useCallback(() => {
    triggerHaptic(40);
    setExpenses(prev => prev.filter(e => !e.isMock));
    setIncomes(prev => prev.filter(i => !i.isMock));
    setWealthItems(prev => prev.filter(w => !w.isMock));
    setBudgetItems(prev => prev.filter(b => !b.isMock));
    setBills(prev => prev.filter(b => !('isMock' in b && (b as any).isMock)));
    setSettings(prev => ({ ...prev, hasLoadedMockData: true }));
    addNotification({ type: 'Activity', title: 'Database Scrubbed', message: 'All simulated datasets have been removed.', severity: 'success' });
  }, [addNotification]);

  const handlePurgeAllData = useCallback(() => {
    triggerHaptic(50);
    if (!window.confirm("Nuclear Protocol: Are you sure you want to delete ALL transactions, accounts, bills, rules and budgets? Settings will be preserved.")) return;
    setExpenses([]); setIncomes([]); setWealthItems([]); setBudgetItems([]); setBills([]); setRules([]); setNotifications([]);
    addNotification({ type: 'Activity', title: 'Ledger Nuked', message: 'All financial history and assets have been permanently cleared.', severity: 'error' });
  }, [addNotification]);

  const handleExportData = () => {
    triggerHaptic();
    const data = { settings, expenses, incomes, wealthItems, bills, budgetItems, notifications, rules };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `jk_wealth_snapshot_${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    addNotification({ type: 'Activity', title: 'Snapshot Created', message: 'Application state exported to JSON file.', severity: 'success' });
  };

  const handleImportData = (file: File) => {
    triggerHaptic();
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.settings) setSettings(prev => ({ ...INITIAL_SETTINGS, ...parsed.settings }));
        if (parsed.expenses) setExpenses(parsed.expenses.map((e: any) => ({ ...e, id: e.id || Math.random().toString(36).substring(2, 11), isConfirmed: e.isConfirmed ?? true, subCategory: e.subCategory || 'General', category: e.category || 'Uncategorized' })));
        if (parsed.incomes) setIncomes(parsed.incomes);
        if (parsed.wealthItems) setWealthItems(parsed.wealthItems);
        if (parsed.bills) setBills(parsed.bills);
        if (parsed.budgetItems) setBudgetItems(parsed.budgetItems);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.rules) setRules(parsed.rules);
        addNotification({ type: 'Activity', title: 'Snapshot Restored', message: `Successfully loaded ${parsed.expenses?.length || 0} expenses and ${parsed.incomes?.length || 0} inflows.`, severity: 'success' });
      } catch (err) {
        addNotification({ type: 'Activity', title: 'Restoration Failed', message: 'Selected file is corrupted.', severity: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handleSyncToCloud = async () => {
    if (!user?.accessToken) return;
    triggerHaptic();
    setIsSyncing(true);
    try {
      const lastSynced = await syncToGoogleDrive(user.accessToken, { expenses, incomes, wealthItems, budgetItems, bills, notifications, settings, rules } as any);
      setSettings(prev => ({ ...prev, lastSynced }));
      addNotification({ type: 'AI', title: 'Vault Secured', message: 'Current financial state mirrored to secure cloud storage.', severity: 'success' });
    } catch (e) {
      addNotification({ type: 'Activity', title: 'Sync Error', message: 'Cloud handshake interrupted.', severity: 'error' });
    } finally { setIsSyncing(false); }
  };

  const handleLogin = async (profile: UserProfile) => { 
    setUser(profile); setSettings(prev => ({ ...prev, isOnboarded: true })); setIsAuthenticated(true); 
    if (profile.accessToken) {
      setIsSyncing(true);
      try {
        const restored = await restoreFromGoogleDrive(profile.accessToken);
        if (restored) {
          setExpenses(restored.expenses.map((e: any) => ({ ...e, isConfirmed: e.isConfirmed ?? true })));
          setIncomes(restored.incomes); setWealthItems(restored.wealthItems); setBudgetItems(restored.budgetItems);
          setBills(restored.bills); setNotifications(restored.notifications); setRules((restored as any).rules || []);
          setSettings(prev => ({ ...prev, ...restored.settings, lastSynced: restored.timestamp }));
          addNotification({ type: 'AI', title: 'Identity Verified', message: 'Financial state synchronized with your secure cloud vault.', severity: 'success' });
        }
      } catch (e) {
        addNotification({ type: 'Activity', title: 'Vault Access Limited', message: 'Restoration failed.', severity: 'warning' });
      } finally { setIsSyncing(false); }
    }
  };

  const generateMockData = useCallback(() => {
    const newExpenses: Expense[] = []; const newIncomes: Income[] = []; const newWealth: WealthItem[] = [];
    const today = new Date();
    newWealth.push({ id: 'mock-w1', type: 'Investment', category: 'Savings', name: 'Primary Bank (HDFC)', alias: 'HDFC Savings', value: 485000, date: today.toISOString(), isMock: true });
    newWealth.push({ id: 'mock-w2', type: 'Investment', category: 'Savings', name: 'Emergency Vault', alias: 'Buffer Fund', value: 1250000, date: today.toISOString(), isMock: true });
    newWealth.push({ id: 'mock-w7', type: 'Liability', category: 'Loan', name: 'Home Mortgage', alias: 'House Loan', value: 4500000, date: today.toISOString(), isMock: true });
    const merchantPools: Record<Category, { name: string, sub: string, min: number, max: number }[]> = {
      Needs: [{ name: 'Reliance Fresh', sub: 'Groceries', min: 800, max: 4500 }, { name: 'Shell Fuel', sub: 'Fuel/Transport', min: 1500, max: 3500 }, { name: 'Adani Electricity', sub: 'Utilities', min: 2000, max: 6000 }],
      Wants: [{ name: 'Starbucks', sub: 'Dining', min: 350, max: 1200 }, { name: 'Netflix', sub: 'Subscription', min: 199, max: 649 }, { name: 'Amazon India', sub: 'Shopping', min: 500, max: 8000 }],
      Savings: [{ name: 'Groww SIP', sub: 'SIP/Mutual Fund', min: 1000, max: 5000 }],
      Uncategorized: [{ name: 'ATM Withdrawal', sub: 'General', min: 500, max: 5000 }]
    };
    for (let m = 0; m < 6; m++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const year = monthDate.getFullYear(); const month = monthDate.getMonth();
      newIncomes.push({ id: `mock-inc-sal-${m}`, amount: 285000, date: new Date(year, month, 1).toISOString().split('T')[0], type: 'Salary', targetAccountId: 'mock-w1', isMock: true });
      for (let i = 0; i < 30; i++) {
        const day = Math.floor(Math.random() * 28) + 1;
        const randomCategory: Category = Math.random() > 0.6 ? 'Wants' : Math.random() > 0.2 ? 'Needs' : 'Savings';
        const pool = merchantPools[randomCategory]; const merchantInfo = pool[Math.floor(Math.random() * pool.length)];
        newExpenses.push({ id: `mock-exp-${m}-${i}`, amount: Math.round(Math.random() * (merchantInfo.max - merchantInfo.min) + merchantInfo.min), date: new Date(year, month, day).toISOString().split('T')[0], category: randomCategory, subCategory: merchantInfo.sub, merchant: merchantInfo.name, isConfirmed: true, sourceAccountId: 'mock-w1', isMock: true });
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
    setSettings(prev => ({ ...prev, hasLoadedMockData: true }));
    addNotification({ type: 'Activity', title: 'MOCK Data Initialized', message: 'Demo history loaded.', severity: 'success' });
  }, [generateMockData, addNotification]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let hasFoundExisting = false; let loadedSettings = INITIAL_SETTINGS;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.settings) { loadedSettings = { ...INITIAL_SETTINGS, ...parsed.settings }; setSettings(loadedSettings); }
        if (parsed.expenses && parsed.expenses.length > 0) { setExpenses(parsed.expenses.map((e: any) => ({ ...e, isConfirmed: e.isConfirmed ?? true }))); hasFoundExisting = true; }
        if (parsed.incomes) setIncomes(parsed.incomes); if (parsed.wealthItems) setWealthItems(parsed.wealthItems);
        if (parsed.bills) setBills(parsed.bills); if (parsed.budgetItems) setBudgetItems(parsed.budgetItems);
        if (parsed.notifications) setNotifications(parsed.notifications); if (parsed.rules) setRules(parsed.rules);
        if (parsed.user) { setUser(parsed.user); setIsAuthenticated(true); }
      } catch (e) {}
    }
    if (!hasFoundExisting && !loadedSettings.hasLoadedMockData) { handleLoadMockData(); }
    setIsLoading(false);
  }, [handleLoadMockData]);

  useEffect(() => { if (!isLoading) localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, expenses, incomes, wealthItems, bills, user, budgetItems, notifications, rules })); }, [settings, expenses, incomes, wealthItems, bills, user, budgetItems, notifications, rules, isLoading]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
    root.setAttribute('data-theme', settings.appTheme || 'Spiderman');
  }, [settings.theme, settings.appTheme]);

  const handleLogout = () => { triggerHaptic(20); setUser(null); setIsAuthenticated(false); };

  const handleTransfer = (fromId: string, toId: string, amount: number, date: string, note: string) => {
    setWealthItems(prev => prev.map(w => {
      if (w.id === fromId) {
        return { ...w, value: w.type === 'Liability' ? w.value + amount : w.value - amount };
      }
      if (w.id === toId) {
        return { ...w, value: w.type === 'Liability' ? w.value - amount : w.value + amount };
      }
      return w;
    }));
    
    const transferId = Math.random().toString(36).substring(2, 11);
    setExpenses(prev => [...prev, { id: transferId, amount, date, category: 'Uncategorized', subCategory: 'Transfer', merchant: `Transfer`, note: note || 'Internal', isConfirmed: true, sourceAccountId: fromId }]);
    setIsAddingRecord(false);
  };

  const handleAddExpense = (expense: Omit<Expense, 'id'>, frequency: Frequency) => {
    const id = Math.random().toString(36).substring(2, 11);
    const roundedAmt = Math.round(expense.amount);
    setExpenses(prev => [...prev, { ...expense, id, amount: roundedAmt }]);
    
    if (expense.sourceAccountId) {
      setWealthItems(prev => prev.map(w => {
        if (w.id === expense.sourceAccountId) {
          return { ...w, value: w.type === 'Liability' ? w.value + roundedAmt : w.value - roundedAmt };
        }
        return w;
      }));
    }
    setIsAddingRecord(false);
  };

  const handleAddIncome = (income: Omit<Income, 'id'>) => {
    const roundedAmt = Math.round(income.amount);
    setIncomes(prev => [...prev, { ...income, amount: roundedAmt, id: Math.random().toString(36).substring(2, 11) }]);
    
    if (income.targetAccountId) {
      setWealthItems(prev => prev.map(w => {
        if (w.id === income.targetAccountId) {
          return { ...w, value: w.type === 'Liability' ? w.value - roundedAmt : w.value + roundedAmt };
        }
        return w;
      }));
    }
    setIsAddingRecord(false);
  };

  const handleAddBill = (bill: Omit<Bill, 'id'>) => {
    setBills(prev => [...prev, { ...bill, id: Math.random().toString(36).substring(2, 11) }]);
    addNotification({ type: 'Bill', title: 'Remittance Tracked', message: `${bill.merchant} bill logged.`, severity: 'info' });
    setIsAddingRecord(false);
  };

  const handlePayBill = (bill: Bill) => {
    setRecordToEdit({ amount: bill.amount, merchant: bill.merchant, category: bill.category, note: bill.note, billId: bill.id, date: new Date().toISOString().split('T')[0], mode: 'Expense' });
    setIsAddingRecord(true);
    if (bill.frequency !== 'None') setBills(prev => prev.map(b => b.id === bill.id ? { ...b, dueDate: calculateNextDueDate(b.dueDate, b.frequency) } : b));
    else setBills(prev => prev.filter(b => b.id !== bill.id));
  };

  const handleAddBulk = async (unvalidatedItems: any[]) => {
    let expCount = 0; let incCount = 0; let dupCount = 0;
    const newExpensesToCommit: Expense[] = [];
    const newIncomesToCommit: Income[] = [];
    const newAccountsToProvision: WealthItem[] = [];
    
    let currentLocalWealth = [...wealthItems];
    const defaultAccount = currentLocalWealth.find(w => ['Savings', 'Cash'].includes(w.category)) || currentLocalWealth[0];
    const accountBalanceUpdates: Record<string, number> = {};

    const batchFingerprints = new Set<string>();

    unvalidatedItems.forEach(item => {
      let accountNameKey = (item.accountName || item.merchant || item.source || '').trim();
      let activeAccount: WealthItem | undefined;

      if (accountNameKey) {
        const itemLowerKey = accountNameKey.toLowerCase();
        activeAccount = currentLocalWealth.find(w => 
          w.name.toLowerCase() === itemLowerKey || 
          w.name.toLowerCase().includes(itemLowerKey) || 
          itemLowerKey.includes(w.name.toLowerCase())
        );
        
        if (!activeAccount) {
          const newAccId = Math.random().toString(36).substring(2, 11);
          const isCardHint = accountNameKey.toLowerCase().includes('card');
          activeAccount = {
            id: newAccId,
            name: accountNameKey, 
            alias: accountNameKey, 
            value: 0,
            type: isCardHint ? 'Liability' : 'Investment',
            category: isCardHint ? 'Card' : 'Savings',
            date: new Date().toISOString()
          };
          newAccountsToProvision.push(activeAccount);
          currentLocalWealth.push(activeAccount);
        }
      } else {
        activeAccount = defaultAccount;
      }

      const activeAccountId = activeAccount?.id || '';
      const roundedAmount = Math.round(Math.abs(item.amount || 0));
      const itemDate = (item.date || new Date().toISOString().split('T')[0]).split('T')[0];
      const itemMerchant = (item.merchant || item.source || 'General').trim();
      const itemMerchantLower = itemMerchant.toLowerCase();
      
      const fingerprint = `${item.entryType}-${itemDate}-${roundedAmount}-${itemMerchantLower}`;
      if (batchFingerprints.has(fingerprint)) return;

      const isDuplicate = item.entryType === 'Income' 
        ? incomes.some(i => Math.round(i.amount) === roundedAmount && i.date === itemDate && (i.note || '').toLowerCase() === itemMerchantLower)
        : expenses.some(e => Math.round(e.amount) === roundedAmount && e.date === itemDate && (e.merchant || '').toLowerCase() === itemMerchantLower);
      
      if (isDuplicate) { dupCount++; return; }
      batchFingerprints.add(fingerprint);

      if (item.entryType === 'Expense' || item.entryType === 'Transfer') {
        const id = Math.random().toString(36).substring(2, 11);
        const matchingRule = rules.find(r => itemMerchantLower.includes(r.keyword.toLowerCase()));
        
        newExpensesToCommit.push({
          id, 
          amount: roundedAmount, 
          merchant: itemMerchant,
          category: item.entryType === 'Transfer' ? 'Uncategorized' : (matchingRule?.category || item.category || 'Uncategorized'),
          subCategory: item.entryType === 'Transfer' ? (item.subCategory || 'Transfer') : (matchingRule?.subCategory || item.subCategory || 'General'),
          date: itemDate,
          note: item.rawContent || itemMerchant, 
          isConfirmed: true, 
          ruleId: matchingRule?.id, 
          sourceAccountId: activeAccountId
        });
        
        if (activeAccount) {
          const multiplier = activeAccount.type === 'Liability' ? 1 : -1;
          accountBalanceUpdates[activeAccountId] = (accountBalanceUpdates[activeAccountId] || 0) + (roundedAmount * multiplier);
        }
        expCount++;
      } else if (item.entryType === 'Income') {
        const id = Math.random().toString(36).substring(2, 11);
        newIncomesToCommit.push({
          id, 
          amount: roundedAmount,
          type: item.incomeType || 'Other', 
          note: item.rawContent || item.source || 'Direct Credit',
          date: itemDate, 
          targetAccountId: activeAccountId 
        });
        
        if (activeAccount) {
          const multiplier = activeAccount.type === 'Liability' ? -1 : 1;
          accountBalanceUpdates[activeAccountId] = (accountBalanceUpdates[activeAccountId] || 0) + (roundedAmount * multiplier);
        }
        incCount++;
      }
    });

    if (newAccountsToProvision.length > 0) setWealthItems(prev => [...prev, ...newAccountsToProvision]);
    if (newExpensesToCommit.length > 0) setExpenses(prev => [...prev, ...newExpensesToCommit]);
    if (newIncomesToCommit.length > 0) setIncomes(prev => [...prev, ...newIncomesToCommit]);
    
    if (Object.keys(accountBalanceUpdates).length > 0) {
      setWealthItems(prev => prev.map(w => {
        const update = accountBalanceUpdates[w.id];
        return update ? { ...w, value: w.value + update } : w;
      }));
    }

    const summary = `Ingestion: +${expCount} Outflow, +${incCount} Inflow. ${dupCount > 0 ? `(${dupCount} duplicates blocked)` : ''}`;
    addNotification({ type: 'Activity', title: 'Ledger Synchronized', message: summary, severity: 'success' });
  };

  const handleBatchLedgerImport = async () => {
    if (!importText.trim()) return;
    triggerHaptic();
    setIsAnalyzingImport(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      const results = parseSmsLocally(importText);
      if (results?.length > 0) {
        handleAddBulk(results);
        setIsImportingToLedger(false);
        setImportText('');
      } else {
        alert("Failed to identify valid financial patterns. Ensure headers are present.");
      }
    } catch (err) { 
      alert("Inflow processing failed.");
    } finally { 
      setIsAnalyzingImport(false); 
    }
  };

  const currentMonthSpent = useMemo(() => {
    const m = viewDate.getMonth(); const y = viewDate.getFullYear();
    return expenses.filter(e => (e.isConfirmed || e.isAIUpgraded) && !['Transfer', 'Bill Payment'].includes(e.subCategory || '') && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, viewDate]);

  const currentMonthIncome = useMemo(() => {
    const m = viewDate.getMonth(); const y = viewDate.getFullYear();
    const realized = incomes.filter(i => { const d = new Date(i.date); return d.getMonth() === m && d.getFullYear() === y; }).reduce((sum, i) => sum + i.amount, 0);
    return realized > 0 ? realized : settings.monthlyIncome;
  }, [incomes, viewDate, settings.monthlyIncome]);

  const remainingPercentage = useMemo(() => currentMonthIncome <= 0 ? 100 : Math.round(Math.max(0, 100 - (currentMonthSpent / currentMonthIncome) * 100)), [currentMonthSpent, currentMonthIncome]);
  const totalNetWorth = useMemo(() => { 
    const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0); 
    const liabilities = wealthItems.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0); 
    return assets - liabilities; 
  }, [wealthItems]);
  const categoryPercentages = useMemo(() => {
    const m = viewDate.getMonth(); const y = viewDate.getFullYear();
    const plannedTotals = { Needs: 0, Wants: 0, Savings: 0 };
    budgetItems.forEach(item => { if (item.category in plannedTotals) plannedTotals[item.category as keyof typeof plannedTotals] += item.amount; });
    const calculatePerc = (cat: 'Needs' | 'Wants' | 'Savings') => { const targetFromIncome = (currentMonthIncome * (settings.split[cat] / 100)); return targetFromIncome <= 0 ? 0 : Math.min(100, (plannedTotals[cat] / targetFromIncome) * 100); };
    return { Needs: calculatePerc('Needs'), Wants: calculatePerc('Wants'), Savings: calculatePerc('Savings') };
  }, [budgetItems, viewDate, currentMonthIncome, settings.split]);

  const handleViewAction = (view: View) => {
    if (view === 'Add') { 
      triggerHaptic(); 
      if (currentView === 'Accounts') {
        setAccountToEdit(null);
        setIsAddingAccount(true);
      } else {
        let mode: 'Expense' | 'Income' | 'Bill' | 'Transfer' = 'Expense'; 
        if (currentView === 'Budget') mode = 'Bill'; else mode = 'Expense'; 
        setRecordToEdit({ mode }); 
        setIsAddingRecord(true); 
      }
    } 
    else setCurrentView(view);
  };

  const handleFullReset = () => {
    triggerHaptic(50); if (!window.confirm("Nuclear Alert: This will wipe your profile and history. Proceed?")) return;
    localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(INSIGHT_CACHE_KEY); window.location.href = window.location.origin + window.location.pathname + '?reset=' + Date.now();
  };

  if (isLoading) return <div className="w-full h-screen bg-white dark:bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;
  if (!isAuthenticated) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="h-screen overflow-hidden bg-white dark:bg-slate-900 flex flex-col transition-colors duration-300 relative">
      <div className="mesh-bg"><div className="mesh-blob"></div></div>
      
      <header className="flex-none bg-white/95 dark:bg-slate-950/95 px-4 py-3 border-b border-slate-100 dark:border-white/10 z-50 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex justify-between items-center w-full">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-brand-primary"><path d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" fill="currentColor" /><path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><text x="12" y="17" fontSize="6" fontWeight="900" textAnchor="middle" fill="white">JK</text></svg>
              <button onClick={() => { triggerHaptic(); setIsShowingVersionLog(true); }} className="bg-white/50 dark:bg-white/5 px-1.5 py-0.5 rounded-full border border-slate-100 dark:border-white/10 active:scale-95 transition-transform mt-1"><span className="text-[8px] font-black text-slate-400 dark:text-slate-500">v1.1.9</span></button>
            </div>
            <h1 className="text-[9px] font-bold text-slate-900 dark:text-white lowercase tracking-tight mt-0.5 ml-1">just keep it</h1>
          </div>
          <nav className="flex items-center gap-1">
            <button onClick={() => { triggerHaptic(); setCurrentView('Dashboard'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Dashboard' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><LayoutDashboard size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Budget'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Budget' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><Target size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Accounts'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Accounts' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><Wallet size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Rules'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Rules' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><Cpu size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Ledger'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Ledger' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><List size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setIsShowingNotifications(true); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 relative ${isShowingNotifications ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-slate-400'}`}><Bell size={18} strokeWidth={2.5} />{notifications.filter(n=>!n.read).length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-accent text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">{notifications.filter(n=>!n.read).length}</span>}</button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Profile'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 overflow-hidden border-2 ${currentView === 'Profile' ? 'border-brand-primary' : 'border-transparent'}`}>{user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" /> : <SettingsIcon size={17} />}</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        <div className="max-w-2xl mx-auto w-full px-4 min-h-full flex flex-col">
          <div className="flex-1">
            {currentView === 'Dashboard' && <Dashboard expenses={expenses} incomes={incomes} wealthItems={wealthItems} settings={settings} user={user} onCategorizeClick={() => setIsCategorizing(true)} onConfirmExpense={(id, cat) => onUpdateExpense(id, { category: cat, isConfirmed: true })} onSmartAdd={() => {}} viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} onGoToDate={(y, m) => setViewDate(new Date(y, m, 1))} onInsightsReceived={() => {}} />}
            {currentView === 'Budget' && <BudgetPlanner budgetItems={budgetItems} recurringItems={[]} expenses={expenses} bills={bills} settings={settings} onAddBudget={(b) => setBudgetItems(p => [...p, { ...b, id: Math.random().toString(36).substring(2, 11) }])} onUpdateBudget={(id, u) => setBudgetItems(p => p.map(b => b.id === id ? { ...b, ...u } : b))} onDeleteBudget={(id) => setBudgetItems(p => p.filter(b => b.id !== id))} onPayBill={handlePayBill} onDeleteBill={(id) => setBills(p => p.filter(b => b.id !== id))} onSmartAddBill={() => { triggerHaptic(); setRecordToEdit({ mode: 'Bill' }); setIsAddingRecord(true); }} viewDate={viewDate} externalShowAdd={false} onAddClose={() => {}} />}
            {currentView === 'Accounts' && <Accounts wealthItems={wealthItems} expenses={expenses} incomes={incomes} settings={settings} onUpdateWealth={(id, u) => setWealthItems(p => p.map(w => w.id === id ? { ...w, ...u } : w))} onDeleteWealth={(id) => setWealthItems(p => p.filter(w => w.id !== id))} onAddWealth={(w) => { setWealthItems(p => [...p, { ...w, id: Math.random().toString(36).substring(2, 11) }]); setAccountToEdit(null); setIsAddingAccount(false); } } onEditAccount={(acc) => { setAccountToEdit(acc); setIsAddingAccount(true); }} onAddAccountClick={() => { setAccountToEdit(null); setIsAddingAccount(true); }} onAddIncomeClick={() => { triggerHaptic(); setRecordToEdit({ mode: 'Income' }); setIsAddingRecord(true); }} onAddTransferClick={() => { triggerHaptic(); setRecordToEdit({ mode: 'Transfer' }); setIsAddingRecord(true); }} externalShowAdd={false} onAddClose={() => {}} />}
            {currentView === 'Rules' && <RulesEngine rules={rules} highlightRuleId={highlightedRuleId} onClearHighlight={() => setHighlightedRuleId(null)} recurringItems={[]} settings={settings} onAddRule={handleAddRule} onDeleteRule={handleDeleteRule} onDeleteRecurring={() => {}} />}
            {currentView === 'Ledger' && <Ledger expenses={expenses} incomes={incomes} wealthItems={wealthItems} rules={rules} settings={settings} onDeleteExpense={(id) => setExpenses(p => p.filter(e => e.id !== id))} onDeleteIncome={(id) => setIncomes(p => p.filter(i => i.id !== id))} onConfirm={(id, cat) => onUpdateExpense(id, { category: cat, isConfirmed: true })} onUpdateExpense={onUpdateExpense} onEditRecord={(r) => { triggerHaptic(); setRecordToEdit(r); setIsAddingRecord(true); }} onOpenImport={() => setIsImportingToLedger(true)} onViewRule={handleViewRule} viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} onGoToDate={(y, m) => setViewDate(new Date(y, m, 1))} addNotification={addNotification} />}
            {currentView === 'Profile' && <Settings settings={settings} user={user} onLogout={handleLogout} onReset={handleFullReset} onToggleTheme={() => setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))} onUpdateAppTheme={(t) => setSettings(s => ({ ...s, appTheme: t }))} onUpdateCurrency={(c) => setSettings(s => ({ ...s, currency: c }))} onUpdateDataFilter={(f) => setSettings(s => ({ ...s, dataFilter: f }))} onUpdateSplit={(split) => setSettings(s => ({ ...s, split }))} onUpdateBaseIncome={(income) => setSettings(s => ({ ...s, monthlyIncome: Math.round(income) }))} onSync={handleSyncToCloud} onExport={handleExportData} onImport={handleImportData} onAddBulk={handleAddBulk} isSyncing={isSyncing} onLoadMockData={handleLoadMockData} onPurgeMockData={handlePurgeAllMockData} onPurgeAllData={handlePurgeAllData} onClearExpenses={() => setExpenses([])} wealthItems={wealthItems} />}
          </div>
          <Footer />
        </div>
      </main>
      <Navbar currentView={currentView} remainingPercentage={remainingPercentage} netWorth={totalNetWorth} categoryPercentages={categoryPercentages} onViewChange={handleViewAction} />
      {activeSmartAlert && <SmartAlert {...activeSmartAlert} currency={settings.currency} onClose={() => setActiveSmartAlert(null)} onAction={() => { if (activeSmartAlert.type === 'Bill') handlePayBill(activeSmartAlert.data); setActiveSmartAlert(null); }} />}
      
      {isAddingAccount && (
        <AccountForm 
          settings={settings} 
          initialData={accountToEdit} 
          onSave={(acc) => { 
            setWealthItems(p => [...p, { ...acc, id: Math.random().toString(36).substring(2, 11) }]); 
            setIsAddingAccount(false); 
          }} 
          onUpdate={(id, u) => { 
            setWealthItems(p => p.map(w => w.id === id ? { ...w, ...u } : w)); 
            setAccountToEdit(null); 
            setIsAddingAccount(false); 
          }} 
          onDelete={(id) => { 
            setWealthItems(p => p.filter(w => w.id !== id)); 
            setAccountToEdit(null); 
            setIsAddingAccount(false); 
          }} 
          onCancel={() => { 
            setAccountToEdit(null); 
            setIsAddingAccount(false); 
          }} 
        />
      )}
      
      {isImportingToLedger && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] animate-slide-up border border-white/10">
             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase dark:text-white tracking-widest">Import to Ledger</h3>
                <button onClick={() => setIsImportingToLedger(false)} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-400"><X size={18} /></button>
             </div>
             <div className="p-6 space-y-4">
                <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste CSV or banking logs here..." className="w-full h-44 bg-slate-50 dark:bg-slate-500/10 p-4 rounded-2xl text-[11px] font-medium outline-none border border-slate-100 border-slate-800 dark:text-white resize-none" />
                <button onClick={handleBatchLedgerImport} disabled={!importText || isAnalyzingImport} className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95">
                  {isAnalyzingImport ? <Loader2 size={16} className="animate-spin" /> : <><Sparkles size={16} /> Direct Ledger Ingestion</>}
                </button>
             </div>
          </div>
        </div>
      )}

      {isAddingRecord && <AddRecord settings={settings} wealthItems={wealthItems} expenses={expenses} rules={rules} onAddRule={handleAddRule} onAdd={handleAddExpense} onAddIncome={handleAddIncome} onAddBill={handleAddBill} onTransfer={handleTransfer} onUpdateExpense={onUpdateExpense} onUpdateIncome={(id, u) => setIncomes(p => p.map(i => i.id === id ? { ...i, ...u } : i))} onDelete={() => { triggerHaptic(30); if (recordToEdit?.mode === 'Income' || recordToEdit?.type) setIncomes(p => p.filter(i => i.id !== recordToEdit.id)); else setExpenses(p => p.filter(e => e.id !== recordToEdit.id)); setRecordToEdit(null); setIsAddingRecord(false); }} onCancel={() => { triggerHaptic(); setIsAddingRecord(false); setRecordToEdit(null); }} onOpenBulkImport={() => { triggerHaptic(); setIsAddingRecord(false); setIsImportingToLedger(true); }} initialData={recordToEdit} />}
      {isCategorizing && <CategorizationModal settings={settings} expenses={expenses.filter(e => !e.isConfirmed)} onConfirm={(id, cat) => onUpdateExpense(id, { category: cat, isConfirmed: true })} onClose={() => setIsCategorizing(false)} />}
      {isShowingNotifications && <NotificationPane notifications={notifications} onClose={() => setIsShowingNotifications(false)} onClear={() => setNotifications([])} />}
      {isShowingVersionLog && <VersionLog onClose={() => setIsShowingVersionLog(false)} />}
    </div>
  );
};

export default App;