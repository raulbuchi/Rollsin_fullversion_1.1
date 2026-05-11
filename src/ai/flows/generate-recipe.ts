'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const IngredientSchema = z.object({
  name: z.string().describe('Nome do ingrediente'),
  quantity: z.number().describe('Quantidade utilizada'),
  unit: z.string().describe('Unidade de medida (ex: g, kg, ml, un)'),
  cost: z.number().describe('Custo da quantidade utilizada ou custo unitário'),
});

const GenerateRecipeInputSchema = z.object({
  dishName: z.string().describe('Nome do prato ou receita'),
  ingredients: z.array(IngredientSchema).describe('Lista de ingredientes com suas respectivas quantidades e custos'),
});

export type GenerateRecipeInput = z.infer<typeof GenerateRecipeInputSchema>;

const GenerateRecipeOutputSchema = z.object({
  totalCmv: z.number().describe('Custo de Mercadoria Vendida (CMV) total calculado'),
  suggestedPrice: z.number().describe('Preço de venda sugerido para atingir a margem de 30%'),
  technicalSheet: z.string().describe('Ficha técnica formatada em Markdown contendo detalhes da receita, custos e sugestão de preço'),
});

export type GenerateRecipeOutput = z.infer<typeof GenerateRecipeOutputSchema>;

const generateRecipePrompt = ai.definePrompt({
  name: 'generateRecipePrompt',
  input: { schema: GenerateRecipeInputSchema },
  output: { schema: GenerateRecipeOutputSchema },
  prompt: `
    Você é um especialista em engenharia de cardápio e gestão financeira de restaurantes.
    Sua tarefa é gerar uma ficha técnica (Ficha Técnica) profissional para o prato: "{{{dishName}}}".

    Ingredientes fornecidos:
    {{#each ingredients}}
    - {{name}}: {{quantity}} {{unit}} | Custo: R$ {{cost}}
    {{/each}}

    Instruções:
    1. Calcule o CMV total somando o custo de todos os ingredientes.
    2. Calcule o preço de venda sugerido para obter uma margem de lucro de 30%. 
       Use a fórmula: Preço de Venda = CMV / (1 - 0.30)
    3. Formate a ficha técnica em Markdown de forma elegante, incluindo:
       - Título do Prato
       - Tabela de Ingredientes (Nome, Quantidade, Unidade, Custo)
       - Resumo Financeiro (CMV Total, Preço Sugerido, Margem Esperada)
       - Uma breve descrição ou sugestão de apresentação do prato para valorizar o produto.

    Sua resposta deve ser estritamente no formato JSON definido no schema de saída.
  `,
});

export const generateRecipeFlow = ai.defineFlow(
  {
    name: 'generateRecipe',
    inputSchema: GenerateRecipeInputSchema,
    outputSchema: GenerateRecipeOutputSchema,
  },
  async (input) => {
    const { output } = await generateRecipePrompt(input);
    if (!output) {
      throw new Error('Falha ao gerar a ficha técnica via IA.');
    }
    return output;
  }
);
