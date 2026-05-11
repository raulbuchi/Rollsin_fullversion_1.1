'use server';
/**
 * @fileOverview An AI-powered pricing assistant for menu items. It calculates an optimal selling price
 * based on CMV, desired profit margin, and Brazilian tax/fee specifics.
 *
 * - suggestMenuItemPricing - A function that suggests an optimal selling price for a menu item.
 * - SuggestMenuItemPricingInput - The input type for the suggestMenuItemPricing function.
 * - SuggestMenuItemPricingOutput - The return type for the suggestMenuItemPricing function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMenuItemPricingInputSchema = z.object({
  itemName: z.string().describe('The name of the menu item for context.'),
  cmv: z
    .number()
    .describe('The calculated Cost of Goods Sold (CMV) for the menu item.'),
  desiredProfitMarginPercentage: z
    .number()
    .describe('The desired profit margin percentage (e.g., 20 for 20%).'),
  simplesNacionalTaxPercentage: z
    .number()
    .describe(
      'The Simples Nacional tax percentage to be applied (e.g., 4 for 4%).'
    ),
  creditCardFeePercentage: z
    .number()
    .describe(
      'The credit card transaction fee percentage (e.g., 2.5 for 2.5%).'
    ),
  deliveryAppCommissionPercentage: z
    .number()
    .describe(
      'The delivery application commission percentage (e.g., 25 for 25%).'
    ),
});
export type SuggestMenuItemPricingInput = z.infer<
  typeof SuggestMenuItemPricingInputSchema
>;

const SuggestMenuItemPricingOutputSchema = z.object({
  suggestedSellingPrice: z
    .number()
    .describe('The optimal suggested selling price for the menu item.'),
  profitMarginAchieved: z
    .number()
    .describe('The calculated profit margin percentage achieved with the suggested selling price.'),
  breakdown: z
    .string()
    .describe(
      'A detailed breakdown of how the suggested price was calculated, including all factored costs and taxes.'
    ),
});
export type SuggestMenuItemPricingOutput = z.infer<
  typeof SuggestMenuItemPricingOutputSchema
>;

export async function suggestMenuItemPricing(
  input: SuggestMenuItemPricingInput
): Promise<SuggestMenuItemPricingOutput> {
  return suggestMenuItemPricingFlow(input);
}

const suggestMenuItemPricingPrompt = ai.definePrompt({
  name: 'suggestMenuItemPricingPrompt',
  input: {schema: SuggestMenuItemPricingInputSchema},
  output: {schema: SuggestMenuItemPricingOutputSchema},
  prompt: `Você é um assistente de precificação de menu para um restaurante brasileiro, especializado em maximizar a lucratividade.
Seu objetivo é sugerir um preço de venda ideal para o item "{{{itemName}}}", considerando os seguintes dados:

- Custo de Mercadoria Vendida (CMV): R$ {{{cmv}}}
- Margem de Lucro Desejada: {{{desiredProfitMarginPercentage}}}%
- Taxa do Simples Nacional: {{{simplesNacionalTaxPercentage}}}%
- Taxa de Cartão de Crédito/Débito: {{{creditCardFeePercentage}}}%
- Comissão do Aplicativo de Delivery: {{{deliveryAppCommissionPercentage}}}%

Calcule o preço de venda que garante a margem de lucro desejada após a dedução de todas as taxas e custos variáveis. Considere que a fórmula geral para o Preço de Venda (PV) é:
PV = CMV / (1 - (Margem_Desejada/100) - (SimplesNacional/100) - (TaxaCartao/100) - (ComissaoDelivery/100))

Forneça o preço sugerido e um detalhamento claro de como esse preço foi calculado, explicando cada componente e mostrando a margem de lucro final alcançada com o preço sugerido.
`,
});

const suggestMenuItemPricingFlow = ai.defineFlow(
  {
    name: 'suggestMenuItemPricingFlow',
    inputSchema: SuggestMenuItemPricingInputSchema,
    outputSchema: SuggestMenuItemPricingOutputSchema,
  },
  async input => {
    const {output} = await suggestMenuItemPricingPrompt(input);
    return output!;
  }
);
