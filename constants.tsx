import { Category } from './types';

export const CATEGORY_COLORS: Record<Category, string> = {
  Needs: '#ef4444',     // Red
  Wants: '#8b5cf6',     // Violet
  Savings: '#10b981',   // Emerald
  Uncategorized: '#94a3b8' // Slate
};

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