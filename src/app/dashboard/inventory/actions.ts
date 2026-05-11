"use server";

import { ai } from "@/ai/genkit";
import { z } from "zod";

const ReceiptSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe("Nome do insumo. Deve ser claro e genérico quando possível, ex: Arroz Branco."),
      quantity: z.number().describe("Quantidade comprada."),
      unit: z.enum(["kg", "un", "L", "g", "ml"]).describe("Unidade de medida. Tente converter ou mapear para essas opções."),
      cost: z.number().describe("Custo unitário do item em formato decimal (fração do real). Se a nota tiver o valor total, faça a divisão pela quantidade."),
    })
  )
});

export async function extractReceiptItems(imageBase64: string) {
  try {
    const dataUrl = imageBase64;
    
    // We expect the image to be a data URL like "data:image/jpeg;base64,..."
    // Genkit media parts can take a data URL.
    const result = await ai.generate({
      prompt: [
        { media: { url: imageBase64 } },
        { text: "Analise a imagem deste cupom fiscal ou nota fiscal. Extraia todos os itens comprados (insumos). Retorne um array estruturado conforme o schema. Calcule adequadamente o custo *unitário* de cada item. Tente deduzir a unidade (kg, un, L, g, ml) baseando-se na descrição ou quantidade." }
      ],
      output: {
        schema: ReceiptSchema,
      }
    });

    return { 
      success: true, 
      data: result.output 
    };
  } catch (error) {
    console.error("Erro ao extrair nota fiscal:", error);
    return { success: false, error: 'Falha ao analisar a imagem' };
  }
}
