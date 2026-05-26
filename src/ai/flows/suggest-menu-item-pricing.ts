'use client';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const SuggestMenuItemPricingInputSchema = z.object({
  itemName: z.string(),
  cmv: z.number(),
  desiredProfitMarginPercentage: z.number(),
  simplesNacionalTaxPercentage: z.number(),
  creditCardFeePercentage: z.number(),
  deliveryAppCommissionPercentage: z.number(),
});
export type SuggestMenuItemPricingInput = z.infer<
  typeof SuggestMenuItemPricingInputSchema
>;

const SuggestMenuItemPricingOutputSchema = z.object({
  suggestedSellingPrice: z.number(),
  profitMarginAchieved: z.number(),
  breakdown: z.string(),
});
export type SuggestMenuItemPricingOutput = z.infer<
  typeof SuggestMenuItemPricingOutputSchema
>;

export async function suggestMenuItemPricing(
  input: SuggestMenuItemPricingInput,
  apiKey?: string
): Promise<SuggestMenuItemPricingOutput> {
  try {
    const finalApiKey = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!finalApiKey) {
      throw new Error("Chave de API do Gemini não configurada. Vá em Configurações.");
    }

    const genAI = new GoogleGenerativeAI(finalApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Você é um assistente de precificação de menu para um restaurante brasileiro, especializado em maximizar a lucratividade.
Seu objetivo é sugerir um preço de venda ideal para o item "${input.itemName}", considerando os seguintes dados:

- Custo de Mercadoria Vendida (CMV): R$ ${input.cmv}
- Margem de Lucro Desejada: ${input.desiredProfitMarginPercentage}%
- Taxa do Simples Nacional: ${input.simplesNacionalTaxPercentage}%
- Taxa de Cartão de Crédito/Débito: ${input.creditCardFeePercentage}%
- Comissão do Aplicativo de Delivery: ${input.deliveryAppCommissionPercentage}%

Calcule o preço de venda que garante a margem de lucro desejada após a dedução de todas as taxas e custos variáveis. Considere que a fórmula geral para o Preço de Venda (PV) é:
PV = CMV / (1 - (Margem_Desejada/100) - (SimplesNacional/100) - (TaxaCartao/100) - (ComissaoDelivery/100))

Forneça o preço sugerido, a margem alcançada e um detalhamento claro em JSON estritamente no seguinte formato:
{ "suggestedSellingPrice": 0.0, "profitMarginAchieved": 0.0, "breakdown": "..." }
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    const parsedData = JSON.parse(jsonStr);
    
    return SuggestMenuItemPricingOutputSchema.parse(parsedData);
  } catch (error) {
    console.error("Erro ao sugerir preço (Client Side):", error);
    throw error;
  }
}
