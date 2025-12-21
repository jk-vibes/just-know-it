
import { GoogleGenAI, Type } from "@google/genai";
import { Expense, UserSettings } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getBudgetInsights(expenses: Expense[], settings: UserSettings) {
  const summary = expenses.reduce((acc, exp) => {
    if (exp.isConfirmed) {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const prompt = `
    Context: Monthly Income ${settings.monthlyIncome}.
    Budget Targets: Needs ${settings.split.Needs}%, Wants ${settings.split.Wants}%, Savings ${settings.split.Savings}%.
    Current Spending: Needs ${summary.Needs || 0}, Wants ${summary.Wants || 0}, Savings ${summary.Savings || 0}.
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
