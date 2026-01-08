
export type Category = 'Needs' | 'Wants' | 'Savings' | 'Uncategorized';
export type Frequency = 'None' | 'Weekly' | 'Monthly' | 'Yearly';
export type IncomeType = 'Salary' | 'Freelance' | 'Investment' | 'Gift' | 'Other';
export type AppTheme = 'Standard' | 'Spiderman' | 'CaptainAmerica' | 'Naruto';

export interface Expense {
  id: string;
  amount: number;
  date: string;
  category: Category;
  subCategory?: string;
  note?: string;
  merchant?: string;
  isConfirmed: boolean;
  isMock?: boolean;
}

export interface Income {
  id: string;
  amount: number;
  date: string;
  type: IncomeType;
  note?: string;
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
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  accessToken?: string;
}

export type View = 'Dashboard' | 'Expenses' | 'Rules' | 'Profile' | 'Add' | 'Auth';
