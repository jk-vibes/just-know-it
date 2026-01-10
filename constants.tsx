
import { Category, PaymentMethod } from './types';

export const CATEGORY_COLORS: Record<Category, string> = {
  Needs: '#ff3d71',     // Vibrant Electric Rose
  Wants: '#8b5cf6',     // Rich Violet
  Savings: '#00d68f',   // Vivid Emerald
  Uncategorized: '#94a3b8' // Slate
};

export const SUB_CATEGORIES: Record<Category, string[]> = {
  Needs: ['Rent/Mortgage', 'Groceries', 'Utilities', 'Fuel/Transport', 'Health/Insurance', 'Education', 'Debt Interest'],
  Wants: ['Dining', 'Shopping', 'Travel', 'Entertainment', 'Subscription', 'Gifts', 'Hobbies'],
  Savings: ['SIP/Mutual Fund', 'Emergency Fund', 'Stocks', 'Gold', 'Real Estate', 'Crypto', 'Cash Stash'],
  Uncategorized: ['General', 'Transfer', 'Correction']
};

export const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Card', 'Cash', 'Net Banking', 'Other'];

export const DEFAULT_SPLIT = {
  Needs: 50,
  Wants: 30,
  Savings: 20
};

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
];

export const getCurrencySymbol = (code: string) => {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)?.symbol || '₹';
};
