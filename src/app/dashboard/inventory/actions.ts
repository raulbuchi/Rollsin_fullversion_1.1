"use client";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const ReceiptSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unit: z.enum(["kg", "un", "L", "g", "ml"]),
      cost: z.number(),
      expirationDate: z.string().optional().nullable(),
    })
  )
});

export async function extractReceiptItems(imageBase64: string) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_GEMINI_API_KEY missing");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Clean base64 if needed
    const base64Data = imageBase64.includes(",") 
      ? imageBase64.split(",")[1] 
      : imageBase64;
    
    const mimeType = imageBase64.includes(",") 
      ? imageBase64.split(",")[0].split(":")[1].split(";")[0] 
      : "image/jpeg";

    const prompt = "Analise a imagem deste cupom fiscal ou nota fiscal. Extraia todos os itens comprados (insumos). Retorne um JSON estritamente no seguinte formato: { \"items\": [ { \"name\": \"Nome do Item\", \"quantity\": 1.0, \"unit\": \"un|kg|L|g|ml\", \"cost\": 10.0, \"expirationDate\": \"YYYY-MM-DD\" } ] }. Calcule adequadamente o custo *unitário* de cada item. Tente deduzir a unidade (kg, un, L, g, ml) baseando-se na descrição ou quantidade. Se a data de validade estiver visível ou puder ser inferida, inclua no formato YYYY-MM-DD, caso contrário retorne null.";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from text (sometimes Gemini wraps it in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    const parsedData = JSON.parse(jsonStr);
    
    // Validate with Zod
    const validated = ReceiptSchema.parse(parsedData);

    return { 
      success: true, 
      data: validated 
    };
  } catch (error) {
    console.error("Erro ao extrair nota fiscal (Client Side):", error);
    return { success: false, error: error instanceof Error ? error.message : 'Falha ao analisar a imagem' };
  }
}
