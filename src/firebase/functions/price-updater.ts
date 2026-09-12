import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inicializa o admin se não estiver inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const MARGIN_THRESHOLD = 0.30; // 30% margem mínima

export const updateRecipeCost = functions.firestore
  .document('materials/{materialId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    // Só processa se o preço mudou
    if (newData.lastPrice === oldData.lastPrice) return null;

    const materialId = context.params.materialId;

    // Busca todas as receitas que contêm este material
    const recipesSnapshot = await db.collection('recipes')
      .where('ingredients', 'array-contains', { materialId: materialId })
      .get();

    const batch = db.batch();

    recipesSnapshot.forEach((doc) => {
      const recipe = doc.data();
      let totalCost = 0;

      // Recalcula o custo da receita baseada nos novos preços
      const updatedIngredients = recipe.ingredients.map((ing: any) => {
        if (ing.materialId === materialId) {
          ing.cost = (ing.quantity * newData.lastPrice);
        }
        totalCost += ing.cost;
        return ing;
      });

      const margin = (recipe.sellingPrice - totalCost) / recipe.sellingPrice;
      const isAnomaly = margin < MARGIN_THRESHOLD;

      batch.update(doc.ref, {
        ingredients: updatedIngredients,
        totalCost: totalCost,
        isAnomaly: isAnomaly,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return batch.commit();
  });
