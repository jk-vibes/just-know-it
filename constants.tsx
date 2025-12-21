
import React from 'react';
import { Category } from './types';

export const CATEGORY_COLORS: Record<Category, string> = {
  Needs: '#3B82F6', // blue-500
  Wants: '#F59E0B', // amber-500
  Savings: '#10B981', // emerald-500
  Uncategorized: '#9CA3AF', // gray-400
};

export const DEFAULT_SPLIT = {
  Needs: 50,
  Wants: 30,
  Savings: 20
};
