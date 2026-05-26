'use client';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const IngredientSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  cost: z.number(),
});

const GenerateRecipeInputSchema = z.object({
  dishName: z.string(),
  ingredients: z.array(IngredientSchema),
});

export type GenerateRecipeInput = z.infer<typeof GenerateRecipeInputSchema>;

const GenerateRecipeOutputSchema = z.object({
  totalCmv: z.number(),
  suggestedPrice: z.number(),
  technicalSheet: z.string(),
});

export type GenerateRecipeOutput = z.infer<typeof GenerateRecipeOutputSchema>;

export async function generateRecipeFlow(input: GenerateRecipeInput, apiKey?: string): Promise<GenerateRecipeOutput> {
  try {
    const finalApiKey = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!finalApiKey) {
      throw new Error("Chave de API do Gemini não configurada. Vá em Configurações.");
    }

    const genAI = new GoogleGenerativeAI(finalApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const ingredientsList = input.ingredients.map(ing => `- ${ing.name}: ${ing.quantity} ${ing.unit} | Custo: R$ ${ing.cost}`).join('\n');

    const prompt = `
    Você é um especialista em engenharia de cardápio e gestão financeira de restaurantes.
    Sua tarefa é gerar uma ficha técnica (Ficha Técnica) profissional para o prato: "${input.dishName}".

    Ingredientes fornecidos:
    ${ingredientsList}

    Instruções:
    1. Calcule o CMV total somando o custo de todos os ingredientes.
    2. Calcule o preço de venda sugerido para obter uma margem de lucro de 30%. 
       Use a fórmula: Preço de Venda = CMV / (1 - 0.30)
    3. Formate a ficha técnica em Markdown de forma elegante, incluindo:
       - Título do Prato
       - Tabela de Ingredientes (Nome, Quantidade, Unidade, Custo)
       - Resumo Financeiro (CMV Total, Preço Sugerido, Margem Esperada)
       - Uma breve descrição ou sugestão de apresentação do prato para valorizar o produto.

    Sua resposta deve ser estritamente no formato JSON definido:
    { "totalCmv": 0.0, "suggestedPrice": 0.0, "technicalSheet": "markdown content" }
  `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    const parsedData = JSON.parse(jsonStr);
    
    return GenerateRecipeOutputSchema.parse(parsedData);
  } catch (error) {
    console.error("Erro ao gerar receita (Client Side):", error);
    throw error;
  }
}
