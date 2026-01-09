
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Expense, UserSettings, Category } from "../types";

// Initialize Gemini API with the required named parameter
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Simple cache to prevent redundant calls
const insightCache: Record<string, any> = {};

/**
 * Generates a simple hash for the expense data to check for changes
 */
function getExpensesHash(expenses: Expense[], settings: UserSettings): string {
  const confirmed = expenses.filter(e => e.isConfirmed).map(e => `${e.id}-${e.amount}-${e.category}`);
  return `${settings.currency}-${settings.monthlyIncome}-${confirmed.join('|')}`;
}

/**
 * Wrapper for API calls with exponential backoff to handle quota limits gracefully
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = error?.message?.includes('429') || error?.message?.includes('500') || error?.message?.includes('RESOURCE_EXHAUSTED');
    if (isRetryable && retries > 0) {
      console.warn(`Gemini Quota/Error hit. Retrying in ${delay}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function getBudgetInsights(expenses: Expense[], settings: UserSettings) {
  const hash = getExpensesHash(expenses, settings);
  if (insightCache[hash]) return insightCache[hash];

  const summary = expenses.reduce((acc, exp) => {
    if (exp.isConfirmed) {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const prompt = `
    Context: Monthly Income ${settings.monthlyIncome} ${settings.currency}.
    Budget Targets: Needs ${settings.split.Needs}%, Wants ${settings.split.Wants}%, Savings ${settings.split.Savings}%.
    Current Spending: Needs ${summary.Needs || 0}, Wants ${summary.Wants || 0}, Savings ${summary.Savings || 0}.
    Currency is ${settings.currency}.
    Provide 3 short, actionable financial tips based on this data. Keep it concise.
  `;

  try {
    // Basic text tasks like tips use gemini-3-flash-preview
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
            }
          }
        }
      }
    }));
    
    // Use .text property directly as per latest SDK guidelines
    const results = JSON.parse(response.text || '[]');
    insightCache[hash] = results; 
    return results;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error?.message?.includes('429')) {
      return [{
        tip: "AI Insights are currently on a break due to high demand. Please try again in a few minutes.",
        impact: "System Maintenance"
      }];
    }
    return null;
  }
}

export async function getDecisionAdvice(expenses: Expense[], settings: UserSettings, queryType: 'Vacation' | 'BigPurchase', estimatedCost: number) {
  const summary = expenses.reduce((acc, exp) => {
    if (exp.isConfirmed) {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    }
    return acc;
  }, {} as Record<Category, number>);

  const prompt = `
    Decision Analysis Request:
    User wants to plan a ${queryType} costing ${estimatedCost} ${settings.currency}.
    Monthly Income: ${settings.monthlyIncome} ${settings.currency}.
    Current Spending (Needs/Wants/Savings): ${summary.Needs || 0}/${summary.Wants || 0}/${summary.Savings || 0}.
    Budget Rule: 50/30/20 (${settings.split.Needs}/${settings.split.Wants}/${settings.split.Savings}).
    
    Task: Evaluate if they can afford it. 
    Return: 
    1. A status (Green: Safe, Yellow: Caution, Red: High Risk)
    2. Affordability Score (0-100)
    3. Action Plan (e.g., "Cut Wants spending by 10% for 3 months")
    4. Estimated wait time to save comfortably.
  `;

  try {
    // Complex reasoning tasks use gemini-3-pro-preview for higher accuracy
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, description: "Green, Yellow, or Red" },
            score: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            actionPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
            waitTime: { type: Type.STRING }
          }
        }
      }
    }));
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Decision Error:", error);
    return null;
  }
}

export async function parseTransactionText(text: string, currency: string): Promise<{ amount: number, merchant: string, category: Category, subCategory: string, date: string } | null> {
  const prompt = `
    Analyze this transaction SMS/text: "${text}".
    Currency context: ${currency}.
    Extract amount, merchant, date (YYYY-MM-DD), high-level category ('Needs', 'Wants', 'Savings'), and subCategory.
  `;

  try {
    // Text extraction tasks use gemini-3-flash-preview
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
      amount: result.amount || 0,
      merchant: result.merchant || 'Unknown Merchant',
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
  const prompt = `Identify all financial expense transactions in: ${text}. Return JSON array of objects with amount, merchant, date, category, subCategory.`;

  try {
    // Bulk extraction tasks use gemini-3-flash-preview
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
      amount: r.amount || 0,
      merchant: r.merchant || 'Unknown',
      category: validCategories.includes(r.category) ? r.category : 'Uncategorized',
      subCategory: r.subCategory || 'General',
      date: r.date || new Date().toISOString().split('T')[0]
    }));
  } catch (error) {
    console.error("Gemini Bulk Parse Error:", error);
    return [];
  }
}
