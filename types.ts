export type Category = 'Needs' | 'Wants' | 'Savings' | 'Uncategorized';
export type Frequency = 'None' | 'Weekly' | 'Monthly' | 'Yearly';
export type IncomeType = 'Salary' | 'Freelance' | 'Investment' | 'Gift' | 'Other';
export type AppTheme = 'Spiderman' | 'CaptainAmerica' | 'Naruto';
export type PaymentMethod = 'UPI' | 'Card' | 'Cash' | 'Net Banking' | 'Other';
export type DensityLevel = 'Normal' | 'Simple' | 'Compact';

export type WealthType = 'Investment' | 'Liability';
export type WealthCategory = 
  | 'Stock' | 'Mutual Fund' | 'Crypto' | 'Gold' | 'Real Estate' 
  | 'Loan' | 'Credit Card' | 'Other'
  | 'Checking Account' | 'Savings Account' | 'Cash';

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  category: Category;
  subCategory?: string;
  isRecurringLink?: string; 
  isMock?: boolean;
}

export interface Bill {
  id: string;
  amount: number;
  dueDate: string;
  merchant: string;
  category: Category;
  isPaid: boolean;
  frequency: Frequency;
  image?: string; // base64
  note?: string;
}

export interface Expense {
  id: string;
  amount: number;
  date: string;
  category: Category;
  subCategory?: string;
  paymentMethod?: PaymentMethod;
  note?: string;
  merchant?: string;
  isConfirmed: boolean;
  sourceAccountId?: string; 
  isMock?: boolean;
  billId?: string; // Optional link to a captured bill
}

export interface Income {
  id: string;
  amount: number;
  date: string;
  type: IncomeType;
  paymentMethod?: PaymentMethod;
  note?: string;
  targetAccountId?: string; 
  isMock?: boolean;
}

export interface WealthItem {
  id: string;
  type: WealthType;
  category: WealthCategory;
  name: string;
  value: number;
  limit?: number;
  date: string;
  isMock?: boolean;
}

export interface BudgetRule {
  id: string;
  keyword: string;
  category: Category;
}

export interface RecurringItem {
  id: string;
  amount: number;
  category: Category;
  subCategory?: string;
  note: string;
  merchant?: string;
  frequency: Frequency;
  nextDueDate: string;
  isMock?: boolean;
}

export interface Notification {
  id: string;
  type: 'AI' | 'Activity' | 'Bill' | 'Strategy';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity?: 'info' | 'success' | 'warning' | 'error';
  metadata?: any; // For strategy scores or bill links
}

export interface UserSettings {
  monthlyIncome: number;
  split: {
    Needs: number;
    Wants: number;
    Savings: number;
  };
  isOnboarded: boolean;
  theme: 'light' | 'dark' | 'system';
  appTheme?: AppTheme;
  isCloudSyncEnabled: boolean;
  currency: string;
  dataFilter: 'all' | 'user' | 'mock';
  lastSynced?: string;
  density?: DensityLevel;
  hasLoadedMockData?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  accessToken?: string;
}

export type View = 'Dashboard' | 'Transactions' | 'Profile' | 'Add' | 'Auth' | 'Accounts' | 'Budget';