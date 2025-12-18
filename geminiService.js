
import { GoogleGenAI } from "@google/genai";

export const getFinancialInsight = async (summary) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `
      As a specialized school financial analyst for SRPHS (a Philippine-based institution), review these financials in Philippine Pesos (₱):
      - Total Assets: ₱${summary.totalAssets.toLocaleString()}
      - Total Revenue: ₱${summary.totalRevenue.toLocaleString()}
      - Total Expenses: ₱${summary.totalExpenses.toLocaleString()}
      - Net Income: ₱${summary.netIncome.toLocaleString()}

      Provide a high-level 3-bullet point summary of the school's fiscal health and advice on resource allocation in the Philippine educational context. Use the ₱ symbol.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Insight unavailable.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to connect to AI Analyst.";
  }
};
