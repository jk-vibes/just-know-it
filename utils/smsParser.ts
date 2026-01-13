import { Category, WealthType, WealthCategory } from '../types';
import { SUB_CATEGORIES } from '../constants';

export interface ParsedEntry {
  entryType: 'Expense' | 'Income' | 'Transfer' | 'Account' | 'Bill Payment';
  amount?: number;
  merchant?: string;
  source?: string;
  category?: Category;
  subCategory?: string;
  date: string;
  incomeType?: string;
  rawContent?: string;
  accountName?: string;
  targetAccountId?: string;
  // Account specific fields
  wealthType?: WealthType;
  wealthCategory?: WealthCategory;
  value?: number;
  name?: string;
}

/**
 * Robust CSV Lexer for multiline financial logs.
 */
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        if (currentField !== '' || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        if (char === '\r') i++;
      } else {
        currentField += char;
      }
    }
  }

  if (currentRow.length > 0 || currentField) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

const PATTERNS = {
  amount: /(?:Rs\.?|INR|Amt|VPA|Voucher)\s*([\d,]+\.?\d*)/i,
  spent: /\b(spent|paid|debited|deducted|dr|sent Rs|payment made to|vpa|purchase made on|debit)\b/i,
  received: /\b(received|credited|deposited|cr|added|refunded|inward|transferred to your a\/c|credit)\b/i,
  transfer: /\b(transfer|remit|internal|self|to a\/c|from a\/c|linked account|tfr)\b/i,
  ccPayment: /\b(credit card payment|cc payment|cc bill|credit card bill|card payment|card settlement|paid card)\b/i,
  merchant: /(?:to|at|towards|from|by|spent on|payment for|info:)\s+([^,.\n\r]+?)(?:\s+(?:via|on|Ref|Txn|Link|Date|Avl|Bal|Not you|Remaining))/i,
  date: /(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})/, 
  otp: /\b(otp|one time password|verification code|security code)\b/i,
  junk: /\b(offer|loan|congratulations|reward|limited time|click here|avl bal|available bal|balance is|limit|will be debited|scheduled|reminder|due on|eligible|apply for|pre-approved|requested|authorized for|statement|minimum of|minimum amt|is due by|due by|min of|sent to your email|sent to [\w.]+@|to view statement|e-statement|generated for)\b/i
};

/**
 * Maps a descriptive string to the best possible Category and Sub-Category.
 */
function resolveCategorySignals(text: string): { category: Category; subCategory: string } {
  const combined = text.toLowerCase();
  
  // 0. High priority check for Credit Card Payments
  if (PATTERNS.ccPayment.test(combined)) {
    return { category: 'Uncategorized', subCategory: 'Bill Payment' };
  }

  // 1. Try to find an exact or partial match in existing sub-category names
  for (const [parent, children] of Object.entries(SUB_CATEGORIES)) {
    const match = children.find(child => {
      const c = child.toLowerCase();
      return combined.includes(c) || (combined.length > 3 && c.includes(combined));
    });
    if (match) {
      return { category: parent as Category, subCategory: match };
    }
  }

  // 2. Broad keyword fallbacks for Parents and specific sensible defaults
  if (combined.includes('rent') || combined.includes('mortgage') || combined.includes('home')) {
    return { category: 'Needs', subCategory: 'Rent/Mortgage' };
  }
  if (combined.includes('util') || combined.includes('electricity') || combined.includes('water') || combined.includes('gas') || combined.includes('bill')) {
    return { category: 'Needs', subCategory: 'Utilities' };
  }
  if (combined.includes('fuel') || combined.includes('petrol') || combined.includes('diesel') || combined.includes('uber') || combined.includes('ola') || combined.includes('transport')) {
    return { category: 'Needs', subCategory: 'Fuel/Transport' };
  }
  if (combined.includes('grocer') || combined.includes('market') || combined.includes('blinkit') || combined.includes('zepto') || combined.includes('bigbasket')) {
    return { category: 'Needs', subCategory: 'Groceries' };
  }
  if (combined.includes('shopping') || combined.includes('amazon') || combined.includes('flipkart') || combined.includes('myntra')) {
    return { category: 'Wants', subCategory: 'Shopping' };
  }
  if (combined.includes('swiggy') || combined.includes('zomato') || combined.includes('dine') || combined.includes('food') || combined.includes('restaurant') || combined.includes('cafe')) {
    return { category: 'Wants', subCategory: 'Dining' };
  }
  if (combined.includes('invest') || combined.includes('mutual') || combined.includes('sip') || combined.includes('groww') || combined.includes('zerodha') || combined.includes('etmoney')) {
    return { category: 'Savings', subCategory: 'SIP/Mutual Fund' };
  }

  return { category: 'Uncategorized', subCategory: 'General' };
}

/**
 * Main parser that identifies financial signals in unstructured text or structured CSV.
 */
export function parseSmsLocally(text: string): ParsedEntry[] {
  if (!text || !text.trim()) return [];

  const rows = parseCSV(text);
  
  // Detection logic for headers
  const headerIdx = rows.findIndex(row => {
    const r = row.join(',').toUpperCase();
    return (r.includes('DATE') && r.includes('AMOUNT')) || 
           (r.includes('ACCOUNT') && r.includes('BALANCE')) ||
           (r.includes('BANK') && r.includes('BAL')) ||
           (r.includes('PLACE') && (r.includes('DR/CR') || r.includes('TYPE') || r.includes('CATEGORY') || r.includes('CR/DR')));
  });

  if (headerIdx !== -1) {
    return parseStructuredRows(rows, headerIdx);
  }

  // Fallback to unstructured SMS parsing
  const today = new Date().toISOString().split('T')[0];
  const results: ParsedEntry[] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const entry = processRawLine(line, today);
    if (entry) results.push(entry);
  }
  return results;
}

/**
 * Handles various structured CSV types (Axio, Generic Bank, or Account Export)
 */
function parseStructuredRows(rows: string[][], headerIdx: number): ParsedEntry[] {
  const results: ParsedEntry[] = [];
  const headers = rows[headerIdx].map(h => h.toUpperCase());
  
  // Column Mapping
  const getCol = (names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));
  
  const dateCol = getCol(['DATE', 'TIMESTAMP', 'TIME']);
  const merchantCol = getCol(['PLACE', 'MERCHANT', 'DESCRIPTION', 'NOTE', 'PAYEE', 'PARTICULAR', 'NARRATION', 'REMARKS']);
  const amountCol = getCol(['AMOUNT', 'VALUE', 'TOTAL', 'DEBIT', 'CREDIT']);
  const balanceCol = getCol(['BALANCE', 'CURRENT BALANCE', 'BAL']);
  const typeCol = getCol(['DR/CR', 'TYPE', 'TRANSACTION TYPE', 'MODE', 'CR/DR']);
  const categoryCol = getCol(['CATEGORY', 'TAG', 'LABEL']);
  const accountCol = getCol(['ACCOUNT', 'BANK', 'SOURCE', 'HINT', 'ACC']);

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    try {
      const typeStr = row[typeCol]?.toUpperCase() || '';
      const rawCategoryText = row[categoryCol] || '';
      const desc = row[merchantCol] || '';
      const accHint = row[accountCol] || '';

      // 1. Transaction Parsing
      let amountStr = row[amountCol]?.replace(/,/g, '') || '0';
      
      // Handle separate Debit/Credit columns
      const debitCol = headers.findIndex(h => h === 'DEBIT');
      const creditCol = headers.findIndex(h => h === 'CREDIT');
      let forceType: 'Expense' | 'Income' | null = null;
      
      if (debitCol !== -1 && creditCol !== -1) {
        const dVal = parseFloat(row[debitCol]?.replace(/,/g, '') || '0');
        const cVal = parseFloat(row[creditCol]?.replace(/,/g, '') || '0');
        if (dVal > 0) { amountStr = dVal.toString(); forceType = 'Expense'; }
        else if (cVal > 0) { amountStr = cVal.toString(); forceType = 'Income'; }
      }

      const amount = Math.round(parseFloat(amountStr));
      if (isNaN(amount) || amount === 0) continue;

      let entryType: 'Expense' | 'Income' | 'Transfer' = forceType || 'Expense';
      
      // Detect Credit Card Payments first to avoid marking as Income
      const isCC = PATTERNS.ccPayment.test(typeStr) || PATTERNS.ccPayment.test(desc) || PATTERNS.ccPayment.test(rawCategoryText);
      
      if (isCC) {
        entryType = 'Transfer'; // Treat as transfer to settle liability
      } else if (!forceType) {
        if (typeStr === 'CR' || typeStr.includes('CREDIT') || PATTERNS.received.test(typeStr) || PATTERNS.received.test(desc)) {
          entryType = 'Income';
        } else if (typeStr === 'DR' || typeStr.includes('DEBIT') || PATTERNS.spent.test(typeStr) || PATTERNS.spent.test(desc)) {
          entryType = 'Expense';
        }
      }
      
      // Identify generic Transfers if not already a CC payment
      if (entryType !== 'Transfer' && (rawCategoryText.toLowerCase().includes('transfer') || PATTERNS.transfer.test(desc.toLowerCase()) || PATTERNS.transfer.test(typeStr.toLowerCase()))) {
        entryType = 'Transfer';
      }

      // Resolve proper Category and Sub-category mapping
      const { category, subCategory } = (entryType === 'Transfer' || isCC)
        ? { category: 'Uncategorized' as Category, subCategory: isCC ? 'Bill Payment' : 'Transfer' }
        : resolveCategorySignals(rawCategoryText + ' ' + desc);

      results.push({
        entryType: entryType === 'Transfer' ? 'Transfer' : entryType,
        amount: Math.abs(amount),
        merchant: desc || 'Unknown',
        date: row[dateCol] || new Date().toISOString().split('T')[0],
        category,
        subCategory,
        accountName: accHint || (desc.toLowerCase().includes('a/c') ? 'Bank Account' : undefined),
        rawContent: row.join(' | '),
        incomeType: entryType === 'Income' ? 'Other' : undefined
      });
    } catch (e) {
      console.warn("Structured row parse failed", e);
    }
  }

  return results;
}

function processRawLine(content: string, fallbackDate: string): ParsedEntry | null {
  if (!content || content.trim().length < 10) return null;
  const lowerContent = content.toLowerCase();

  if (PATTERNS.otp.test(lowerContent) || PATTERNS.junk.test(lowerContent)) return null;

  try {
    const amountMatch = content.match(PATTERNS.amount);
    if (!amountMatch) return null;
    const amount = Math.round(parseFloat(amountMatch[1].replace(/,/g, '')));
    if (isNaN(amount) || amount <= 0) return null;

    const isCredit = PATTERNS.received.test(lowerContent);
    const isDebit = PATTERNS.spent.test(lowerContent);
    const isTransfer = PATTERNS.transfer.test(lowerContent);
    const isCC = PATTERNS.ccPayment.test(lowerContent);
    
    if (!isCredit && !isDebit && !isTransfer && !isCC) return null;
    
    let merchant = 'General';
    const mMatch = content.match(PATTERNS.merchant);
    if (mMatch) merchant = mMatch[1].trim();
    merchant = merchant.replace(/^[^\w]+|[^\w]+$/g, '').substring(0, 30) || 'Retailer';

    let logDate = fallbackDate;
    const dateMatch = content.match(PATTERNS.date);
    if (dateMatch) {
      const [full, d1, d2, d3] = dateMatch;
      if (d1.length === 4) logDate = `${d1}-${d2.padStart(2, '0')}-${d3.padStart(2, '0')}`;
      else if (d3.length === 4) logDate = `${d3}-${d2.padStart(2, '0')}-${d1.padStart(2, '0')}`;
    }

    if (isCC) return { entryType: 'Transfer', amount, merchant, category: 'Uncategorized', subCategory: 'Bill Payment', date: logDate, rawContent: content };
    if (isTransfer) return { entryType: 'Transfer', amount, merchant, category: 'Uncategorized', subCategory: 'Transfer', date: logDate, rawContent: content };
    
    const { category, subCategory } = resolveCategorySignals(merchant + ' ' + content);
    
    if (isCredit) return { entryType: 'Income', amount, source: merchant, incomeType: 'Other', date: logDate, rawContent: content };
    return { entryType: 'Expense', amount, merchant, category, subCategory, date: logDate, rawContent: content };
  } catch (err) { return null; }
}