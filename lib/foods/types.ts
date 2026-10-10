export type Diet = "vegan" | "vegetarian" | "egg" | "nonveg";
export type Allergen = "milk" | "egg" | "gluten" | "peanut" | "nuts" | "soy" | "fish" | "shellfish" | "sesame";

/** Nutrition per 100 g (edible portion, in the state described by the name, e.g. "cooked"). */
export interface Per100 {
  kcal: number;
  protein: number; // g
  fat: number; // g
  carbs: number; // g
  fiber: number; // g
  sodium: number; // mg
  iron: number; // mg
  calcium: number; // mg
  vitaminC: number; // mg
  potassium: number; // mg
}

export interface Serving {
  label: string;
  grams: number;
}

export interface Food {
  id: string;
  name: string;
  /** Other names people type: Hindi/regional names, spellings. */
  aliases: string[];
  category: string;
  diet: Diet;
  allergens: Allergen[];
  per100: Per100;
  servings: Serving[];
  /** "reference" = standard composition-table values; "dish" = typical home-style recipe, varies by cook. */
  source: "reference" | "dish";
}

export interface Portion {
  grams: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sodium: number;
  iron: number;
  calcium: number;
  vitaminC: number;
  potassium: number;
}
