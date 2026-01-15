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
 * Robust CSV Lexer that supports different delimiters and quoted fields.
 */
function parseCSV(csvText: string): string[][] {
  if (!csvText) return [];
  
  // Detect delimiter
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  let delimiter = ',';
  if (semiCount > commaCount) delimiter = ';';
  if (tabCount > Math.max(commaCount, semiCount)) delimiter = '\t';

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
      } else if (char === delimiter) {
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

  return rows.filter(row => row.length > 0);
}

const PATTERNS = {
  amount: /(?:Rs\.?|INR|Amt|VPA|Voucher|Amount)\s*([\d,]+\.?\d*)/i,
  spent: /\b(spent|paid|debited|deducted|dr|sent Rs|payment made to|vpa|purchase made on|debit|outflow)\b/i,
  received: /\b(received|credited|deposited|cr|added|refunded|inward|transferred to your a\/c|credit|inflow)\b/i,
  transfer: /\b(transfer|remit|internal|self|to a\/c|from a\/c|linked account|tfr|own account)\b/i,
  ccPayment: /\b(credit card payment|cc payment|cc bill|credit card bill|card payment|card settlement|paid card|bill desk)\b/i,
  merchant: /(?:to|at|towards|from|by|spent on|payment for|info:)\s+([^,.\n\r]+?)(?:\s+(?:via|on|Ref|Txn|Link|Date|Avl|Bal|Not you|Remaining))/i,
  date: /(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/, 
  otp: /\b(otp|one time password|verification code|security code)\b/i,
  junk: /\b(offer|loan|congratulations|reward|limited time|click here|avl bal|available bal|balance is|limit|will be debited|scheduled|reminder|due on|eligible|apply for|pre-approved|requested|authorized for|statement|minimum of|minimum amt|is due by|due by|min of|sent to your email|sent to [\w.]+@|to view statement|e-statement|generated for)\b/i
};

function resolveCategorySignals(text: string): { category: Category; subCategory: string } {
  const combined = text.toLowerCase();
  
  if (PATTERNS.ccPayment.test(combined)) {
    return { category: 'Uncategorized', subCategory: 'Bill Payment' };
  }

  for (const [parent, children] of Object.entries(SUB_CATEGORIES)) {
    const match = children.find(child => {
      const c = child.toLowerCase();
      return combined.includes(c) || (combined.length > 3 && c.includes(combined));
    });
    if (match) {
      return { category: parent as Category, subCategory: match };
    }
  }

  if (combined.includes('rent') || combined.includes('mortgage') || combined.includes('home')) return { category: 'Needs', subCategory: 'Rent/Mortgage' };
  if (combined.includes('util') || combined.includes('electricity') || combined.includes('water') || combined.includes('gas') || combined.includes('bill')) return { category: 'Needs', subCategory: 'Utilities' };
  if (combined.includes('fuel') || combined.includes('petrol') || combined.includes('diesel') || combined.includes('uber') || combined.includes('ola') || combined.includes('transport')) return { category: 'Needs', subCategory: 'Fuel/Transport' };
  if (combined.includes('grocer') || combined.includes('market') || combined.includes('blinkit') || combined.includes('zepto') || combined.includes('bigbasket') || combined.includes('swiggy instamart')) return { category: 'Needs', subCategory: 'Groceries' };
  if (combined.includes('shopping') || combined.includes('amazon') || combined.includes('flipkart') || combined.includes('myntra') || combined.includes('ajio')) return { category: 'Wants', subCategory: 'Shopping' };
  if (combined.includes('swiggy') || combined.includes('zomato') || combined.includes('dine') || combined.includes('food') || combined.includes('restaurant') || combined.includes('cafe') || combined.includes('starbucks')) return { category: 'Wants', subCategory: 'Dining' };
  if (combined.includes('invest') || combined.includes('mutual') || combined.includes('sip') || combined.includes('groww') || combined.includes('zerodha') || combined.includes('etmoney') || combined.includes('upstox')) return { category: 'Savings', subCategory: 'SIP/Mutual Fund' };

  return { category: 'Uncategorized', subCategory: 'General' };
}

function isDate(val: string): boolean {
  if (!val) return false;
  return PATTERNS.date.test(val) || !isNaN(Date.parse(val));
}

function isAmount(val: string): boolean {
  if (!val) return false;
  const cleaned = val.replace(/,/g, '').trim();
  return !isNaN(parseFloat(cleaned)) && isFinite(Number(cleaned));
}

function guessColumnIndexes(rows: string[][]) {
  if (rows.length < 1) return null;
  const sample = rows[0];
  
  let dateIdx = -1;
  let amountIdx = -1;
  let descIdx = -1;

  for (let i = 0; i < sample.length; i++) {
    const val = sample[i];
    if (dateIdx === -1 && isDate(val)) dateIdx = i;
    else if (amountIdx === -1 && isAmount(val)) amountIdx = i;
    else if (descIdx === -1 && val.length > 3) descIdx = i;
  }

  if (dateIdx !== -1 && amountIdx !== -1) {
    return { dateIdx, amountIdx, descIdx: descIdx !== -1 ? descIdx : (sample.findIndex((v, i) => i !== dateIdx && i !== amountIdx)) };
  }
  return null;
}

export function parseSmsLocally(text: string): ParsedEntry[] {
  if (!text || !text.trim()) return [];

  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  
  // Header detection logic
  const headerIdx = rows.findIndex(row => {
    const r = row.join(',').toUpperCase();
    return (r.includes('DATE') && (r.includes('AMOUNT') || r.includes('DEBIT') || r.includes('CREDIT'))) || 
           (r.includes('ACCOUNT') && (r.includes('BAL') || r.includes('NAME') || r.includes('TYPE'))) ||
           (r.includes('PAYEE') || r.includes('MERCHANT') || r.includes('DESC') || r.includes('PARTICULAR') || r.includes('NARRA'));
  });

  if (headerIdx !== -1) {
    return parseStructuredRows(rows, headerIdx);
  }

  const guessed = guessColumnIndexes(rows);
  if (guessed) {
    return parseStructuredRows(rows, -1, guessed);
  }

  // Fallback to unstructured parsing
  const today = new Date().toISOString().split('T')[0];
  const results: ParsedEntry[] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const entry = processRawLine(line, today);
    if (entry) results.push(entry);
  }
  return results;
}

function parseStructuredRows(rows: string[][], headerIdx: number, guessedIndexes?: any): ParsedEntry[] {
  const results: ParsedEntry[] = [];
  
  let dateCol = -1, merchantCol = -1, amountCol = -1, typeCol = -1, categoryCol = -1, accountCol = -1;
  let debitCol = -1, creditCol = -1, balanceCol = -1;
  // Fix: Declare headers outside the if block to ensure it's accessible in the loop below
  let headers: string[] = [];

  if (headerIdx !== -1) {
    // Fix: Assign to the headers variable declared above
    headers = rows[headerIdx].map(h => h.toUpperCase());
    const getCol = (names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));
    
    dateCol = getCol(['DATE', 'TIMESTAMP', 'TIME', 'TXN DATE']);
    merchantCol = getCol(['PLACE', 'MERCHANT', 'DESCRIPTION', 'NOTE', 'PAYEE', 'PARTICULAR', 'NARRATION', 'REMARKS', 'DESC', 'ACCOUNT NAME']);
    amountCol = getCol(['AMOUNT', 'VALUE', 'TOTAL', 'TRANSACTION AMT']);
    balanceCol = getCol(['BALANCE', 'BAL', 'CURRENT BAL', 'OUTSTANDING']);
    debitCol = headers.findIndex(h => h === 'DEBIT' || h === 'DR' || h.includes('WITHDRAW'));
    creditCol = headers.findIndex(h => h === 'CREDIT' || h === 'CR' || h.includes('DEPOSIT'));
    typeCol = getCol(['DR/CR', 'TYPE', 'TRANSACTION TYPE', 'MODE', 'CR/DR', 'ACCOUNT TYPE']);
    categoryCol = getCol(['CATEGORY', 'TAG', 'LABEL', 'TAGS']);
    accountCol = getCol(['ACCOUNT', 'BANK', 'SOURCE', 'HINT', 'ACC', 'ACCOUNT NAME']);
  } else {
    dateCol = guessedIndexes.dateIdx;
    amountCol = guessedIndexes.amountIdx;
    merchantCol = guessedIndexes.descIdx;
  }

  const startIdx = headerIdx + 1;
  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    try {
      const typeStr = (typeCol !== -1 ? row[typeCol] : '').toUpperCase();
      const desc = (merchantCol !== -1 ? row[merchantCol] : '') || '';
      const accHint = (accountCol !== -1 ? row[accountCol] : '') || '';
      
      let amountVal = 0;
      let entryType: 'Expense' | 'Income' | 'Transfer' | 'Account' = 'Expense';

      // Type Detection Improvements
      const isAccountLabel = typeStr.includes('ACCOUNT') || typeStr.includes('ASSET') || typeStr.includes('LIABILITY') || typeStr.includes('INVESTMENT') || typeStr.includes('SAVINGS') || typeStr.includes('CARD') || typeStr.includes('LOAN') || balanceCol !== -1;

      if (isAccountLabel) {
          entryType = 'Account';
      }

      // Amount Logic
      if (entryType === 'Account' && balanceCol !== -1) {
          amountVal = Math.abs(parseFloat(row[balanceCol]?.replace(/,/g, '') || '0'));
      } else if (debitCol !== -1 && creditCol !== -1) {
        const d = parseFloat(row[debitCol]?.replace(/,/g, '') || '0');
        const c = parseFloat(row[creditCol]?.replace(/,/g, '') || '0');
        if (c > 0) { amountVal = c; if (entryType !== 'Account') entryType = 'Income'; }
        else if (d > 0) { amountVal = d; if (entryType !== 'Account') entryType = 'Expense'; }
      } else {
        const primaryAmt = amountCol !== -1 ? row[amountCol] : (balanceCol !== -1 ? row[balanceCol] : '0');
        amountVal = Math.abs(parseFloat(primaryAmt?.replace(/,/g, '') || '0'));
        if (entryType !== 'Account') {
            if (typeStr.includes('CR') || typeStr.includes('CREDIT') || PATTERNS.received.test(typeStr) || PATTERNS.received.test(desc)) {
                entryType = 'Income';
            } else {
                entryType = 'Expense';
            }
        }
      }

      if (isNaN(amountVal)) continue;

      let dateStr = row[dateCol] || new Date().toISOString().split('T')[0];
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts[0].length === 4) dateStr = parts.join('-');
        else if (parts[2]?.length === 4) dateStr = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
      }

      if (entryType === 'Account') {
          const isLiability = typeStr.includes('LIABILITY') || typeStr.includes('DEBT') || typeStr.includes('LOAN') || typeStr.includes('CARD') || typeStr.includes('CREDIT') || (balanceCol !== -1 && headers[balanceCol].includes('OUTSTANDING'));
          results.push({
              entryType: 'Account',
              value: amountVal,
              name: desc.trim() || accHint.trim() || 'Imported Account',
              wealthType: isLiability ? 'Liability' : 'Investment',
              wealthCategory: isLiability ? 'Card' : 'Savings',
              date: dateStr,
              rawContent: row.join(' | ')
          });
          continue;
      }

      const isCC = PATTERNS.ccPayment.test(desc) || PATTERNS.ccPayment.test(typeStr);
      if (isCC) entryType = 'Transfer';
      else if (PATTERNS.transfer.test(desc) || PATTERNS.transfer.test(typeStr)) entryType = 'Transfer';

      const rawCatText = categoryCol !== -1 ? row[categoryCol] : '';
      const { category, subCategory } = (entryType === 'Transfer' || isCC)
        ? { category: 'Uncategorized' as Category, subCategory: isCC ? 'Bill Payment' : 'Transfer' }
        : resolveCategorySignals(rawCatText + ' ' + desc);

      results.push({
        entryType,
        amount: Math.round(amountVal),
        merchant: desc.trim() || 'General',
        date: dateStr,
        category,
        subCategory,
        accountName: accHint.trim() || undefined,
        rawContent: row.join(' | '),
        incomeType: entryType === 'Income' ? 'Other' : undefined
      });
    } catch (e) {
      console.warn("CSV Row parse failure", e);
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
