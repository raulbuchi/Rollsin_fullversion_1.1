export interface Material {
  id: string;
  name: string;
  lastPrice: number;
  unit: "g" | "ml" | "un" | "kg" | "cx";
  priceHistory: { price: number; date: string }[];
}

export type ComponentType = 'material' | 'sub_recipe';

export interface Component {
  type: ComponentType;
  id: string;
  name: string; // Denormalized for display
  quantity: number;
  unit: string;
  cost: number; // Resolved cost
}

export interface Recipe {
  id: string;
  name: string;
  components: Component[];
  totalCost: number;
  yieldFactor: number;
  lastUpdated: string; // ISO format or timestamp
  isAnomaly?: boolean; // For margin alerts
}
