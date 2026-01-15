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
import ImportReviewModal from './components/ImportReviewModal';
import { Loader2, LayoutDashboard, List, Settings as SettingsIcon, Bell, Wallet, Target, Cpu, X, Sparkles, FolderOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { DEFAULT_SPLIT, getCurrencySymbol } from './constants';
import { syncToGoogleDrive, restoreFromGoogleDrive, BackupData } from './services/cloudSync';
import { triggerHaptic } from './utils/haptics';
import { parseSmsLocally } from './utils/smsParser';

const STORAGE_KEY = 'jk_budget_data_whole_num_v11';

const INITIAL_SETTINGS: UserSettings = {
  monthlyIncome: 0,
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

// Toast Component
const Toast: React.FC<{ message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] animate-slide-up px-6 py-3 rounded-full shadow-2xl backdrop-blur-xl border border-white/10 flex items-center gap-3 min-w-[280px] bg-slate-900/90 text-white">
      {type === 'success' ? <CheckCircle2 className="text-emerald-400" size={18} /> : type === 'error' ? <AlertCircle className="text-rose-400" size={18} /> : <CheckCircle2 className="text-indigo-400" size={18} />}
      <span className="text-[11px] font-black uppercase tracking-widest">{message}</span>
      <button onClick={onClose} className="ml-auto p-1 hover:bg-white/10 rounded-full transition-colors">
        <X size={14} />
      </button>
    </div>
  );
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
  const [isReviewingImport, setIsReviewingImport] = useState(false);
  const [stagedImportItems, setStagedImportItems] = useState<any[]>([]);
  const [importText, setImportText] = useState('');
  
  const [accountToEdit, setAccountToEdit] = useState<WealthItem | null>(null);
  const [highlightedRuleId, setHighlightedRuleId] = useState<string | null>(null);
  const [isShowingNotifications, setIsShowingNotifications] = useState(false);
  const [isShowingVersionLog, setIsShowingVersionLog] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<any | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Global Financial Metrics for Navbar / Circles
  const globalMetrics = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    
    // 1. Portfolio Metrics
    const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
    const liabilities = wealthItems.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0);
    const netWorth = assets - liabilities;

    // 2. Budget Utilization Metrics
    const currentExps = expenses.filter(e => {
      if (!e.date) return false;
      const parts = e.date.split('-');
      const ey = parseInt(parts[0]);
      const em = parseInt(parts[1]) - 1;
      return em === m && ey === y && e.subCategory !== 'Transfer';
    });

    const totals = { Needs: 0, Wants: 0, Savings: 0 };
    currentExps.forEach(e => {
      if (totals[e.category as keyof typeof totals] !== undefined) {
        totals[e.category as keyof typeof totals] += e.amount;
      }
    });

    const monthlyIncome = incomes
      .filter(i => {
        const d = new Date(i.date);
        return d.getMonth() === m && d.getFullYear() === y;
      })
      .reduce((sum, i) => sum + i.amount, 0) || settings.monthlyIncome || 1;

    const caps = {
      Needs: (monthlyIncome * settings.split.Needs) / 100 || 1,
      Wants: (monthlyIncome * settings.split.Wants) / 100 || 1,
      Savings: (monthlyIncome * settings.split.Savings) / 100 || 1
    };

    const categoryPercentages = {
      Needs: Math.min(100, (totals.Needs / caps.Needs) * 100),
      Wants: Math.min(100, (totals.Wants / caps.Wants) * 100),
      Savings: Math.min(100, (totals.Savings / caps.Savings) * 100)
    };

    // 3. Efficiency / Savings Rate
    const totalSpent = totals.Needs + totals.Wants + totals.Savings;
    const remainingPercentage = Math.max(0, ((monthlyIncome - totalSpent) / monthlyIncome) * 100);

    return { categoryPercentages, remainingPercentage, netWorth };
  }, [expenses, incomes, wealthItems, settings.monthlyIncome, settings.split, viewDate]);

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
    showToast("Ledger record updated");
  }, [showToast]);

  const handleDeleteAccount = useCallback((id: string) => {
    triggerHaptic(40);
    setWealthItems(prev => prev.filter(w => w.id !== id));
    setExpenses(prev => prev.filter(e => e.sourceAccountId !== id));
    setIncomes(prev => prev.filter(i => i.targetAccountId !== id));
    addNotification({ type: 'Activity', title: 'Instrument Purged', message: 'Account and associated statement entries removed.', severity: 'error' });
    showToast("Account & Statement Deleted", "error");
    setAccountToEdit(null);
    setIsAddingAccount(false);
  }, [addNotification, showToast]);

  const handleDeleteExpense = useCallback((id: string) => {
    const exp = expenses.find(e => e.id === id);
    if (exp?.sourceAccountId) {
      setWealthItems(prev => prev.map(w => {
        if (w.id === exp.sourceAccountId) return { ...w, value: w.type === 'Liability' ? w.value - exp.amount : w.value + exp.amount };
        return w;
      }));
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
    showToast("Outflow record removed", "info");
  }, [expenses, showToast]);

  const handleDeleteIncome = useCallback((id: string) => {
    const inc = incomes.find(i => i.id === id);
    if (inc?.targetAccountId) {
      setWealthItems(prev => prev.map(w => {
        // Fix: Replace non-existent roundedAmt with inc.amount and correct sign logic for deletion
        if (w.id === inc.targetAccountId) return { ...w, value: w.type === 'Liability' ? w.value + inc.amount : w.value - inc.amount };
        return w;
      }));
    }
    setIncomes(prev => prev.filter(i => i.id !== id));
    showToast("Inflow record removed", "info");
  }, [incomes, showToast]);

  const handleAddRule = (rule: Omit<BudgetRule, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    setRules(prev => [...prev, { ...rule, id }]);
    showToast("Rule provisioned successfully");
    addNotification({ type: 'Activity', title: 'Rule Provisioned', message: `Keyword "${rule.keyword}" mapped to ${rule.category}.`, severity: 'success' });
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    showToast("Automation rule decommissioned", "info");
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

  const handleLoadMockData = useCallback(() => {
    triggerHaptic(20);
    const now = new Date();
    const mockExps: Expense[] = [];
    const mockIncs: Income[] = [];
    
    // Use settings.monthlyIncome if available, otherwise use a neutral 150000
    const mockSalaryAmount = settings.monthlyIncome > 0 ? settings.monthlyIncome : 150000;
    
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 15).toISOString().split('T')[0];
      mockExps.push(
        { id: `me-${i}-1`, amount: 45000, date: d, category: 'Needs', subCategory: 'Rent/Mortgage', merchant: 'Urban Spaces', isConfirmed: true, isMock: true },
        { id: `me-${i}-2`, amount: 2800, date: d, category: 'Wants', subCategory: 'Dining', merchant: 'The Grand Cafe', isConfirmed: true, isMock: true },
        { id: `me-${i}-3`, amount: 15000, date: d, category: 'Savings', subCategory: 'SIP/Mutual Fund', merchant: 'WealthWise', isConfirmed: true, isMock: true },
        { id: `me-${i}-4`, amount: 4500, date: d, category: 'Needs', subCategory: 'Utilities', merchant: 'Energy Corp', isConfirmed: true, isMock: true },
        { id: `me-${i}-5`, amount: 1200, date: d, category: 'Wants', subCategory: 'Coffee', merchant: 'Starbucks', isConfirmed: true, isMock: true }
      );
      mockIncs.push({ id: `mi-${i}-1`, amount: mockSalaryAmount, date: d, type: 'Salary', note: 'Monthly Remittance', isMock: true });
    }

    const mockWealth: WealthItem[] = [
      { id: 'mw-1', type: 'Investment', category: 'Savings', name: 'HDFC Savings', alias: 'Primary Bank', value: 350000, date: now.toISOString(), isMock: true },
      { id: 'mw-2', type: 'Liability', category: 'Card', name: 'Amex Gold', alias: 'Lifestyle Card', value: 15000, limit: 500000, date: now.toISOString(), isMock: true },
      { id: 'mw-3', type: 'Investment', category: 'Investment', name: 'Groww Portfolio', alias: 'Stock Portfolio', value: 1250000, date: now.toISOString(), isMock: true }
    ];

    const mockBudgets: BudgetItem[] = [
      { id: 'mb-1', name: 'Housing Protocol', amount: 50000, category: 'Needs', subCategory: 'Rent/Mortgage', isMock: true },
      { id: 'mb-2', name: 'Provisioning', amount: 15000, category: 'Needs', subCategory: 'Groceries', isMock: true },
      { id: 'mb-3', name: 'Connectivity & Heat', amount: 8000, category: 'Needs', subCategory: 'Utilities', isMock: true },
      { id: 'mb-4', name: 'Culinary Experiences', amount: 12000, category: 'Wants', subCategory: 'Dining', isMock: true },
      { id: 'mb-5', name: 'Subscription Stack', amount: 2500, category: 'Wants', subCategory: 'Subscription', isMock: true },
      { id: 'mb-6', name: 'Wealth Accumulation', amount: 30000, category: 'Savings', subCategory: 'SIP/Mutual Fund', isMock: true },
      { id: 'mb-7', name: 'Strategic Reserve', amount: 10000, category: 'Savings', subCategory: 'Emergency Fund', isMock: true }
    ];

    const mockRules: BudgetRule[] = [
      { id: 'mr-1', keyword: 'Starbucks', category: 'Wants', subCategory: 'Coffee' },
      { id: 'mr-2', keyword: 'Amazon', category: 'Wants', subCategory: 'Shopping' },
      { id: 'mr-3', keyword: 'HDFC Bank', category: 'Needs', subCategory: 'Rent/Mortgage' }
    ];

    setExpenses(prev => [...prev, ...mockExps]);
    setIncomes(prev => [...prev, ...mockIncs]);
    setWealthItems(prev => [...prev, ...mockWealth]);
    setBudgetItems(prev => [...prev, ...mockBudgets]);
    setRules(prev => [...prev, ...mockRules]);
    setSettings(prev => ({ ...prev, hasLoadedMockData: true }));
    showToast("Demo environment initialized", "success");
  }, [showToast, settings.monthlyIncome]);

  const handlePurgeAllMockData = useCallback(() => {
    triggerHaptic(40);
    setExpenses(prev => prev.filter(e => !e.isMock));
    setIncomes(prev => prev.filter(i => !i.isMock));
    setWealthItems(prev => prev.filter(w => !w.isMock));
    setBudgetItems(prev => prev.filter(b => !b.isMock));
    setBills(prev => prev.filter(b => !('isMock' in b && (b as any).isMock)));
    setSettings(prev => ({ ...prev, hasLoadedMockData: true }));
    showToast("Simulated dataset scrubbed", "info");
  }, [showToast]);

  const handlePurgeAllData = useCallback(() => {
    triggerHaptic(50);
    if (!window.confirm("Nuclear Protocol: Are you sure you want to delete ALL transactions, accounts, bills, rules and budgets?")) return;
    setExpenses([]); setIncomes([]); setWealthItems([]); setBudgetItems([]); setBills([]); setRules([]); setNotifications([]);
    showToast("Entire ledger cleared", "error");
  }, [showToast]);

  const handleExportData = () => {
    triggerHaptic();
    // Comprehensive data snapshot including accounts (wealthItems), rules, budgets, and settings
    const data = { settings, expenses, incomes, wealthItems, bills, budgetItems, notifications, rules };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `jk_vault_snapshot_${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast("Full vault snapshot exported");
  };

  const handleImportData = (file: File) => {
    triggerHaptic();
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.settings) setSettings(prev => ({ ...INITIAL_SETTINGS, ...parsed.settings }));
        if (parsed.expenses) setExpenses(parsed.expenses.map((e: any) => ({ ...e, id: e.id || Math.random().toString(36).substring(2, 11), isConfirmed: e.isConfirmed ?? true })));
        if (parsed.incomes) setIncomes(parsed.incomes);
        // Explicitly restore wealthItems (accounts)
        if (parsed.wealthItems) setWealthItems(parsed.wealthItems);
        else if (parsed.accounts) setWealthItems(parsed.accounts); // handle alternative key
        
        if (parsed.bills) setBills(parsed.bills);
        if (parsed.budgetItems) setBudgetItems(parsed.budgetItems);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.rules) setRules(parsed.rules);
        
        showToast("Historical vault data restored");
      } catch (err) { showToast("Vault restoration failed", "error"); }
    };
    reader.readAsText(file);
  };

  const handleSyncToCloud = async () => {
    if (!user?.accessToken) return;
    triggerHaptic(); setIsSyncing(true);
    try {
      // Explicitly send all entities to cloud sync
      const lastSynced = await syncToGoogleDrive(user.accessToken, { 
        expenses, incomes, wealthItems, budgetItems, bills, notifications, settings, rules 
      });
      setSettings(prev => ({ ...prev, lastSynced }));
      showToast("Cloud vault synchronized");
    } catch (e) { showToast("Cloud handshake failed", "error"); } finally { setIsSyncing(false); }
  };

  const handleLogin = async (profile: UserProfile) => { 
    setUser(profile); setSettings(prev => ({ ...prev, isOnboarded: true })); setIsAuthenticated(true); 
    if (profile.accessToken) {
      setIsSyncing(true);
      try {
        const restored = await restoreFromGoogleDrive(profile.accessToken);
        if (restored) {
          setExpenses(restored.expenses.map((e: any) => ({ ...e, isConfirmed: e.isConfirmed ?? true })));
          setIncomes(restored.incomes); 
          setWealthItems(restored.wealthItems || []); 
          setBudgetItems(restored.budgetItems || []);
          setBills(restored.bills || []); 
          setNotifications(restored.notifications || []); 
          setRules(restored.rules || []);
          setSettings(prev => ({ ...prev, ...restored.settings, lastSynced: restored.timestamp }));
          showToast(`Vault restored for ${profile.name.split(' ')[0]}`);
        }
      } catch (e) { showToast("Session limited to local sandbox", "info"); } finally { setIsSyncing(false); }
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.settings) setSettings(prev => ({ ...INITIAL_SETTINGS, ...parsed.settings }));
        if (parsed.expenses) setExpenses(parsed.expenses.map((e: any) => ({ ...e, id: e.id || Math.random().toString(36).substring(2, 11), isConfirmed: e.isConfirmed ?? true })));
        if (parsed.incomes) setIncomes(parsed.incomes); 
        if (parsed.wealthItems) setWealthItems(parsed.wealthItems);
        if (parsed.bills) setBills(parsed.bills); 
        if (parsed.budgetItems) setBudgetItems(parsed.budgetItems);
        if (parsed.notifications) setNotifications(parsed.notifications); 
        if (parsed.rules) setRules(parsed.rules);
        if (parsed.user) { setUser(parsed.user); setIsAuthenticated(true); }
      } catch (e) {}
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { if (!isLoading) localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, expenses, incomes, wealthItems, bills, user, budgetItems, notifications, rules })); }, [settings, expenses, incomes, wealthItems, bills, user, budgetItems, notifications, rules, isLoading]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
    root.setAttribute('data-theme', settings.appTheme || 'Spiderman');
  }, [settings.theme, settings.appTheme]);

  const handleLogout = () => { triggerHaptic(20); setUser(null); setIsAuthenticated(false); showToast("Authenticated session ended", "info"); };

  const handleTransfer = (fromId: string, toId: string, amount: number, date: string, note: string) => {
    setWealthItems(prev => prev.map(w => {
      if (w.id === fromId) return { ...w, value: w.type === 'Liability' ? w.value + amount : w.value - amount };
      if (w.id === toId) return { ...w, value: w.type === 'Liability' ? w.value - amount : w.value + amount };
      return w;
    }));
    const transferId = Math.random().toString(36).substring(2, 11);
    setExpenses(prev => [...prev, { id: transferId, amount, date, category: 'Uncategorized', subCategory: 'Transfer', merchant: `Transfer`, note: note || 'Internal', isConfirmed: true, sourceAccountId: fromId }]);
    showToast("Transfer completed");
    setIsAddingRecord(false);
  };

  const handleAddExpense = (expense: Omit<Expense, 'id'>, frequency: Frequency) => {
    const id = Math.random().toString(36).substring(2, 11);
    const roundedAmt = Math.round(expense.amount);
    setExpenses(prev => [...prev, { ...expense, id, amount: roundedAmt }]);
    if (expense.sourceAccountId) {
      setWealthItems(prev => prev.map(w => {
        if (w.id === expense.sourceAccountId) return { ...w, value: w.type === 'Liability' ? w.value + roundedAmt : w.value - roundedAmt };
        return w;
      }));
    }
    showToast("Outflow logged"); setIsAddingRecord(false);
  };

  const handleAddIncome = (income: Omit<Income, 'id'>) => {
    const roundedAmt = Math.round(income.amount);
    setIncomes(prev => [...prev, { ...income, amount: roundedAmt, id: Math.random().toString(36).substring(2, 11) }]);
    if (income.targetAccountId) {
      setWealthItems(prev => prev.map(w => {
        if (w.id === income.targetAccountId) return { ...w, value: w.type === 'Liability' ? w.value - roundedAmt : w.value + roundedAmt };
        return w;
      }));
    }
    showToast("Inflow recorded"); setIsAddingRecord(false);
  };

  const handleAddBill = (bill: Omit<Bill, 'id'>) => {
    setBills(prev => [...prev, { ...bill, id: Math.random().toString(36).substring(2, 11) }]);
    showToast("Bill tracked in registry"); setIsAddingRecord(false);
  };

  const handlePayBill = (bill: Bill) => {
    setRecordToEdit({ amount: bill.amount, merchant: bill.merchant, category: bill.category, note: bill.note, billId: bill.id, date: new Date().toISOString().split('T')[0], mode: 'Expense' });
    setIsAddingRecord(true);
    if (bill.frequency !== 'None') setBills(prev => prev.map(b => b.id === bill.id ? { ...b, dueDate: calculateNextDueDate(b.dueDate, b.frequency) } : b));
    else setBills(prev => prev.filter(b => b.id !== bill.id));
    showToast("Settlement initiated");
  };

  const handleAddBulk = async (unvalidatedItems: any[]) => {
    let expCount = 0; let incCount = 0; let accCount = 0;
    const newExpensesToCommit: Expense[] = [];
    const newIncomesToCommit: Income[] = [];
    const newAccountsToCommit: WealthItem[] = [];

    const findAccountId = (name?: string) => {
        if (!name) return undefined;
        const match = wealthItems.find(w => 
          w.name.toLowerCase() === name.toLowerCase() || 
          w.alias?.toLowerCase() === name.toLowerCase()
        );
        return match?.id;
    };
    
    unvalidatedItems.forEach(item => {
      const roundedAmount = Math.round(Math.abs(item.amount || item.value || 0));
      if (item.entryType === 'Account') {
        newAccountsToCommit.push({
          id: Math.random().toString(36).substring(2, 11),
          type: item.wealthType || 'Investment',
          category: item.wealthCategory || 'Savings',
          name: item.name || item.merchant || 'Imported Account',
          alias: item.name || item.merchant || 'Imported Account',
          value: roundedAmount,
          date: item.date || new Date().toISOString()
        });
        accCount++;
      } else if (item.entryType === 'Expense' || item.entryType === 'Transfer') {
        newExpensesToCommit.push({ 
          id: Math.random().toString(36).substring(2, 11), 
          amount: roundedAmount, 
          merchant: item.merchant || 'General', 
          category: item.category || 'Uncategorized', 
          subCategory: item.subCategory || 'General', 
          date: item.date || new Date().toISOString().split('T')[0], 
          isConfirmed: true, 
          sourceAccountId: item.targetAccountId || findAccountId(item.accountName)
        });
        expCount++;
      } else if (item.entryType === 'Income') {
        newIncomesToCommit.push({ 
          id: Math.random().toString(36).substring(2, 11), 
          amount: roundedAmount, 
          type: item.incomeType || 'Other', 
          note: item.merchant || 'Direct Credit', 
          date: item.date || new Date().toISOString().split('T')[0], 
          targetAccountId: item.targetAccountId || findAccountId(item.accountName)
        });
        incCount++;
      }
    });

    setExpenses(prev => [...prev, ...newExpensesToCommit]);
    setIncomes(prev => [...prev, ...newIncomesToCommit]);
    setWealthItems(prev => [...prev, ...newAccountsToCommit]);
    showToast(`Ingested ${expCount + incCount + accCount} records`);
  };

  const handleBatchLedgerImport = async (text?: string) => {
    const textToProcess = text || importText;
    if (!textToProcess.trim()) return;
    setIsAnalyzingImport(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      const results = parseSmsLocally(textToProcess);
      if (results?.length > 0) {
        setStagedImportItems(results);
        setIsReviewingImport(true);
        setIsImportingToLedger(false);
        setImportText('');
      } else { showToast("No valid signals detected", "error"); }
    } catch (err) { showToast("Ingestion failed", "error"); } finally { setIsAnalyzingImport(false); }
  };

  const handleViewAction = (view: View) => {
    if (view === 'Add') { 
      triggerHaptic(); 
      if (currentView === 'Accounts') { setAccountToEdit(null); setIsAddingAccount(true); } 
      else { setRecordToEdit({ mode: currentView === 'Budget' ? 'Bill' : 'Expense' }); setIsAddingRecord(true); }
    } 
    else setCurrentView(view);
  };

  const handleFullReset = () => {
    triggerHaptic(50); if (!window.confirm("Nuclear Alert: This will wipe your profile and history. Proceed?")) return;
    localStorage.removeItem(STORAGE_KEY); window.location.reload();
  };

  if (isLoading) return <div className="w-full h-screen bg-brand-bg flex items-center justify-center"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;
  if (!isAuthenticated) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="h-screen overflow-hidden bg-brand-bg flex flex-col transition-all duration-700 relative text-brand-text">
      <div className="mesh-bg"><div className="mesh-blob"></div></div>
      
      <header className="flex-none bg-brand-surface/95 px-4 py-3 border-b border-brand-border z-50 backdrop-blur-md transition-colors duration-500">
        <div className="max-w-2xl mx-auto flex justify-between items-center w-full">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-brand-primary"><path d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" fill="currentColor" /><path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><text x="12" y="17" fontSize="6" fontWeight="900" textAnchor="middle" fill="white">JK</text></svg>
              <button onClick={() => { triggerHaptic(); setIsShowingVersionLog(true); }} className="bg-brand-bg/50 px-1.5 py-0.5 rounded-full border border-brand-border active:scale-95 transition-transform mt-1"><span className="text-[8px] font-black text-brand-text/50">v1.1.9</span></button>
            </div>
            <h1 className="text-[9px] font-bold text-brand-text lowercase tracking-tight mt-0.5 ml-1">just keep it</h1>
          </div>
          <nav className="flex items-center gap-1">
            <button onClick={() => { triggerHaptic(); setCurrentView('Dashboard'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Dashboard' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-brand-text/40'}`}><LayoutDashboard size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Budget'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Budget' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-brand-text/40'}`}><Target size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Accounts'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Accounts' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-brand-text/40'}`}><Wallet size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Rules'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Rules' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-brand-text/40'}`}><Cpu size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Ledger'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Ledger' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-brand-text/40'}`}><List size={18} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setIsShowingNotifications(true); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 relative ${isShowingNotifications ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-brand-text/40'}`}><Bell size={18} strokeWidth={2.5} />{notifications.filter(n=>!n.read).length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary text-brand-accent text-[8px] font-black flex items-center justify-center rounded-full border-2 border-brand-bg">{notifications.filter(n=>!n.read).length}</span>}</button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Profile'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 overflow-hidden border-2 ${currentView === 'Profile' ? 'border-brand-primary' : 'border-transparent'}`}>{user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" /> : <SettingsIcon size={17} />}</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        <div className="max-w-2xl mx-auto w-full px-4 min-h-full flex flex-col">
          <div className="flex-1">
            {currentView === 'Dashboard' && <Dashboard expenses={expenses} incomes={incomes} wealthItems={wealthItems} settings={settings} user={user} onCategorizeClick={() => setIsCategorizing(true)} onConfirmExpense={(id, cat) => onUpdateExpense(id, { category: cat, isConfirmed: true })} onSmartAdd={() => {}} viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} onGoToDate={(y, m) => setViewDate(new Date(y, m, 1))} onInsightsReceived={() => {}} />}
            {currentView === 'Budget' && <BudgetPlanner budgetItems={budgetItems} recurringItems={[]} expenses={expenses} bills={bills} settings={settings} onAddBudget={(b) => setBudgetItems(p => [...p, { ...b, id: Math.random().toString(36).substring(2, 11) }])} onUpdateBudget={(id, u) => setBudgetItems(p => p.map(b => b.id === id ? { ...b, ...u } : b))} onDeleteBudget={(id) => { setBudgetItems(p => p.filter(b => b.id !== id)); showToast("Budget node decommissioned", "info"); }} onPayBill={handlePayBill} onDeleteBill={(id) => { setBills(p => p.filter(b => b.id !== id)); showToast("Bill removed", "info"); }} onSmartAddBill={() => { triggerHaptic(); setRecordToEdit({ mode: 'Bill' }); setIsAddingRecord(true); }} viewDate={viewDate} externalShowAdd={false} onAddClose={() => {}} />}
            {currentView === 'Accounts' && <Accounts wealthItems={wealthItems} expenses={expenses} incomes={incomes} settings={settings} onUpdateWealth={(id, u) => { setWealthItems(p => p.map(w => w.id === id ? { ...w, ...u } : w)); showToast("Account registry updated"); }} onDeleteWealth={handleDeleteAccount} onAddWealth={(w) => { setWealthItems(p => [...p, { ...w, id: Math.random().toString(36).substring(2, 11) }]); showToast("New instrument provisioned"); setAccountToEdit(null); setIsAddingAccount(false); } } onEditAccount={(acc) => { setAccountToEdit(acc); setIsAddingAccount(true); }} onAddAccountClick={() => { setAccountToEdit(null); setIsAddingAccount(true); }} onAddIncomeClick={() => { triggerHaptic(); setRecordToEdit({ mode: 'Income' }); setIsAddingRecord(true); }} onAddTransferClick={() => { triggerHaptic(); setRecordToEdit({ mode: 'Transfer' }); setIsAddingRecord(true); }} onDeleteExpense={handleDeleteExpense} onDeleteIncome={handleDeleteIncome} externalShowAdd={false} onAddClose={() => {}} />}
            {currentView === 'Rules' && <RulesEngine rules={rules} highlightRuleId={highlightedRuleId} onClearHighlight={() => setHighlightedRuleId(null)} recurringItems={[]} settings={settings} onAddRule={handleAddRule} onDeleteRule={handleDeleteRule} onDeleteRecurring={() => {}} />}
            {currentView === 'Ledger' && <Ledger expenses={expenses} incomes={incomes} wealthItems={wealthItems} rules={rules} settings={settings} onDeleteExpense={handleDeleteExpense} onDeleteIncome={handleDeleteIncome} onConfirm={(id, cat) => onUpdateExpense(id, { category: cat, isConfirmed: true })} onUpdateExpense={onUpdateExpense} onEditRecord={(r) => { triggerHaptic(); setRecordToEdit(r); setIsAddingRecord(true); }} onOpenImport={() => setIsImportingToLedger(true)} onViewRule={handleViewRule} viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} onGoToDate={(y, m) => setViewDate(new Date(y, m, 1))} addNotification={addNotification} />}
            {currentView === 'Profile' && <Settings settings={settings} user={user} onLogout={handleLogout} onReset={handleFullReset} onToggleTheme={() => { setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' })); showToast("Interface polarity toggled", "info"); }} onUpdateAppTheme={(t) => { setSettings(s => ({ ...s, appTheme: t })); showToast(`Visual ID: ${t}`); }} onUpdateCurrency={(c) => { setSettings(s => ({ ...s, currency: c })); showToast(`Currency: ${c}`); }} onUpdateDataFilter={(f) => { setSettings(s => ({ ...s, dataFilter: f })); showToast(`View scope: ${f}`); }} onUpdateSplit={(split) => { setSettings(s => ({ ...s, split })); showToast("Allocation logic updated"); }} onUpdateBaseIncome={(income) => { setSettings(s => ({ ...s, monthlyIncome: Math.round(income) })); showToast("Income baseline updated"); }} onSync={handleSyncToCloud} onExport={handleExportData} onImport={handleImportData} onAddBulk={handleAddBulk} isSyncing={isSyncing} onLoadMockData={handleLoadMockData} onPurgeMockData={handlePurgeAllMockData} onPurgeAllData={handlePurgeAllData} onClearExpenses={() => { setExpenses([]); showToast("Ledger records purged", "error"); }} wealthItems={wealthItems} />}
          </div>
          <Footer />
        </div>
      </main>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <Navbar currentView={currentView} remainingPercentage={globalMetrics.remainingPercentage} netWorth={globalMetrics.netWorth} categoryPercentages={globalMetrics.categoryPercentages} onViewChange={handleViewAction} />
      
      {isReviewingImport && (
        <ImportReviewModal 
          stagedItems={stagedImportItems} 
          wealthItems={wealthItems} 
          settings={settings} 
          onConfirm={(final) => { handleAddBulk(final); setIsReviewingImport(false); setStagedImportItems([]); }} 
          onCancel={() => { setIsReviewingImport(false); setStagedImportItems([]); }} 
        />
      )}

      {isAddingAccount && (
        <AccountForm 
          settings={settings} initialData={accountToEdit} 
          onSave={(acc) => { setWealthItems(p => [...p, { ...acc, id: Math.random().toString(36).substring(2, 11) }]); setIsAddingAccount(false); showToast("Instrument registered"); }} 
          onUpdate={(id, u) => { setWealthItems(p => p.map(w => w.id === id ? { ...w, ...u } : w)); setAccountToEdit(null); setIsAddingAccount(false); showToast("Registry updated"); }} 
          onDelete={handleDeleteAccount} 
          onCancel={() => { setAccountToEdit(null); setIsAddingAccount(false); }} 
        />
      )}
      
      {isImportingToLedger && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-brand-surface w-full max-w-lg rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] animate-slide-up border border-brand-border">
             <div className="flex justify-between items-center px-6 py-4 border-b border-brand-border">
                <h3 className="text-xs font-black uppercase text-brand-text tracking-widest">Import to Ledger</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => { triggerHaptic(); if (csvFileInputRef.current) csvFileInputRef.current.click(); }} className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-full text-indigo-500 active:scale-90 transition-transform"><FolderOpen size={18} /></button>
                  <button onClick={() => setIsImportingToLedger(false)} className="p-2 bg-brand-bg rounded-full text-brand-text/40"><X size={18} /></button>
                </div>
             </div>
             <div className="p-6 space-y-4">
                <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste CSV or banking logs here..." className="w-full h-44 bg-brand-bg p-4 rounded-2xl text-[11px] font-medium outline-none border border-brand-border text-brand-text resize-none" />
                <button onClick={() => handleBatchLedgerImport()} disabled={!importText || isAnalyzingImport} className="w-full bg-brand-primary text-brand-accent font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95">
                  {isAnalyzingImport ? <Loader2 size={16} className="animate-spin" /> : <><Sparkles size={16} /> Direct Ingestion</>}
                </button>
                <input type="file" ref={csvFileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = (ev) => { setImportText(ev.target?.result as string); handleBatchLedgerImport(ev.target?.result as string); }; r.readAsText(f); } }} accept=".csv,text/csv,text/plain" className="sr-only" />
             </div>
          </div>
        </div>
      )}

      {isAddingRecord && <AddRecord settings={settings} wealthItems={wealthItems} expenses={expenses} rules={rules} onAddRule={handleAddRule} onAdd={handleAddExpense} onAddIncome={handleAddIncome} onAddBill={handleAddBill} onTransfer={handleTransfer} onUpdateExpense={onUpdateExpense} onUpdateIncome={(id, u) => { setIncomes(p => p.map(i => i.id === id ? { ...i, ...u } : i)); showToast("Inflow updated"); }} onDelete={() => { if (recordToEdit?.recordType === 'income') handleDeleteIncome(recordToEdit.id); else handleDeleteExpense(recordToEdit.id); setRecordToEdit(null); setIsAddingRecord(false); }} onCancel={() => { setIsAddingRecord(false); setRecordToEdit(null); }} onOpenBulkImport={() => { setIsAddingRecord(false); setIsImportingToLedger(true); }} initialData={recordToEdit} />}
      {isCategorizing && <CategorizationModal settings={settings} expenses={expenses.filter(e => !e.isConfirmed)} onConfirm={(id, cat) => onUpdateExpense(id, { category: cat, isConfirmed: true })} onClose={() => setIsCategorizing(false)} />}
      {isShowingNotifications && <NotificationPane notifications={notifications} onClose={() => setIsShowingNotifications(false)} onClear={() => setNotifications([])} />}
      {isShowingVersionLog && <VersionLog onClose={() => setIsShowingVersionLog(false)} />}
    </div>
  );
};

export default App;
