import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Expense, UserSettings, Category, WealthItem } from "../types";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Global queue to prevent concurrent requests (reduces RPM spikes)
let isProcessing = false;
const queue: (() => Promise<void>)[] = [];

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;
  const task = queue.shift();
  if (task) await task();
  isProcessing = false;
  processQueue();
}

const INSIGHT_CACHE_KEY = 'jk_ai_insights_cache';

function getPersistentCache(): Record<string, any> {
  try {
    const cached = localStorage.getItem(INSIGHT_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setPersistentCache(hash: string, data: any) {
  try {
    const cache = getPersistentCache();
    cache[hash] = { data, timestamp: Date.now() };
    localStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Cache write failed", e);
  }
}

/**
 * Generates a stable hash for the current financial state.
 */
export function getExpensesHash(expenses: Expense[], settings: UserSettings): string {
  const confirmed = expenses
    .filter(e => e.isConfirmed)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(e => `${e.id}-${Math.round(e.amount)}`);
  return `v4-rounded-${settings.currency}-${Math.round(settings.monthlyIncome)}-${confirmed.length}-${confirmed.slice(-5).join('|')}`;
}

/**
 * Robust retry logic with exponential backoff and jitter for rate limits.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error: any) {
        const errorStr = (error?.message || "").toUpperCase();
        const isRateLimit = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('QUOTA');
        
        if (isRateLimit && retries > 0) {
          const jitter = Math.random() * 3000;
          const waitTime = delay + jitter;
          console.warn(`Gemini Quota Reached. Retrying task in ${Math.round(waitTime/1000)}s...`);
          await new Promise(r => setTimeout(r, waitTime));
          queue.push(() => withRetry(fn, retries - 1, delay * 2).then(resolve).catch(reject));
          processQueue();
        } else {
          reject(error);
        }
      }
    };

    queue.push(execute);
    processQueue();
  });
}

export async function getBudgetInsights(expenses: Expense[], settings: UserSettings) {
  const hash = getExpensesHash(expenses, settings);
  const cache = getPersistentCache();
  
  if (cache[hash] && (Date.now() - cache[hash].timestamp < 86400000)) {
    return cache[hash].data;
  }

  const summary = expenses.reduce((acc, exp) => {
    if (exp.isConfirmed) {
      acc[exp.category] = (acc[exp.category] || 0) + Math.round(exp.amount);
    }
    return acc;
  }, {} as Record<string, number>);

  const prompt = `
    Context: Monthly Income ${Math.round(settings.monthlyIncome)} ${settings.currency}.
    Current spend: Needs ${summary.Needs || 0}, Wants ${summary.Wants || 0}, Savings ${summary.Savings || 0}.
    Targets: ${settings.split.Needs}% Needs, ${settings.split.Wants}% Wants, ${settings.split.Savings}% Savings.
    Output 3 actionable tips for wealth building in JSON array of {tip, impact}.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              tip: { type: Type.STRING },
              impact: { type: Type.STRING }
            },
            required: ["tip", "impact"]
          }
        }
      }
    }));
    
    const results = JSON.parse(response.text || '[]');
    if (results.length > 0) {
      setPersistentCache(hash, results);
    }
    return results;
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return null;
  }
}

export async function auditTransaction(expense: Expense, currency: string) {
  const prompt = `
    Audit this transaction:
    Merchant: ${expense.merchant || 'Unknown'}
    Note: ${expense.note || 'None'}
    Amount: ${Math.round(expense.amount)} ${currency}
    Current Category: ${expense.category}
    
    Identify if the category is correct or if this looks like an anomaly.
    Return JSON: {
      isCorrect: boolean,
      suggestedCategory: string (Needs/Wants/Savings),
      insight: string (max 15 words),
      isAnomaly: boolean
    }
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            suggestedCategory: { type: Type.STRING },
            insight: { type: Type.STRING },
            isAnomaly: { type: Type.BOOLEAN }
          },
          required: ["isCorrect", "suggestedCategory", "insight", "isAnomaly"]
        }
      }
    }));
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Audit Error:", error);
    return null;
  }
}

export async function getDecisionAdvice(
  expenses: Expense[], 
  wealthItems: WealthItem[], 
  settings: UserSettings, 
  queryType: string, 
  itemName: string, 
  estimatedCost: number
) {
  const summary = expenses.reduce((acc, exp) => {
    if (exp.isConfirmed) {
      acc[exp.category] = (acc[exp.category] || 0) + Math.round(exp.amount);
    }
    return acc;
  }, {} as Record<Category, number>);

  const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
  const liquid = wealthItems.filter(i => ['Checking Account', 'Savings Account', 'Cash'].includes(i.category)).reduce((sum, i) => sum + i.value, 0);

  const prompt = `
    Affordability check for "${itemName}" costing ${Math.round(estimatedCost)} ${settings.currency}.
    Monthly Income: ${Math.round(settings.monthlyIncome)}. 
    Spend summary: Needs ${summary.Needs || 0}, Wants ${summary.Wants || 0}, Savings ${summary.Savings || 0}.
    Net Portfolio: Assets ${Math.round(assets)}, Liquid Cash ${Math.round(liquid)}.
    
    Return JSON with status, whole number score (0-100), reasoning, actionPlan, waitTime, and whole number impactPercentage.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            score: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            actionPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
            waitTime: { type: Type.STRING },
            impactPercentage: { type: Type.NUMBER }
          },
          required: ["status", "score", "reasoning", "actionPlan", "waitTime", "impactPercentage"]
        }
      }
    }));
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Decision Error:", error);
    return { 
      status: 'Yellow', 
      score: 50, 
      reasoning: 'AI assessment interrupted. Manual review of your savings buffer is recommended.', 
      actionPlan: ["Review cash on hand", "Check upcoming bills"], 
      waitTime: "Manual Audit",
      impactPercentage: 0
    };
  }
}

export async function parseTransactionText(text: string, currency: string): Promise<{ amount: number, merchant: string, category: Category, subCategory: string, date: string } | null> {
  const prompt = `
    Extract {amount (integer), merchant, category(Needs/Wants/Savings), subCategory, date(YYYY-MM-DD)} from: "${text}".
    Currency: ${currency}.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            merchant: { type: Type.STRING },
            category: { type: Type.STRING },
            subCategory: { type: Type.STRING },
            date: { type: Type.STRING }
          }
        }
      }
    }));
    
    const result = JSON.parse(response.text || '{}');
    const validCategories: Category[] = ['Needs', 'Wants', 'Savings', 'Uncategorized'];
    return {
      amount: Math.round(Math.abs(result.amount || 0)),
      merchant: result.merchant || 'Merchant',
      category: validCategories.includes(result.category) ? result.category : 'Uncategorized',
      subCategory: result.subCategory || 'General',
      date: result.date || new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return null;
  }
}

export async function parseBulkTransactions(text: string, currency: string): Promise<Array<{ amount: number, merchant: string, category: Category, subCategory: string, date: string }>> {
  const prompt = `
    Parse text into integer amounts, merchants, dates, and categories (Needs/Wants/Savings).
    Return JSON array. Text: "${text}"
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              merchant: { type: Type.STRING },
              category: { type: Type.STRING },
              subCategory: { type: Type.STRING },
              date: { type: Type.STRING }
            }
          }
        }
      }
    }));
    
    const results = JSON.parse(response.text || '[]');
    const validCategories: Category[] = ['Needs', 'Wants', 'Savings', 'Uncategorized'];

    return results.map((r: any) => ({
      amount: Math.round(Math.abs(r.amount || 0)),
      merchant: r.merchant || 'Merchant',
      category: validCategories.includes(r.category) ? r.category : 'Uncategorized',
      subCategory: r.subCategory || 'General',
      date: r.date || new Date().toISOString().split('T')[0]
    }));
  } catch (error) {
    console.error("Gemini Bulk Parse Error:", error);
    return [];
  }
}

export async function predictBudgetCategory(name: string): Promise<{ category: Category, subCategory: string } | null> {
  const prompt = `
    Based on the budget item name "${name}", predict the most appropriate finance category (Needs/Wants/Savings) and a specific sub-category name.
    Examples:
    - "School fees" -> {category: "Needs", subCategory: "Education"}
    - "Mobile bill" -> {category: "Needs", subCategory: "Utilities"}
    - "Netflix" -> {category: "Wants", subCategory: "Subscriptions"}
    - "SIP" -> {category: "Savings", subCategory: "Investment"}
    
    Return JSON with fields: category, subCategory.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            subCategory: { type: Type.STRING }
          },
          required: ["category", "subCategory"]
        }
      }
    }));
    
    const result = JSON.parse(response.text || '{}');
    const validCategories: Category[] = ['Needs', 'Wants', 'Savings', 'Uncategorized'];
    return {
      category: validCategories.includes(result.category) ? result.category : 'Needs',
      subCategory: result.subCategory || 'General'
    };
  } catch (error) {
    console.error("Gemini Budget Prediction Error:", error);
    return null;
  }
}