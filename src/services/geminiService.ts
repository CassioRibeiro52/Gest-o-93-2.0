
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getFinancialInsights(sales: any, customers: any) {
  try {
    const data = { sales, customers };
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise os seguintes dados financeiros de uma loja de roupas e forneça insights estratégicos em português (máximo 3 parágrafos): ${JSON.stringify(data)}`,
      config: {
        systemInstruction: "Você é um consultor financeiro especializado em varejo de moda. Forneça conselhos práticos e diretos.",
      },
    });

    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Error generating insights:", error);
    return "Erro ao conectar com o serviço de inteligência artificial.";
  }
}
