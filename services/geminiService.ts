
import { GoogleGenAI, Type } from "@google/genai";
import { Expense, UserSettings, Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getBudgetInsights(expenses: Expense[], settings: UserSettings) {
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
    const response = await ai.models.generateContent({
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
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}

export async function parseTransactionText(text: string, currency: string): Promise<{ amount: number, merchant: string, category: Category, subCategory: string, date: string } | null> {
  const prompt = `
    Analyze this transaction SMS/text: "${text}".
    Currency context: ${currency}.
    
    Extract the amount (number only).
    Extract the merchant name (short string, e.g., "Uber", "Starbucks").
    Extract the date (YYYY-MM-DD). If no date is found, use today's date.
    
    Categorize into one of these high-level groups: 'Needs', 'Wants', 'Savings'. 
    Logic:
    - Needs: Rent, Utilities, Groceries, Medical, Transport, Fuel.
    - Wants: Dining, Movies, Netflix, Shopping, Entertainment.
    - Savings: Investments, Mutual Funds, Deposits, Transfers to self.
    
    ALSO extract a specific 'subCategory' (one word, e.g., "Fuel", "Groceries", "Dining", "Commute", "Streaming", "Investment").
  `;

  try {
    const response = await ai.models.generateContent({
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
    });
    
    const result = JSON.parse(response.text);
    
    const validCategories: Category[] = ['Needs', 'Wants', 'Savings', 'Uncategorized'];
    const category = validCategories.includes(result.category) ? result.category : 'Uncategorized';

    return {
      amount: result.amount || 0,
      merchant: result.merchant || 'Unknown Merchant',
      category: category as Category,
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
    Analyze the following text which contains multiple SMS messages/logs:
    ---
    ${text}
    ---
    Currency context: ${currency}.
    
    Task:
    1. Identify all financial expense transactions.
    2. For each valid transaction, extract:
       - amount (number)
       - merchant (short name)
       - date (YYYY-MM-DD)
       - category (Strictly: 'Needs', 'Wants', 'Savings', 'Uncategorized')
       - subCategory (e.g., "Coffee", "Taxi", "Rent", "Grocery", "Investment")
    
    Return a JSON array of objects.
  `;

  try {
    const response = await ai.models.generateContent({
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
    });
    
    const results = JSON.parse(response.text);
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
