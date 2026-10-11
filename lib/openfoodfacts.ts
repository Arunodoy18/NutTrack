/** Turns an OpenFoodFacts product into a loggable meal — per SERVING when the pack says so, otherwise per 100 g. */
export interface OffProduct {
  product_name?: string;
  generic_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
}

export interface BarcodeAnalysis {
  name: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalFiber: number;
  items: { name: string; calories: number; protein: number; fat: number; carbs: number; fiber: number; estimatedQuantity: string }[];
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export function mapOffProduct(p: OffProduct): BarcodeAnalysis | null {
  const baseName = (p.product_name || p.generic_name || "").trim();
  if (!baseName) return null; // no usable name → treat as "not found" instead of logging "Unknown Product"
  const brand = (p.brands || "").split(",")[0].trim();
  const name = (brand && !baseName.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${baseName}` : baseName).slice(0, 100);

  const n = p.nutriments || {};
  const servingG = num(p.serving_quantity);
  const useServing = servingG > 0 && servingG <= 600;

  const pick = (key: string) => {
    // Prefer the pack's own per-serving figure; else scale per-100 g by the serving size; else per 100 g.
    const perServing = n[`${key}_serving`];
    if (useServing && perServing !== undefined && perServing !== "") return num(perServing);
    const per100 = num(n[`${key}_100g`] ?? n[key]);
    return useServing ? (per100 * servingG) / 100 : per100;
  };

  const calories = Math.round(pick("energy-kcal"));
  const protein = Math.round(pick("proteins"));
  const fat = Math.round(pick("fat"));
  const carbs = Math.round(pick("carbohydrates"));
  const fiber = Math.round(pick("fiber"));
  const estimatedQuantity = useServing ? (p.serving_size?.trim() || `${servingG} g`) : "100 g";

  return {
    name,
    totalCalories: calories, totalProtein: protein, totalFat: fat, totalCarbs: carbs, totalFiber: fiber,
    items: [{ name, calories, protein, fat, carbs, fiber, estimatedQuantity }],
  };
}

/** Scale a scanned product by a portion multiplier (e.g. 0.5 = half a serving). Quantities are scaled too. */
export function scaleAnalysis(a: BarcodeAnalysis, f: number): BarcodeAnalysis {
  const k = Math.min(10, Math.max(0.1, f));
  const r = (x: number) => Math.round(x * k);
  const qty = (q: string) => {
    const m = /^\s*(\d+(?:\.\d+)?)\s*(g|ml|gm|grams?)\b(.*)$/i.exec(q || "");
    if (m) return `${Math.round(Number(m[1]) * k * 10) / 10} ${m[2].toLowerCase().startsWith("g") ? "g" : "ml"}${m[3]}`.trim();
    return k === 1 ? q : `${k}× ${q || "serving"}`;
  };
  return {
    ...a,
    totalCalories: r(a.totalCalories), totalProtein: r(a.totalProtein), totalFat: r(a.totalFat), totalCarbs: r(a.totalCarbs), totalFiber: r(a.totalFiber),
    items: a.items.map((i) => ({ ...i, calories: r(i.calories), protein: r(i.protein), fat: r(i.fat), carbs: r(i.carbs), fiber: r(i.fiber), estimatedQuantity: qty(i.estimatedQuantity) })),
  };
}
