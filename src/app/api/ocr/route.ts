import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    const schema = {
      type: Type.OBJECT,
      properties: {
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING, enum: ["g", "ml", "un", "kg", "cx"] },
              price: { type: Type.NUMBER }
            },
            required: ["description", "quantity", "unit", "price"]
          }
        }
      }
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [{ 
        parts: [
          { text: "Extraia itens de nota fiscal gastronômica. Normalize unidades para: g, ml, un, kg, cx. Ignore abreviações irrelevantes." },
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
        ]
      }],
      config: { 
        responseMimeType: "application/json", 
        responseSchema: schema 
      }
    });

    return NextResponse.json(JSON.parse(response.text!));
  } catch (error) {
    console.error("OCR Error:", error);
    return NextResponse.json({ error: "Failed to process receipt" }, { status: 500 });
  }
}
