
import { GoogleGenAI } from "@google/genai";
import { Sale, Customer } from "../types";

// Função para obter a chave salva pelo usuário no navegador
const getApiKey = () => {
  return localStorage.getItem('gestao93_gemini_api_key') || process.env.API_KEY || "";
};

// Constantes para gerenciamento de cota
const COOLDOWN_TIME = 60000; // 1 minuto
let cooldownUntil = 0;

export const getFinancialInsights = async (
  sales: Sale[],
  customers: Customer[]
) => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return "⚠️ IA desativada. Configure sua chave Gemini nos Ajustes para receber análises.";
  }

  const now = Date.now();
  if (now < cooldownUntil) {
    const secondsLeft = Math.ceil((cooldownUntil - now) / 1000);
    return `⚠️ IA em repouso por limite de cota. Tente novamente em ${secondsLeft}s.`;
  }

  if (sales.length === 0) return "Adicione vendas para análise.";

  // Contexto simplificado para economizar tokens
  const context = {
    s: sales.length,
    v: sales.reduce((acc, s) => acc + s.totalAmount, 0),
    c: customers.length,
    p: sales.flatMap(s => s.installments).filter(i => i.status !== 'PAID').length,
  };
  
  const cacheKey = `gemini_cache_${JSON.stringify(context)}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return cached;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise brevemente (máx 300 caracteres): Loja com ${context.s} vendas (R$ ${context.v}), ${context.c} clientes e ${context.p} parcelas abertas. Foco em saúde do caixa e dicas para a dona da loja.`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 250,
      }
    });

    const text = response.text || "Insights não disponíveis no momento.";
    sessionStorage.setItem(cacheKey, text);
    return text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error?.message?.includes("429")) {
      cooldownUntil = Date.now() + COOLDOWN_TIME;
      return "⚠️ Cota excedida. Aguarde 1 minuto.";
    }
    
    if (error?.message?.includes("API key not valid")) {
      return "⚠️ Chave de API inválida. Verifique nos Ajustes.";
    }
    
    return "Falha ao conectar com a IA. Verifique sua conexão ou a chave API.";
  }
};
