
export type Category = 'Needs' | 'Wants' | 'Savings' | 'Uncategorized';

export type Frequency = 'None' | 'Weekly' | 'Monthly' | 'Yearly';

export interface Expense {
  id: string;
  amount: number;
  date: string;
  category: Category;
  note?: string;
  merchant?: string;
  isConfirmed: boolean;
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
  isCloudSyncEnabled: boolean;
  currency: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export type View = 'Dashboard' | 'Expenses' | 'Rules' | 'Profile' | 'Add' | 'Auth';
