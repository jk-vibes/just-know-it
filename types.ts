
export type Category = 'Needs' | 'Wants' | 'Savings' | 'Uncategorized';

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

export interface UserSettings {
  monthlyIncome: number;
  split: {
    Needs: number;
    Wants: number;
    Savings: number;
  };
  isOnboarded: boolean;
}

export type View = 'Dashboard' | 'Expenses' | 'Rules' | 'Profile' | 'Add';
