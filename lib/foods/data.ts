// Reference food data (per 100 g). Numbers are checked by tests/foods.test.ts (energy balance, diet/allergen rules) and spot-checked against USDA FoodData Central by scripts/verify-foods.mjs.
import type { Food } from "./types";

export const FOODS: Food[] = [
 {
  "id": "rice_white_cooked",
  "name": "Rice, white, cooked",
  "aliases": [
   "rice",
   "chawal",
   "steamed rice",
   "plain rice"
  ],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 130.0,
   "protein": 2.7,
   "fat": 0.3,
   "carbs": 28.2,
   "fiber": 0.4,
   "sodium": 1.0,
   "iron": 0.2,
   "calcium": 10.0,
   "vitaminC": 0.0,
   "potassium": 35.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   },
   {
    "label": "1 cup",
    "grams": 158.0
   },
   {
    "label": "1 plate (250 g)",
    "grams": 250.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "rice_brown_cooked",
  "name": "Rice, brown, cooked",
  "aliases": [
   "brown rice"
  ],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 112.0,
   "protein": 2.3,
   "fat": 0.8,
   "carbs": 23.5,
   "fiber": 1.8,
   "sodium": 5.0,
   "iron": 0.5,
   "calcium": 10.0,
   "vitaminC": 0.0,
   "potassium": 79.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   },
   {
    "label": "1 cup",
    "grams": 195.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "rice_basmati_cooked",
  "name": "Rice, basmati, cooked",
  "aliases": [
   "basmati"
  ],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 121.0,
   "protein": 3.5,
   "fat": 0.4,
   "carbs": 25.0,
   "fiber": 0.7,
   "sodium": 2.0,
   "iron": 0.4,
   "calcium": 9.0,
   "vitaminC": 0.0,
   "potassium": 40.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   },
   {
    "label": "1 plate (250 g)",
    "grams": 250.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "roti",
  "name": "Roti / chapati, whole wheat",
  "aliases": [
   "chapati",
   "phulka",
   "fulka",
   "indian bread",
   "rotli"
  ],
  "category": "Breads",
  "diet": "vegan",
  "allergens": [
   "gluten"
  ],
  "per100": {
   "kcal": 297.0,
   "protein": 9.8,
   "fat": 7.5,
   "carbs": 46.0,
   "fiber": 4.9,
   "sodium": 250.0,
   "iron": 3.5,
   "calcium": 25.0,
   "vitaminC": 0.0,
   "potassium": 220.0
  },
  "servings": [
   {
    "label": "1 roti (40 g)",
    "grams": 40.0
   },
   {
    "label": "1 phulka (30 g)",
    "grams": 30.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "paratha_plain",
  "name": "Paratha, plain",
  "aliases": [
   "parantha"
  ],
  "category": "Breads",
  "diet": "vegetarian",
  "allergens": [
   "gluten",
   "milk"
  ],
  "per100": {
   "kcal": 326.0,
   "protein": 7.5,
   "fat": 13.0,
   "carbs": 44.0,
   "fiber": 3.5,
   "sodium": 350.0,
   "iron": 2.6,
   "calcium": 25.0,
   "vitaminC": 0.0,
   "potassium": 170.0
  },
  "servings": [
   {
    "label": "1 paratha (80 g)",
    "grams": 80.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "paratha_aloo",
  "name": "Aloo paratha",
  "aliases": [
   "potato paratha"
  ],
  "category": "Breads",
  "diet": "vegetarian",
  "allergens": [
   "gluten",
   "milk"
  ],
  "per100": {
   "kcal": 230.0,
   "protein": 5.0,
   "fat": 8.0,
   "carbs": 35.0,
   "fiber": 3.0,
   "sodium": 350.0,
   "iron": 2.0,
   "calcium": 25.0,
   "vitaminC": 3.0,
   "potassium": 280.0
  },
  "servings": [
   {
    "label": "1 paratha (100 g)",
    "grams": 100.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "naan",
  "name": "Naan",
  "aliases": [
   "butter naan"
  ],
  "category": "Breads",
  "diet": "vegetarian",
  "allergens": [
   "gluten",
   "milk"
  ],
  "per100": {
   "kcal": 310.0,
   "protein": 9.0,
   "fat": 5.1,
   "carbs": 55.0,
   "fiber": 2.2,
   "sodium": 420.0,
   "iron": 2.4,
   "calcium": 50.0,
   "vitaminC": 0.0,
   "potassium": 130.0
  },
  "servings": [
   {
    "label": "1 naan (90 g)",
    "grams": 90.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "puri",
  "name": "Puri (fried)",
  "aliases": [
   "poori"
  ],
  "category": "Breads",
  "diet": "vegan",
  "allergens": [
   "gluten"
  ],
  "per100": {
   "kcal": 350.0,
   "protein": 7.0,
   "fat": 17.0,
   "carbs": 44.0,
   "fiber": 2.0,
   "sodium": 270.0,
   "iron": 2.0,
   "calcium": 30.0,
   "vitaminC": 0.0,
   "potassium": 160.0
  },
  "servings": [
   {
    "label": "1 puri (30 g)",
    "grams": 30.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "bread_white",
  "name": "Bread, white",
  "aliases": [
   "white bread",
   "bread slice",
   "pav"
  ],
  "category": "Breads",
  "diet": "vegan",
  "allergens": [
   "gluten"
  ],
  "per100": {
   "kcal": 265.0,
   "protein": 9.0,
   "fat": 3.2,
   "carbs": 49.0,
   "fiber": 2.7,
   "sodium": 491.0,
   "iron": 3.6,
   "calcium": 260.0,
   "vitaminC": 0.0,
   "potassium": 115.0
  },
  "servings": [
   {
    "label": "1 slice (30 g)",
    "grams": 30.0
   },
   {
    "label": "2 slices",
    "grams": 60.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "bread_wholewheat",
  "name": "Bread, whole wheat",
  "aliases": [
   "brown bread",
   "atta bread"
  ],
  "category": "Breads",
  "diet": "vegan",
  "allergens": [
   "gluten"
  ],
  "per100": {
   "kcal": 252.0,
   "protein": 12.4,
   "fat": 3.5,
   "carbs": 42.7,
   "fiber": 6.0,
   "sodium": 450.0,
   "iron": 2.5,
   "calcium": 160.0,
   "vitaminC": 0.0,
   "potassium": 250.0
  },
  "servings": [
   {
    "label": "1 slice (30 g)",
    "grams": 30.0
   },
   {
    "label": "2 slices",
    "grams": 60.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "oats_dry",
  "name": "Oats, rolled, dry",
  "aliases": [
   "oatmeal",
   "porridge oats"
  ],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [
   "gluten"
  ],
  "per100": {
   "kcal": 389.0,
   "protein": 16.9,
   "fat": 6.9,
   "carbs": 66.3,
   "fiber": 10.6,
   "sodium": 2.0,
   "iron": 4.7,
   "calcium": 54.0,
   "vitaminC": 0.0,
   "potassium": 429.0
  },
  "servings": [
   {
    "label": "1/2 cup (40 g)",
    "grams": 40.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "oats_cooked",
  "name": "Oatmeal, cooked with water",
  "aliases": [
   "oats porridge",
   "daliya"
  ],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [
   "gluten"
  ],
  "per100": {
   "kcal": 71.0,
   "protein": 2.5,
   "fat": 1.5,
   "carbs": 12.0,
   "fiber": 1.7,
   "sodium": 49.0,
   "iron": 0.9,
   "calcium": 9.0,
   "vitaminC": 0.0,
   "potassium": 70.0
  },
  "servings": [
   {
    "label": "1 bowl (240 g)",
    "grams": 240.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "cornflakes",
  "name": "Corn flakes",
  "aliases": [
   "cereal",
   "breakfast cereal"
  ],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 357.0,
   "protein": 7.5,
   "fat": 0.4,
   "carbs": 84.0,
   "fiber": 3.3,
   "sodium": 729.0,
   "iron": 8.0,
   "calcium": 3.0,
   "vitaminC": 0.0,
   "potassium": 100.0
  },
  "servings": [
   {
    "label": "1 bowl (30 g)",
    "grams": 30.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "quinoa_cooked",
  "name": "Quinoa, cooked",
  "aliases": [],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 120.0,
   "protein": 4.4,
   "fat": 1.9,
   "carbs": 21.3,
   "fiber": 2.8,
   "sodium": 7.0,
   "iron": 1.5,
   "calcium": 17.0,
   "vitaminC": 0.0,
   "potassium": 172.0
  },
  "servings": [
   {
    "label": "1 cup (185 g)",
    "grams": 185.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "pasta_cooked",
  "name": "Pasta, cooked",
  "aliases": [
   "spaghetti",
   "macaroni",
   "penne"
  ],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [
   "gluten"
  ],
  "per100": {
   "kcal": 158.0,
   "protein": 5.8,
   "fat": 0.9,
   "carbs": 30.9,
   "fiber": 1.8,
   "sodium": 1.0,
   "iron": 1.3,
   "calcium": 7.0,
   "vitaminC": 0.0,
   "potassium": 44.0
  },
  "servings": [
   {
    "label": "1 cup (140 g)",
    "grams": 140.0
   },
   {
    "label": "1 plate (250 g)",
    "grams": 250.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "noodles_cooked",
  "name": "Noodles, cooked",
  "aliases": [
   "egg noodles",
   "chowmein noodles"
  ],
  "category": "Grains",
  "diet": "egg",
  "allergens": [
   "gluten",
   "egg"
  ],
  "per100": {
   "kcal": 138.0,
   "protein": 4.5,
   "fat": 2.1,
   "carbs": 25.0,
   "fiber": 1.2,
   "sodium": 5.0,
   "iron": 1.3,
   "calcium": 19.0,
   "vitaminC": 0.0,
   "potassium": 44.0
  },
  "servings": [
   {
    "label": "1 cup (160 g)",
    "grams": 160.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "semolina_dry",
  "name": "Semolina, dry (suji / rava)",
  "aliases": [
   "suji",
   "rava",
   "sooji"
  ],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [
   "gluten"
  ],
  "per100": {
   "kcal": 360.0,
   "protein": 12.7,
   "fat": 1.1,
   "carbs": 72.8,
   "fiber": 3.9,
   "sodium": 1.0,
   "iron": 1.2,
   "calcium": 16.0,
   "vitaminC": 0.0,
   "potassium": 186.0
  },
  "servings": [
   {
    "label": "1/4 cup (40 g)",
    "grams": 40.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "wheat_flour",
  "name": "Whole wheat flour (atta)",
  "aliases": [
   "atta",
   "wheat flour"
  ],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [
   "gluten"
  ],
  "per100": {
   "kcal": 340.0,
   "protein": 13.7,
   "fat": 1.9,
   "carbs": 72.0,
   "fiber": 10.7,
   "sodium": 2.0,
   "iron": 3.9,
   "calcium": 34.0,
   "vitaminC": 0.0,
   "potassium": 363.0
  },
  "servings": [
   {
    "label": "1 tbsp (8 g)",
    "grams": 8.0
   },
   {
    "label": "1/2 cup (60 g)",
    "grams": 60.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "besan",
  "name": "Chickpea flour (besan)",
  "aliases": [
   "gram flour",
   "besan"
  ],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 387.0,
   "protein": 22.4,
   "fat": 6.7,
   "carbs": 57.8,
   "fiber": 10.8,
   "sodium": 64.0,
   "iron": 4.9,
   "calcium": 45.0,
   "vitaminC": 0.0,
   "potassium": 846.0
  },
  "servings": [
   {
    "label": "1 tbsp (8 g)",
    "grams": 8.0
   },
   {
    "label": "1/4 cup (30 g)",
    "grams": 30.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "ragi_flour",
  "name": "Ragi flour (finger millet)",
  "aliases": [
   "nachni",
   "ragi",
   "finger millet"
  ],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 336.0,
   "protein": 7.3,
   "fat": 1.3,
   "carbs": 72.0,
   "fiber": 3.6,
   "sodium": 11.0,
   "iron": 3.9,
   "calcium": 344.0,
   "vitaminC": 0.0,
   "potassium": 408.0
  },
  "servings": [
   {
    "label": "1 tbsp (8 g)",
    "grams": 8.0
   },
   {
    "label": "1/4 cup (35 g)",
    "grams": 35.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "jowar_flour",
  "name": "Jowar flour (sorghum)",
  "aliases": [
   "sorghum",
   "jwari"
  ],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 339.0,
   "protein": 10.4,
   "fat": 1.9,
   "carbs": 72.6,
   "fiber": 6.3,
   "sodium": 2.0,
   "iron": 4.1,
   "calcium": 25.0,
   "vitaminC": 0.0,
   "potassium": 363.0
  },
  "servings": [
   {
    "label": "1/4 cup (35 g)",
    "grams": 35.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "bajra_flour",
  "name": "Bajra flour (pearl millet)",
  "aliases": [
   "pearl millet",
   "bajri"
  ],
  "category": "Grains",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 361.0,
   "protein": 11.6,
   "fat": 5.0,
   "carbs": 67.5,
   "fiber": 11.3,
   "sodium": 10.0,
   "iron": 8.0,
   "calcium": 42.0,
   "vitaminC": 0.0,
   "potassium": 307.0
  },
  "servings": [
   {
    "label": "1/4 cup (35 g)",
    "grams": 35.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "dal_toor_cooked",
  "name": "Toor / arhar dal, cooked",
  "aliases": [
   "tur dal",
   "arhar",
   "pigeon pea",
   "toor"
  ],
  "category": "Pulses",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 116.0,
   "protein": 6.8,
   "fat": 0.6,
   "carbs": 20.2,
   "fiber": 5.1,
   "sodium": 3.0,
   "iron": 1.8,
   "calcium": 30.0,
   "vitaminC": 0.0,
   "potassium": 300.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "dal_moong_cooked",
  "name": "Moong dal, cooked",
  "aliases": [
   "mung",
   "green gram",
   "moong"
  ],
  "category": "Pulses",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 105.0,
   "protein": 7.0,
   "fat": 0.4,
   "carbs": 19.2,
   "fiber": 7.6,
   "sodium": 2.0,
   "iron": 1.4,
   "calcium": 27.0,
   "vitaminC": 1.0,
   "potassium": 266.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "dal_masoor_cooked",
  "name": "Masoor dal, cooked",
  "aliases": [
   "red lentil",
   "masoor"
  ],
  "category": "Pulses",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 116.0,
   "protein": 9.0,
   "fat": 0.4,
   "carbs": 20.1,
   "fiber": 7.9,
   "sodium": 2.0,
   "iron": 3.3,
   "calcium": 19.0,
   "vitaminC": 1.5,
   "potassium": 369.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "dal_chana_cooked",
  "name": "Chana dal, cooked",
  "aliases": [
   "bengal gram",
   "chana dal"
  ],
  "category": "Pulses",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 164.0,
   "protein": 8.9,
   "fat": 2.6,
   "carbs": 27.4,
   "fiber": 7.6,
   "sodium": 7.0,
   "iron": 2.9,
   "calcium": 49.0,
   "vitaminC": 1.3,
   "potassium": 291.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "dal_urad_cooked",
  "name": "Urad dal, cooked",
  "aliases": [
   "black gram",
   "urad"
  ],
  "category": "Pulses",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 105.0,
   "protein": 7.0,
   "fat": 0.5,
   "carbs": 18.5,
   "fiber": 4.2,
   "sodium": 3.0,
   "iron": 1.9,
   "calcium": 40.0,
   "vitaminC": 0.0,
   "potassium": 290.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "rajma_cooked",
  "name": "Rajma (kidney beans), cooked",
  "aliases": [
   "kidney beans",
   "rajma"
  ],
  "category": "Pulses",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 127.0,
   "protein": 8.7,
   "fat": 0.5,
   "carbs": 22.8,
   "fiber": 6.4,
   "sodium": 1.0,
   "iron": 2.2,
   "calcium": 28.0,
   "vitaminC": 1.2,
   "potassium": 403.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "chickpeas_cooked",
  "name": "Chickpeas (chole), boiled",
  "aliases": [
   "chole",
   "kabuli chana",
   "garbanzo"
  ],
  "category": "Pulses",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 164.0,
   "protein": 8.9,
   "fat": 2.6,
   "carbs": 27.4,
   "fiber": 7.6,
   "sodium": 7.0,
   "iron": 2.9,
   "calcium": 49.0,
   "vitaminC": 1.3,
   "potassium": 291.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "lobia_cooked",
  "name": "Black-eyed peas (lobia), cooked",
  "aliases": [
   "lobia",
   "chawli",
   "cowpea"
  ],
  "category": "Pulses",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 116.0,
   "protein": 7.7,
   "fat": 0.5,
   "carbs": 20.8,
   "fiber": 6.5,
   "sodium": 4.0,
   "iron": 2.5,
   "calcium": 24.0,
   "vitaminC": 0.4,
   "potassium": 278.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "soybeans_cooked",
  "name": "Soybeans, cooked",
  "aliases": [],
  "category": "Pulses",
  "diet": "vegan",
  "allergens": [
   "soy"
  ],
  "per100": {
   "kcal": 173.0,
   "protein": 16.6,
   "fat": 9.0,
   "carbs": 9.9,
   "fiber": 6.0,
   "sodium": 1.0,
   "iron": 5.1,
   "calcium": 102.0,
   "vitaminC": 1.7,
   "potassium": 515.0
  },
  "servings": [
   {
    "label": "1/2 cup (90 g)",
    "grams": 90.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "tofu_firm",
  "name": "Tofu, firm",
  "aliases": [],
  "category": "Pulses",
  "diet": "vegan",
  "allergens": [
   "soy"
  ],
  "per100": {
   "kcal": 144.0,
   "protein": 17.3,
   "fat": 8.7,
   "carbs": 2.8,
   "fiber": 2.3,
   "sodium": 14.0,
   "iron": 2.7,
   "calcium": 683.0,
   "vitaminC": 0.1,
   "potassium": 237.0
  },
  "servings": [
   {
    "label": "100 g",
    "grams": 100.0
   },
   {
    "label": "1/2 cup (126 g)",
    "grams": 126.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "soya_chunks_dry",
  "name": "Soya chunks, dry",
  "aliases": [
   "nutrela",
   "soy chunks",
   "meal maker"
  ],
  "category": "Pulses",
  "diet": "vegan",
  "allergens": [
   "soy"
  ],
  "per100": {
   "kcal": 345.0,
   "protein": 52.0,
   "fat": 0.5,
   "carbs": 33.0,
   "fiber": 13.0,
   "sodium": 20.0,
   "iron": 15.0,
   "calcium": 350.0,
   "vitaminC": 0.0,
   "potassium": 1900.0
  },
  "servings": [
   {
    "label": "1/4 cup (25 g)",
    "grams": 25.0
   },
   {
    "label": "1 handful (30 g)",
    "grams": 30.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "peanuts_roasted",
  "name": "Peanuts, roasted",
  "aliases": [
   "moongfali",
   "groundnut",
   "mungfali"
  ],
  "category": "Nuts & seeds",
  "diet": "vegan",
  "allergens": [
   "peanut"
  ],
  "per100": {
   "kcal": 585.0,
   "protein": 23.7,
   "fat": 49.7,
   "carbs": 21.5,
   "fiber": 8.0,
   "sodium": 6.0,
   "iron": 1.3,
   "calcium": 54.0,
   "vitaminC": 0.0,
   "potassium": 658.0
  },
  "servings": [
   {
    "label": "1 handful (30 g)",
    "grams": 30.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "milk_whole",
  "name": "Milk, whole (cow)",
  "aliases": [
   "doodh",
   "milk",
   "full cream milk"
  ],
  "category": "Dairy",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 61.0,
   "protein": 3.2,
   "fat": 3.3,
   "carbs": 4.8,
   "fiber": 0.0,
   "sodium": 43.0,
   "iron": 0.0,
   "calcium": 113.0,
   "vitaminC": 0.0,
   "potassium": 132.0
  },
  "servings": [
   {
    "label": "1 glass (240 ml)",
    "grams": 245.0
   },
   {
    "label": "1 cup",
    "grams": 245.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "milk_buffalo",
  "name": "Milk, buffalo",
  "aliases": [
   "buffalo milk"
  ],
  "category": "Dairy",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 97.0,
   "protein": 3.7,
   "fat": 6.9,
   "carbs": 5.2,
   "fiber": 0.0,
   "sodium": 52.0,
   "iron": 0.2,
   "calcium": 169.0,
   "vitaminC": 1.0,
   "potassium": 178.0
  },
  "servings": [
   {
    "label": "1 glass (240 ml)",
    "grams": 245.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "milk_toned",
  "name": "Milk, toned",
  "aliases": [
   "toned milk",
   "double toned"
  ],
  "category": "Dairy",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 58.0,
   "protein": 3.0,
   "fat": 3.0,
   "carbs": 4.6,
   "fiber": 0.0,
   "sodium": 45.0,
   "iron": 0.0,
   "calcium": 120.0,
   "vitaminC": 0.0,
   "potassium": 140.0
  },
  "servings": [
   {
    "label": "1 glass (240 ml)",
    "grams": 245.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "milk_skim",
  "name": "Milk, skimmed",
  "aliases": [
   "skim milk",
   "fat free milk"
  ],
  "category": "Dairy",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 34.0,
   "protein": 3.4,
   "fat": 0.1,
   "carbs": 5.0,
   "fiber": 0.0,
   "sodium": 42.0,
   "iron": 0.0,
   "calcium": 122.0,
   "vitaminC": 0.0,
   "potassium": 166.0
  },
  "servings": [
   {
    "label": "1 glass (240 ml)",
    "grams": 245.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "curd",
  "name": "Curd / dahi (whole milk)",
  "aliases": [
   "dahi",
   "yogurt",
   "yoghurt",
   "curd"
  ],
  "category": "Dairy",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 61.0,
   "protein": 3.5,
   "fat": 3.3,
   "carbs": 4.7,
   "fiber": 0.0,
   "sodium": 46.0,
   "iron": 0.1,
   "calcium": 121.0,
   "vitaminC": 0.5,
   "potassium": 155.0
  },
  "servings": [
   {
    "label": "1 katori (100 g)",
    "grams": 100.0
   },
   {
    "label": "1 bowl (200 g)",
    "grams": 200.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "greek_yogurt",
  "name": "Greek yogurt, plain, non-fat",
  "aliases": [
   "greek yoghurt",
   "hung curd"
  ],
  "category": "Dairy",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 59.0,
   "protein": 10.2,
   "fat": 0.4,
   "carbs": 3.6,
   "fiber": 0.0,
   "sodium": 36.0,
   "iron": 0.1,
   "calcium": 110.0,
   "vitaminC": 0.0,
   "potassium": 141.0
  },
  "servings": [
   {
    "label": "1 small tub (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "buttermilk",
  "name": "Buttermilk (chaas)",
  "aliases": [
   "chaas",
   "chhaas",
   "lassi plain",
   "mattha"
  ],
  "category": "Dairy",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 40.0,
   "protein": 3.3,
   "fat": 0.9,
   "carbs": 4.8,
   "fiber": 0.0,
   "sodium": 105.0,
   "iron": 0.0,
   "calcium": 116.0,
   "vitaminC": 1.0,
   "potassium": 151.0
  },
  "servings": [
   {
    "label": "1 glass (240 ml)",
    "grams": 245.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "paneer",
  "name": "Paneer",
  "aliases": [
   "cottage cheese",
   "panir",
   "indian cheese"
  ],
  "category": "Dairy",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 265.0,
   "protein": 18.3,
   "fat": 20.8,
   "carbs": 1.2,
   "fiber": 0.0,
   "sodium": 22.0,
   "iron": 0.2,
   "calcium": 208.0,
   "vitaminC": 0.0,
   "potassium": 138.0
  },
  "servings": [
   {
    "label": "50 g cube",
    "grams": 50.0
   },
   {
    "label": "100 g",
    "grams": 100.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "cheese_cheddar",
  "name": "Cheese, cheddar",
  "aliases": [
   "cheese"
  ],
  "category": "Dairy",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 403.0,
   "protein": 24.9,
   "fat": 33.1,
   "carbs": 1.3,
   "fiber": 0.0,
   "sodium": 653.0,
   "iron": 0.7,
   "calcium": 721.0,
   "vitaminC": 0.0,
   "potassium": 98.0
  },
  "servings": [
   {
    "label": "1 slice (20 g)",
    "grams": 20.0
   },
   {
    "label": "1 cube (25 g)",
    "grams": 25.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "butter",
  "name": "Butter",
  "aliases": [
   "makhan"
  ],
  "category": "Dairy",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 717.0,
   "protein": 0.9,
   "fat": 81.1,
   "carbs": 0.1,
   "fiber": 0.0,
   "sodium": 576.0,
   "iron": 0.0,
   "calcium": 24.0,
   "vitaminC": 0.0,
   "potassium": 24.0
  },
  "servings": [
   {
    "label": "1 tsp (5 g)",
    "grams": 5.0
   },
   {
    "label": "1 tbsp (14 g)",
    "grams": 14.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "ghee",
  "name": "Ghee",
  "aliases": [
   "clarified butter"
  ],
  "category": "Dairy",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 876.0,
   "protein": 0.3,
   "fat": 99.5,
   "carbs": 0.0,
   "fiber": 0.0,
   "sodium": 2.0,
   "iron": 0.0,
   "calcium": 4.0,
   "vitaminC": 0.0,
   "potassium": 5.0
  },
  "servings": [
   {
    "label": "1 tsp (5 g)",
    "grams": 5.0
   },
   {
    "label": "1 tbsp (14 g)",
    "grams": 14.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "egg_boiled",
  "name": "Egg, whole, boiled",
  "aliases": [
   "anda",
   "egg",
   "boiled egg"
  ],
  "category": "Eggs",
  "diet": "egg",
  "allergens": [
   "egg"
  ],
  "per100": {
   "kcal": 155.0,
   "protein": 12.6,
   "fat": 10.6,
   "carbs": 1.1,
   "fiber": 0.0,
   "sodium": 124.0,
   "iron": 1.2,
   "calcium": 50.0,
   "vitaminC": 0.0,
   "potassium": 126.0
  },
  "servings": [
   {
    "label": "1 egg (50 g)",
    "grams": 50.0
   },
   {
    "label": "2 eggs",
    "grams": 100.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "egg_white",
  "name": "Egg white, boiled",
  "aliases": [
   "egg whites"
  ],
  "category": "Eggs",
  "diet": "egg",
  "allergens": [
   "egg"
  ],
  "per100": {
   "kcal": 52.0,
   "protein": 10.9,
   "fat": 0.2,
   "carbs": 0.7,
   "fiber": 0.0,
   "sodium": 166.0,
   "iron": 0.1,
   "calcium": 7.0,
   "vitaminC": 0.0,
   "potassium": 163.0
  },
  "servings": [
   {
    "label": "1 white (33 g)",
    "grams": 33.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "omelette",
  "name": "Omelette (plain, 1 tsp oil)",
  "aliases": [
   "omelet",
   "anda omelette"
  ],
  "category": "Eggs",
  "diet": "egg",
  "allergens": [
   "egg"
  ],
  "per100": {
   "kcal": 154.0,
   "protein": 10.6,
   "fat": 11.7,
   "carbs": 0.6,
   "fiber": 0.0,
   "sodium": 155.0,
   "iron": 1.2,
   "calcium": 58.0,
   "vitaminC": 0.0,
   "potassium": 156.0
  },
  "servings": [
   {
    "label": "2-egg omelette (110 g)",
    "grams": 110.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "chicken_breast_cooked",
  "name": "Chicken breast, cooked, skinless",
  "aliases": [
   "chicken",
   "grilled chicken"
  ],
  "category": "Meat & fish",
  "diet": "nonveg",
  "allergens": [],
  "per100": {
   "kcal": 165.0,
   "protein": 31.0,
   "fat": 3.6,
   "carbs": 0.0,
   "fiber": 0.0,
   "sodium": 74.0,
   "iron": 1.0,
   "calcium": 15.0,
   "vitaminC": 0.0,
   "potassium": 256.0
  },
  "servings": [
   {
    "label": "1 piece (100 g)",
    "grams": 100.0
   },
   {
    "label": "1 cup diced (140 g)",
    "grams": 140.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "chicken_thigh_cooked",
  "name": "Chicken thigh, cooked, skinless",
  "aliases": [],
  "category": "Meat & fish",
  "diet": "nonveg",
  "allergens": [],
  "per100": {
   "kcal": 179.0,
   "protein": 24.8,
   "fat": 8.2,
   "carbs": 0.0,
   "fiber": 0.0,
   "sodium": 95.0,
   "iron": 1.3,
   "calcium": 11.0,
   "vitaminC": 0.0,
   "potassium": 240.0
  },
  "servings": [
   {
    "label": "1 piece (80 g)",
    "grams": 80.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "mutton_cooked",
  "name": "Mutton / goat, cooked",
  "aliases": [
   "goat meat",
   "lamb",
   "gosht"
  ],
  "category": "Meat & fish",
  "diet": "nonveg",
  "allergens": [],
  "per100": {
   "kcal": 143.0,
   "protein": 27.1,
   "fat": 3.0,
   "carbs": 0.0,
   "fiber": 0.0,
   "sodium": 86.0,
   "iron": 3.7,
   "calcium": 17.0,
   "vitaminC": 0.0,
   "potassium": 385.0
  },
  "servings": [
   {
    "label": "100 g",
    "grams": 100.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "fish_rohu_cooked",
  "name": "Rohu / freshwater fish, cooked",
  "aliases": [
   "rohu",
   "carp",
   "river fish"
  ],
  "category": "Meat & fish",
  "diet": "nonveg",
  "allergens": [
   "fish"
  ],
  "per100": {
   "kcal": 130.0,
   "protein": 21.0,
   "fat": 4.5,
   "carbs": 0.0,
   "fiber": 0.0,
   "sodium": 60.0,
   "iron": 1.0,
   "calcium": 60.0,
   "vitaminC": 0.0,
   "potassium": 350.0
  },
  "servings": [
   {
    "label": "1 piece (100 g)",
    "grams": 100.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "salmon_cooked",
  "name": "Salmon, cooked",
  "aliases": [],
  "category": "Meat & fish",
  "diet": "nonveg",
  "allergens": [
   "fish"
  ],
  "per100": {
   "kcal": 206.0,
   "protein": 22.1,
   "fat": 12.4,
   "carbs": 0.0,
   "fiber": 0.0,
   "sodium": 61.0,
   "iron": 0.3,
   "calcium": 15.0,
   "vitaminC": 0.0,
   "potassium": 384.0
  },
  "servings": [
   {
    "label": "1 fillet (120 g)",
    "grams": 120.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "tuna_canned",
  "name": "Tuna, canned in water",
  "aliases": [],
  "category": "Meat & fish",
  "diet": "nonveg",
  "allergens": [
   "fish"
  ],
  "per100": {
   "kcal": 116.0,
   "protein": 25.5,
   "fat": 0.8,
   "carbs": 0.0,
   "fiber": 0.0,
   "sodium": 247.0,
   "iron": 1.4,
   "calcium": 11.0,
   "vitaminC": 0.0,
   "potassium": 237.0
  },
  "servings": [
   {
    "label": "1 small can (110 g)",
    "grams": 110.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "prawns_cooked",
  "name": "Prawns / shrimp, cooked",
  "aliases": [
   "shrimp",
   "jhinga",
   "prawn"
  ],
  "category": "Meat & fish",
  "diet": "nonveg",
  "allergens": [
   "shellfish"
  ],
  "per100": {
   "kcal": 99.0,
   "protein": 24.0,
   "fat": 0.3,
   "carbs": 0.2,
   "fiber": 0.0,
   "sodium": 111.0,
   "iron": 0.5,
   "calcium": 70.0,
   "vitaminC": 0.0,
   "potassium": 259.0
  },
  "servings": [
   {
    "label": "100 g",
    "grams": 100.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "potato_boiled",
  "name": "Potato, boiled",
  "aliases": [
   "aloo",
   "potato"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 87.0,
   "protein": 1.9,
   "fat": 0.1,
   "carbs": 20.1,
   "fiber": 1.8,
   "sodium": 5.0,
   "iron": 0.3,
   "calcium": 5.0,
   "vitaminC": 13.0,
   "potassium": 379.0
  },
  "servings": [
   {
    "label": "1 medium (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "sweet_potato",
  "name": "Sweet potato, baked",
  "aliases": [
   "shakarkandi",
   "shakarkand"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 90.0,
   "protein": 2.0,
   "fat": 0.2,
   "carbs": 20.7,
   "fiber": 3.3,
   "sodium": 36.0,
   "iron": 0.7,
   "calcium": 38.0,
   "vitaminC": 19.6,
   "potassium": 475.0
  },
  "servings": [
   {
    "label": "1 medium (130 g)",
    "grams": 130.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "onion",
  "name": "Onion, raw",
  "aliases": [
   "pyaz",
   "pyaaz"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 40.0,
   "protein": 1.1,
   "fat": 0.1,
   "carbs": 9.3,
   "fiber": 1.7,
   "sodium": 4.0,
   "iron": 0.2,
   "calcium": 23.0,
   "vitaminC": 7.4,
   "potassium": 146.0
  },
  "servings": [
   {
    "label": "1 medium (110 g)",
    "grams": 110.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "tomato",
  "name": "Tomato, raw",
  "aliases": [
   "tamatar"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 18.0,
   "protein": 0.9,
   "fat": 0.2,
   "carbs": 3.9,
   "fiber": 1.2,
   "sodium": 5.0,
   "iron": 0.3,
   "calcium": 10.0,
   "vitaminC": 13.7,
   "potassium": 237.0
  },
  "servings": [
   {
    "label": "1 medium (120 g)",
    "grams": 120.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "cucumber",
  "name": "Cucumber",
  "aliases": [
   "kheera",
   "kakdi"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 15.0,
   "protein": 0.7,
   "fat": 0.1,
   "carbs": 3.6,
   "fiber": 0.5,
   "sodium": 2.0,
   "iron": 0.3,
   "calcium": 16.0,
   "vitaminC": 2.8,
   "potassium": 147.0
  },
  "servings": [
   {
    "label": "1 medium (200 g)",
    "grams": 200.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "carrot",
  "name": "Carrot, raw",
  "aliases": [
   "gajar"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 41.0,
   "protein": 0.9,
   "fat": 0.2,
   "carbs": 9.6,
   "fiber": 2.8,
   "sodium": 69.0,
   "iron": 0.3,
   "calcium": 33.0,
   "vitaminC": 5.9,
   "potassium": 320.0
  },
  "servings": [
   {
    "label": "1 medium (60 g)",
    "grams": 60.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "spinach",
  "name": "Spinach, raw",
  "aliases": [
   "palak",
   "paalak"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 23.0,
   "protein": 2.9,
   "fat": 0.4,
   "carbs": 3.6,
   "fiber": 2.2,
   "sodium": 79.0,
   "iron": 2.7,
   "calcium": 99.0,
   "vitaminC": 28.1,
   "potassium": 558.0
  },
  "servings": [
   {
    "label": "1 cup (30 g)",
    "grams": 30.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "spinach_cooked",
  "name": "Spinach, cooked",
  "aliases": [
   "palak cooked"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 23.0,
   "protein": 3.0,
   "fat": 0.3,
   "carbs": 3.8,
   "fiber": 2.4,
   "sodium": 70.0,
   "iron": 3.6,
   "calcium": 136.0,
   "vitaminC": 9.8,
   "potassium": 466.0
  },
  "servings": [
   {
    "label": "1/2 cup (90 g)",
    "grams": 90.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "cauliflower",
  "name": "Cauliflower, raw",
  "aliases": [
   "gobi",
   "gobhi",
   "phool gobi"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 25.0,
   "protein": 1.9,
   "fat": 0.3,
   "carbs": 5.0,
   "fiber": 2.0,
   "sodium": 30.0,
   "iron": 0.4,
   "calcium": 22.0,
   "vitaminC": 48.2,
   "potassium": 299.0
  },
  "servings": [
   {
    "label": "1 cup (100 g)",
    "grams": 100.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "cabbage",
  "name": "Cabbage, raw",
  "aliases": [
   "patta gobi",
   "band gobi"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 25.0,
   "protein": 1.3,
   "fat": 0.1,
   "carbs": 5.8,
   "fiber": 2.5,
   "sodium": 18.0,
   "iron": 0.5,
   "calcium": 40.0,
   "vitaminC": 36.6,
   "potassium": 170.0
  },
  "servings": [
   {
    "label": "1 cup (90 g)",
    "grams": 90.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "broccoli",
  "name": "Broccoli, cooked",
  "aliases": [],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 35.0,
   "protein": 2.4,
   "fat": 0.4,
   "carbs": 7.2,
   "fiber": 3.3,
   "sodium": 41.0,
   "iron": 0.7,
   "calcium": 40.0,
   "vitaminC": 64.9,
   "potassium": 293.0
  },
  "servings": [
   {
    "label": "1 cup (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "brinjal",
  "name": "Brinjal / eggplant, cooked",
  "aliases": [
   "baingan",
   "aubergine",
   "eggplant"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 35.0,
   "protein": 0.8,
   "fat": 0.2,
   "carbs": 8.7,
   "fiber": 2.5,
   "sodium": 1.0,
   "iron": 0.2,
   "calcium": 6.0,
   "vitaminC": 1.3,
   "potassium": 123.0
  },
  "servings": [
   {
    "label": "1 cup (100 g)",
    "grams": 100.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "okra",
  "name": "Okra, raw",
  "aliases": [
   "bhindi",
   "lady finger",
   "ladyfinger"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 33.0,
   "protein": 1.9,
   "fat": 0.2,
   "carbs": 7.5,
   "fiber": 3.2,
   "sodium": 7.0,
   "iron": 0.6,
   "calcium": 82.0,
   "vitaminC": 23.0,
   "potassium": 299.0
  },
  "servings": [
   {
    "label": "1 cup (100 g)",
    "grams": 100.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "green_peas",
  "name": "Green peas, cooked",
  "aliases": [
   "matar",
   "mutter"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 84.0,
   "protein": 5.4,
   "fat": 0.2,
   "carbs": 15.6,
   "fiber": 5.5,
   "sodium": 3.0,
   "iron": 1.5,
   "calcium": 27.0,
   "vitaminC": 14.2,
   "potassium": 271.0
  },
  "servings": [
   {
    "label": "1/2 cup (80 g)",
    "grams": 80.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "french_beans",
  "name": "French beans, cooked",
  "aliases": [
   "beans",
   "farasbi"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 35.0,
   "protein": 1.9,
   "fat": 0.3,
   "carbs": 7.9,
   "fiber": 3.2,
   "sodium": 1.0,
   "iron": 0.6,
   "calcium": 44.0,
   "vitaminC": 9.7,
   "potassium": 146.0
  },
  "servings": [
   {
    "label": "1/2 cup (60 g)",
    "grams": 60.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "capsicum",
  "name": "Capsicum (green bell pepper)",
  "aliases": [
   "shimla mirch",
   "bell pepper"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 20.0,
   "protein": 0.9,
   "fat": 0.2,
   "carbs": 4.6,
   "fiber": 1.7,
   "sodium": 3.0,
   "iron": 0.4,
   "calcium": 10.0,
   "vitaminC": 80.4,
   "potassium": 175.0
  },
  "servings": [
   {
    "label": "1 medium (120 g)",
    "grams": 120.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "bottle_gourd",
  "name": "Bottle gourd (lauki)",
  "aliases": [
   "lauki",
   "dudhi",
   "ghiya"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 14.0,
   "protein": 0.6,
   "fat": 0.0,
   "carbs": 3.4,
   "fiber": 0.5,
   "sodium": 2.0,
   "iron": 0.2,
   "calcium": 26.0,
   "vitaminC": 10.1,
   "potassium": 150.0
  },
  "servings": [
   {
    "label": "1 cup (100 g)",
    "grams": 100.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "pumpkin",
  "name": "Pumpkin, cooked",
  "aliases": [
   "kaddu",
   "kadu"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 20.0,
   "protein": 0.7,
   "fat": 0.1,
   "carbs": 4.9,
   "fiber": 1.1,
   "sodium": 1.0,
   "iron": 0.6,
   "calcium": 15.0,
   "vitaminC": 4.7,
   "potassium": 230.0
  },
  "servings": [
   {
    "label": "1 cup (140 g)",
    "grams": 140.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "beetroot",
  "name": "Beetroot, cooked",
  "aliases": [
   "chukandar"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 44.0,
   "protein": 1.7,
   "fat": 0.2,
   "carbs": 10.0,
   "fiber": 2.0,
   "sodium": 77.0,
   "iron": 0.8,
   "calcium": 16.0,
   "vitaminC": 3.6,
   "potassium": 305.0
  },
  "servings": [
   {
    "label": "1 medium (80 g)",
    "grams": 80.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "mushroom",
  "name": "Mushrooms, cooked",
  "aliases": [
   "khumb",
   "mushroom"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 28.0,
   "protein": 2.2,
   "fat": 0.5,
   "carbs": 5.3,
   "fiber": 2.2,
   "sodium": 2.0,
   "iron": 0.4,
   "calcium": 6.0,
   "vitaminC": 0.0,
   "potassium": 356.0
  },
  "servings": [
   {
    "label": "1 cup (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "sweet_corn",
  "name": "Sweet corn, cooked",
  "aliases": [
   "bhutta",
   "makka",
   "corn"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 96.0,
   "protein": 3.4,
   "fat": 1.5,
   "carbs": 21.0,
   "fiber": 2.4,
   "sodium": 1.0,
   "iron": 0.5,
   "calcium": 2.0,
   "vitaminC": 6.8,
   "potassium": 218.0
  },
  "servings": [
   {
    "label": "1 cob / 1 cup (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "garlic",
  "name": "Garlic, raw",
  "aliases": [
   "lehsun",
   "lasun"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 149.0,
   "protein": 6.4,
   "fat": 0.5,
   "carbs": 33.1,
   "fiber": 2.1,
   "sodium": 17.0,
   "iron": 1.7,
   "calcium": 181.0,
   "vitaminC": 31.2,
   "potassium": 401.0
  },
  "servings": [
   {
    "label": "1 clove (3 g)",
    "grams": 3.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "ginger",
  "name": "Ginger, raw",
  "aliases": [
   "adrak"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 80.0,
   "protein": 1.8,
   "fat": 0.8,
   "carbs": 17.8,
   "fiber": 2.0,
   "sodium": 13.0,
   "iron": 0.6,
   "calcium": 16.0,
   "vitaminC": 5.0,
   "potassium": 415.0
  },
  "servings": [
   {
    "label": "1 inch (10 g)",
    "grams": 10.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "green_chilli",
  "name": "Green chilli",
  "aliases": [
   "hari mirch",
   "mirchi"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 40.0,
   "protein": 2.0,
   "fat": 0.2,
   "carbs": 9.5,
   "fiber": 1.5,
   "sodium": 7.0,
   "iron": 1.0,
   "calcium": 18.0,
   "vitaminC": 242.0,
   "potassium": 340.0
  },
  "servings": [
   {
    "label": "1 chilli (8 g)",
    "grams": 8.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "coriander_leaves",
  "name": "Coriander leaves",
  "aliases": [
   "dhania",
   "cilantro",
   "hara dhania"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 23.0,
   "protein": 2.1,
   "fat": 0.5,
   "carbs": 3.7,
   "fiber": 2.8,
   "sodium": 46.0,
   "iron": 1.8,
   "calcium": 67.0,
   "vitaminC": 27.0,
   "potassium": 521.0
  },
  "servings": [
   {
    "label": "2 tbsp (10 g)",
    "grams": 10.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "lemon_juice",
  "name": "Lemon juice",
  "aliases": [
   "nimbu",
   "nimboo",
   "lime"
  ],
  "category": "Vegetables",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 22.0,
   "protein": 0.4,
   "fat": 0.2,
   "carbs": 6.9,
   "fiber": 0.3,
   "sodium": 1.0,
   "iron": 0.1,
   "calcium": 6.0,
   "vitaminC": 38.7,
   "potassium": 103.0
  },
  "servings": [
   {
    "label": "1 tbsp (15 g)",
    "grams": 15.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "banana",
  "name": "Banana",
  "aliases": [
   "kela"
  ],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 89.0,
   "protein": 1.1,
   "fat": 0.3,
   "carbs": 22.8,
   "fiber": 2.6,
   "sodium": 1.0,
   "iron": 0.3,
   "calcium": 5.0,
   "vitaminC": 8.7,
   "potassium": 358.0
  },
  "servings": [
   {
    "label": "1 medium (118 g)",
    "grams": 118.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "apple",
  "name": "Apple, with skin",
  "aliases": [
   "seb"
  ],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 52.0,
   "protein": 0.3,
   "fat": 0.2,
   "carbs": 13.8,
   "fiber": 2.4,
   "sodium": 1.0,
   "iron": 0.1,
   "calcium": 6.0,
   "vitaminC": 4.6,
   "potassium": 107.0
  },
  "servings": [
   {
    "label": "1 medium (182 g)",
    "grams": 182.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "orange",
  "name": "Orange",
  "aliases": [
   "santra",
   "narangi",
   "mosambi"
  ],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 47.0,
   "protein": 0.9,
   "fat": 0.1,
   "carbs": 11.8,
   "fiber": 2.4,
   "sodium": 0.0,
   "iron": 0.1,
   "calcium": 40.0,
   "vitaminC": 53.2,
   "potassium": 181.0
  },
  "servings": [
   {
    "label": "1 medium (130 g)",
    "grams": 130.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "mango",
  "name": "Mango",
  "aliases": [
   "aam"
  ],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 60.0,
   "protein": 0.8,
   "fat": 0.4,
   "carbs": 15.0,
   "fiber": 1.6,
   "sodium": 1.0,
   "iron": 0.2,
   "calcium": 11.0,
   "vitaminC": 36.4,
   "potassium": 168.0
  },
  "servings": [
   {
    "label": "1 cup sliced (165 g)",
    "grams": 165.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "papaya",
  "name": "Papaya",
  "aliases": [
   "papita"
  ],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 43.0,
   "protein": 0.5,
   "fat": 0.3,
   "carbs": 10.8,
   "fiber": 1.7,
   "sodium": 8.0,
   "iron": 0.3,
   "calcium": 20.0,
   "vitaminC": 60.9,
   "potassium": 182.0
  },
  "servings": [
   {
    "label": "1 cup (145 g)",
    "grams": 145.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "grapes",
  "name": "Grapes",
  "aliases": [
   "angoor"
  ],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 69.0,
   "protein": 0.7,
   "fat": 0.2,
   "carbs": 18.1,
   "fiber": 0.9,
   "sodium": 2.0,
   "iron": 0.4,
   "calcium": 10.0,
   "vitaminC": 3.2,
   "potassium": 191.0
  },
  "servings": [
   {
    "label": "1 cup (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "watermelon",
  "name": "Watermelon",
  "aliases": [
   "tarbooz"
  ],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 30.0,
   "protein": 0.6,
   "fat": 0.2,
   "carbs": 7.6,
   "fiber": 0.4,
   "sodium": 1.0,
   "iron": 0.2,
   "calcium": 7.0,
   "vitaminC": 8.1,
   "potassium": 112.0
  },
  "servings": [
   {
    "label": "1 cup (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "pomegranate",
  "name": "Pomegranate",
  "aliases": [
   "anar"
  ],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 83.0,
   "protein": 1.7,
   "fat": 1.2,
   "carbs": 18.7,
   "fiber": 4.0,
   "sodium": 3.0,
   "iron": 0.3,
   "calcium": 10.0,
   "vitaminC": 10.2,
   "potassium": 236.0
  },
  "servings": [
   {
    "label": "1/2 cup (87 g)",
    "grams": 87.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "guava",
  "name": "Guava",
  "aliases": [
   "amrood",
   "peru"
  ],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 68.0,
   "protein": 2.6,
   "fat": 1.0,
   "carbs": 14.3,
   "fiber": 5.4,
   "sodium": 2.0,
   "iron": 0.3,
   "calcium": 18.0,
   "vitaminC": 228.3,
   "potassium": 417.0
  },
  "servings": [
   {
    "label": "1 medium (100 g)",
    "grams": 100.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "pineapple",
  "name": "Pineapple",
  "aliases": [
   "ananas"
  ],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 50.0,
   "protein": 0.5,
   "fat": 0.1,
   "carbs": 13.1,
   "fiber": 1.4,
   "sodium": 1.0,
   "iron": 0.3,
   "calcium": 13.0,
   "vitaminC": 47.8,
   "potassium": 109.0
  },
  "servings": [
   {
    "label": "1 cup (165 g)",
    "grams": 165.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "strawberries",
  "name": "Strawberries",
  "aliases": [],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 32.0,
   "protein": 0.7,
   "fat": 0.3,
   "carbs": 7.7,
   "fiber": 2.0,
   "sodium": 1.0,
   "iron": 0.4,
   "calcium": 16.0,
   "vitaminC": 58.8,
   "potassium": 153.0
  },
  "servings": [
   {
    "label": "1 cup (150 g)",
    "grams": 150.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "dates_dry",
  "name": "Dates, dried",
  "aliases": [
   "khajoor",
   "khajur"
  ],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 277.0,
   "protein": 1.8,
   "fat": 0.2,
   "carbs": 75.0,
   "fiber": 6.7,
   "sodium": 1.0,
   "iron": 0.9,
   "calcium": 64.0,
   "vitaminC": 0.0,
   "potassium": 696.0
  },
  "servings": [
   {
    "label": "1 date (24 g)",
    "grams": 24.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "raisins",
  "name": "Raisins",
  "aliases": [
   "kishmish",
   "munakka"
  ],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 299.0,
   "protein": 3.1,
   "fat": 0.5,
   "carbs": 79.2,
   "fiber": 3.7,
   "sodium": 11.0,
   "iron": 1.9,
   "calcium": 50.0,
   "vitaminC": 2.3,
   "potassium": 749.0
  },
  "servings": [
   {
    "label": "1 tbsp (10 g)",
    "grams": 10.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "coconut_fresh",
  "name": "Coconut, fresh",
  "aliases": [
   "nariyal",
   "copra"
  ],
  "category": "Fruits",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 354.0,
   "protein": 3.3,
   "fat": 33.5,
   "carbs": 15.2,
   "fiber": 9.0,
   "sodium": 20.0,
   "iron": 2.4,
   "calcium": 14.0,
   "vitaminC": 3.3,
   "potassium": 356.0
  },
  "servings": [
   {
    "label": "1 tbsp grated (8 g)",
    "grams": 8.0
   },
   {
    "label": "1 piece (45 g)",
    "grams": 45.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "coconut_water",
  "name": "Coconut water",
  "aliases": [
   "nariyal pani",
   "tender coconut water"
  ],
  "category": "Beverages",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 19.0,
   "protein": 0.7,
   "fat": 0.2,
   "carbs": 3.7,
   "fiber": 1.1,
   "sodium": 105.0,
   "iron": 0.3,
   "calcium": 24.0,
   "vitaminC": 2.4,
   "potassium": 250.0
  },
  "servings": [
   {
    "label": "1 glass (240 ml)",
    "grams": 245.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "almonds",
  "name": "Almonds",
  "aliases": [
   "badam"
  ],
  "category": "Nuts & seeds",
  "diet": "vegan",
  "allergens": [
   "nuts"
  ],
  "per100": {
   "kcal": 579.0,
   "protein": 21.2,
   "fat": 49.9,
   "carbs": 21.6,
   "fiber": 12.5,
   "sodium": 1.0,
   "iron": 3.7,
   "calcium": 269.0,
   "vitaminC": 0.0,
   "potassium": 733.0
  },
  "servings": [
   {
    "label": "1 almond (1.2 g)",
    "grams": 1.2
   },
   {
    "label": "10 almonds",
    "grams": 12.0
   },
   {
    "label": "1 handful (28 g)",
    "grams": 28.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "cashews",
  "name": "Cashew nuts",
  "aliases": [
   "kaju"
  ],
  "category": "Nuts & seeds",
  "diet": "vegan",
  "allergens": [
   "nuts"
  ],
  "per100": {
   "kcal": 553.0,
   "protein": 18.2,
   "fat": 43.9,
   "carbs": 30.2,
   "fiber": 3.3,
   "sodium": 12.0,
   "iron": 6.7,
   "calcium": 37.0,
   "vitaminC": 0.5,
   "potassium": 660.0
  },
  "servings": [
   {
    "label": "1 handful (28 g)",
    "grams": 28.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "walnuts",
  "name": "Walnuts",
  "aliases": [
   "akhrot"
  ],
  "category": "Nuts & seeds",
  "diet": "vegan",
  "allergens": [
   "nuts"
  ],
  "per100": {
   "kcal": 654.0,
   "protein": 15.2,
   "fat": 65.2,
   "carbs": 13.7,
   "fiber": 6.7,
   "sodium": 2.0,
   "iron": 2.9,
   "calcium": 98.0,
   "vitaminC": 1.3,
   "potassium": 441.0
  },
  "servings": [
   {
    "label": "1 walnut half (5 g)",
    "grams": 5.0
   },
   {
    "label": "1 handful (28 g)",
    "grams": 28.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "pistachios",
  "name": "Pistachios",
  "aliases": [
   "pista"
  ],
  "category": "Nuts & seeds",
  "diet": "vegan",
  "allergens": [
   "nuts"
  ],
  "per100": {
   "kcal": 560.0,
   "protein": 20.2,
   "fat": 45.3,
   "carbs": 27.2,
   "fiber": 10.6,
   "sodium": 1.0,
   "iron": 3.9,
   "calcium": 105.0,
   "vitaminC": 5.6,
   "potassium": 1025.0
  },
  "servings": [
   {
    "label": "1 handful (28 g)",
    "grams": 28.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "chia_seeds",
  "name": "Chia seeds",
  "aliases": [],
  "category": "Nuts & seeds",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 486.0,
   "protein": 16.5,
   "fat": 30.7,
   "carbs": 42.1,
   "fiber": 34.4,
   "sodium": 16.0,
   "iron": 7.7,
   "calcium": 631.0,
   "vitaminC": 1.6,
   "potassium": 407.0
  },
  "servings": [
   {
    "label": "1 tbsp (12 g)",
    "grams": 12.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "flaxseeds",
  "name": "Flaxseeds",
  "aliases": [
   "alsi",
   "linseed"
  ],
  "category": "Nuts & seeds",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 534.0,
   "protein": 18.3,
   "fat": 42.2,
   "carbs": 28.9,
   "fiber": 27.3,
   "sodium": 30.0,
   "iron": 5.7,
   "calcium": 255.0,
   "vitaminC": 0.6,
   "potassium": 813.0
  },
  "servings": [
   {
    "label": "1 tbsp (10 g)",
    "grams": 10.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "sesame_seeds",
  "name": "Sesame seeds",
  "aliases": [
   "til"
  ],
  "category": "Nuts & seeds",
  "diet": "vegan",
  "allergens": [
   "sesame"
  ],
  "per100": {
   "kcal": 573.0,
   "protein": 17.7,
   "fat": 49.7,
   "carbs": 23.4,
   "fiber": 11.8,
   "sodium": 11.0,
   "iron": 14.6,
   "calcium": 975.0,
   "vitaminC": 0.0,
   "potassium": 468.0
  },
  "servings": [
   {
    "label": "1 tsp (3 g)",
    "grams": 3.0
   },
   {
    "label": "1 tbsp (9 g)",
    "grams": 9.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "pumpkin_seeds",
  "name": "Pumpkin seeds",
  "aliases": [
   "kaddu seeds"
  ],
  "category": "Nuts & seeds",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 559.0,
   "protein": 30.2,
   "fat": 49.1,
   "carbs": 10.7,
   "fiber": 6.0,
   "sodium": 7.0,
   "iron": 8.8,
   "calcium": 46.0,
   "vitaminC": 1.9,
   "potassium": 809.0
  },
  "servings": [
   {
    "label": "1 tbsp (9 g)",
    "grams": 9.0
   },
   {
    "label": "1 handful (28 g)",
    "grams": 28.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "peanut_butter",
  "name": "Peanut butter",
  "aliases": [],
  "category": "Nuts & seeds",
  "diet": "vegan",
  "allergens": [
   "peanut"
  ],
  "per100": {
   "kcal": 588.0,
   "protein": 25.0,
   "fat": 50.0,
   "carbs": 20.0,
   "fiber": 6.0,
   "sodium": 426.0,
   "iron": 1.7,
   "calcium": 49.0,
   "vitaminC": 0.0,
   "potassium": 649.0
  },
  "servings": [
   {
    "label": "1 tbsp (16 g)",
    "grams": 16.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "cooking_oil",
  "name": "Cooking oil",
  "aliases": [
   "tel",
   "vegetable oil",
   "sunflower oil",
   "mustard oil",
   "refined oil"
  ],
  "category": "Fats & sugars",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 884.0,
   "protein": 0.0,
   "fat": 100.0,
   "carbs": 0.0,
   "fiber": 0.0,
   "sodium": 0.0,
   "iron": 0.0,
   "calcium": 0.0,
   "vitaminC": 0.0,
   "potassium": 0.0
  },
  "servings": [
   {
    "label": "1 tsp (5 g)",
    "grams": 5.0
   },
   {
    "label": "1 tbsp (14 g)",
    "grams": 14.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "sugar",
  "name": "Sugar",
  "aliases": [
   "cheeni",
   "shakkar",
   "white sugar"
  ],
  "category": "Fats & sugars",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 387.0,
   "protein": 0.0,
   "fat": 0.0,
   "carbs": 100.0,
   "fiber": 0.0,
   "sodium": 1.0,
   "iron": 0.1,
   "calcium": 1.0,
   "vitaminC": 0.0,
   "potassium": 2.0
  },
  "servings": [
   {
    "label": "1 tsp (4 g)",
    "grams": 4.0
   },
   {
    "label": "1 tbsp (12 g)",
    "grams": 12.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "jaggery",
  "name": "Jaggery",
  "aliases": [
   "gud",
   "gur"
  ],
  "category": "Fats & sugars",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 383.0,
   "protein": 0.4,
   "fat": 0.1,
   "carbs": 95.0,
   "fiber": 0.0,
   "sodium": 30.0,
   "iron": 2.6,
   "calcium": 80.0,
   "vitaminC": 0.0,
   "potassium": 100.0
  },
  "servings": [
   {
    "label": "1 tbsp (15 g)",
    "grams": 15.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "honey",
  "name": "Honey",
  "aliases": [
   "shahad",
   "madhu"
  ],
  "category": "Fats & sugars",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 304.0,
   "protein": 0.3,
   "fat": 0.0,
   "carbs": 82.4,
   "fiber": 0.2,
   "sodium": 4.0,
   "iron": 0.4,
   "calcium": 6.0,
   "vitaminC": 0.5,
   "potassium": 52.0
  },
  "servings": [
   {
    "label": "1 tsp (7 g)",
    "grams": 7.0
   },
   {
    "label": "1 tbsp (21 g)",
    "grams": 21.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "chai",
  "name": "Tea with milk and sugar (chai)",
  "aliases": [
   "tea",
   "masala chai",
   "milk tea"
  ],
  "category": "Beverages",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 37.0,
   "protein": 1.0,
   "fat": 1.1,
   "carbs": 5.8,
   "fiber": 0.0,
   "sodium": 15.0,
   "iron": 0.1,
   "calcium": 36.0,
   "vitaminC": 0.0,
   "potassium": 60.0
  },
  "servings": [
   {
    "label": "1 cup (150 ml)",
    "grams": 150.0
   },
   {
    "label": "1 mug (240 ml)",
    "grams": 240.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "black_coffee",
  "name": "Coffee, black",
  "aliases": [
   "black coffee"
  ],
  "category": "Beverages",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 1.0,
   "protein": 0.1,
   "fat": 0.0,
   "carbs": 0.0,
   "fiber": 0.0,
   "sodium": 2.0,
   "iron": 0.0,
   "calcium": 2.0,
   "vitaminC": 0.0,
   "potassium": 49.0
  },
  "servings": [
   {
    "label": "1 cup (240 ml)",
    "grams": 240.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "orange_juice",
  "name": "Orange juice",
  "aliases": [
   "juice",
   "fruit juice",
   "mosambi juice"
  ],
  "category": "Beverages",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 45.0,
   "protein": 0.7,
   "fat": 0.2,
   "carbs": 10.4,
   "fiber": 0.2,
   "sodium": 1.0,
   "iron": 0.2,
   "calcium": 11.0,
   "vitaminC": 50.0,
   "potassium": 200.0
  },
  "servings": [
   {
    "label": "1 glass (240 ml)",
    "grams": 248.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "soft_drink",
  "name": "Soft drink (cola)",
  "aliases": [
   "cola",
   "coke",
   "pepsi",
   "soda"
  ],
  "category": "Beverages",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 41.0,
   "protein": 0.0,
   "fat": 0.0,
   "carbs": 10.6,
   "fiber": 0.0,
   "sodium": 4.0,
   "iron": 0.0,
   "calcium": 2.0,
   "vitaminC": 0.0,
   "potassium": 2.0
  },
  "servings": [
   {
    "label": "1 can (330 ml)",
    "grams": 340.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "biscuit_plain",
  "name": "Biscuit, plain (glucose / Marie)",
  "aliases": [
   "biscuit",
   "parle g",
   "marie"
  ],
  "category": "Snacks",
  "diet": "vegetarian",
  "allergens": [
   "gluten",
   "milk"
  ],
  "per100": {
   "kcal": 430.0,
   "protein": 7.0,
   "fat": 10.0,
   "carbs": 76.0,
   "fiber": 2.5,
   "sodium": 400.0,
   "iron": 1.5,
   "calcium": 40.0,
   "vitaminC": 0.0,
   "potassium": 100.0
  },
  "servings": [
   {
    "label": "1 biscuit (7 g)",
    "grams": 7.0
   },
   {
    "label": "4 biscuits",
    "grams": 28.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "potato_chips",
  "name": "Potato chips",
  "aliases": [
   "chips",
   "wafers",
   "crisps"
  ],
  "category": "Snacks",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 536.0,
   "protein": 7.0,
   "fat": 34.6,
   "carbs": 52.9,
   "fiber": 4.8,
   "sodium": 525.0,
   "iron": 1.3,
   "calcium": 24.0,
   "vitaminC": 19.0,
   "potassium": 1196.0
  },
  "servings": [
   {
    "label": "1 small pack (28 g)",
    "grams": 28.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "dark_chocolate",
  "name": "Dark chocolate (70%)",
  "aliases": [
   "chocolate"
  ],
  "category": "Snacks",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 598.0,
   "protein": 7.8,
   "fat": 42.6,
   "carbs": 45.9,
   "fiber": 10.9,
   "sodium": 20.0,
   "iron": 11.9,
   "calcium": 73.0,
   "vitaminC": 0.0,
   "potassium": 715.0
  },
  "servings": [
   {
    "label": "2 squares (20 g)",
    "grams": 20.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "ice_cream",
  "name": "Ice cream, vanilla",
  "aliases": [],
  "category": "Snacks",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 207.0,
   "protein": 3.5,
   "fat": 11.0,
   "carbs": 23.6,
   "fiber": 0.7,
   "sodium": 80.0,
   "iron": 0.1,
   "calcium": 128.0,
   "vitaminC": 0.6,
   "potassium": 199.0
  },
  "servings": [
   {
    "label": "1 scoop (65 g)",
    "grams": 65.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "popcorn",
  "name": "Popcorn, air-popped",
  "aliases": [],
  "category": "Snacks",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 387.0,
   "protein": 12.9,
   "fat": 4.5,
   "carbs": 77.8,
   "fiber": 14.5,
   "sodium": 8.0,
   "iron": 3.2,
   "calcium": 7.0,
   "vitaminC": 0.0,
   "potassium": 329.0
  },
  "servings": [
   {
    "label": "3 cups (24 g)",
    "grams": 24.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "dal_tadka",
  "name": "Dal tadka (home-style)",
  "aliases": [
   "dal fry",
   "dal",
   "dal tadka"
  ],
  "category": "Indian dishes",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 98.0,
   "protein": 5.2,
   "fat": 3.4,
   "carbs": 12.4,
   "fiber": 3.2,
   "sodium": 330.0,
   "iron": 1.6,
   "calcium": 28.0,
   "vitaminC": 2.0,
   "potassium": 230.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   },
   {
    "label": "1 bowl (250 g)",
    "grams": 250.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "rajma_masala",
  "name": "Rajma masala",
  "aliases": [
   "rajma curry"
  ],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 118.0,
   "protein": 5.6,
   "fat": 4.2,
   "carbs": 15.4,
   "fiber": 4.3,
   "sodium": 360.0,
   "iron": 2.0,
   "calcium": 40.0,
   "vitaminC": 3.0,
   "potassium": 300.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "chole_masala",
  "name": "Chole masala",
  "aliases": [
   "chana masala",
   "chhole"
  ],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 140.0,
   "protein": 6.2,
   "fat": 5.5,
   "carbs": 17.5,
   "fiber": 5.0,
   "sodium": 380.0,
   "iron": 2.2,
   "calcium": 50.0,
   "vitaminC": 3.0,
   "potassium": 300.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "palak_paneer",
  "name": "Palak paneer",
  "aliases": [],
  "category": "Indian dishes",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 136.0,
   "protein": 6.5,
   "fat": 10.5,
   "carbs": 4.7,
   "fiber": 1.5,
   "sodium": 230.0,
   "iron": 1.4,
   "calcium": 150.0,
   "vitaminC": 8.0,
   "potassium": 330.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "paneer_butter_masala",
  "name": "Paneer butter masala",
  "aliases": [
   "shahi paneer",
   "paneer makhani"
  ],
  "category": "Indian dishes",
  "diet": "vegetarian",
  "allergens": [
   "milk",
   "nuts"
  ],
  "per100": {
   "kcal": 190.0,
   "protein": 7.5,
   "fat": 15.5,
   "carbs": 6.0,
   "fiber": 1.0,
   "sodium": 400.0,
   "iron": 0.9,
   "calcium": 110.0,
   "vitaminC": 3.0,
   "potassium": 190.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "aloo_gobi",
  "name": "Aloo gobi",
  "aliases": [],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 85.0,
   "protein": 2.2,
   "fat": 4.2,
   "carbs": 10.0,
   "fiber": 2.3,
   "sodium": 280.0,
   "iron": 0.7,
   "calcium": 25.0,
   "vitaminC": 22.0,
   "potassium": 310.0
  },
  "servings": [
   {
    "label": "1 katori (120 g)",
    "grams": 120.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "bhindi_masala",
  "name": "Bhindi masala",
  "aliases": [
   "bhindi fry",
   "okra curry"
  ],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 90.0,
   "protein": 2.0,
   "fat": 5.5,
   "carbs": 8.7,
   "fiber": 3.2,
   "sodium": 290.0,
   "iron": 0.8,
   "calcium": 70.0,
   "vitaminC": 14.0,
   "potassium": 270.0
  },
  "servings": [
   {
    "label": "1 katori (100 g)",
    "grams": 100.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "baingan_bharta",
  "name": "Baingan bharta",
  "aliases": [],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 85.0,
   "protein": 1.8,
   "fat": 5.2,
   "carbs": 8.3,
   "fiber": 3.0,
   "sodium": 260.0,
   "iron": 0.6,
   "calcium": 20.0,
   "vitaminC": 5.0,
   "potassium": 200.0
  },
  "servings": [
   {
    "label": "1 katori (120 g)",
    "grams": 120.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "mixed_veg_curry",
  "name": "Mixed vegetable curry",
  "aliases": [
   "sabzi",
   "sabji",
   "veg curry"
  ],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 80.0,
   "protein": 2.4,
   "fat": 4.0,
   "carbs": 9.0,
   "fiber": 2.8,
   "sodium": 300.0,
   "iron": 0.8,
   "calcium": 28.0,
   "vitaminC": 10.0,
   "potassium": 250.0
  },
  "servings": [
   {
    "label": "1 katori (120 g)",
    "grams": 120.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "chicken_curry",
  "name": "Chicken curry (home-style)",
  "aliases": [
   "murgh curry",
   "chicken masala"
  ],
  "category": "Indian dishes",
  "diet": "nonveg",
  "allergens": [],
  "per100": {
   "kcal": 150.0,
   "protein": 13.5,
   "fat": 8.5,
   "carbs": 5.0,
   "fiber": 1.0,
   "sodium": 380.0,
   "iron": 1.2,
   "calcium": 28.0,
   "vitaminC": 3.0,
   "potassium": 230.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "butter_chicken",
  "name": "Butter chicken",
  "aliases": [
   "murgh makhani"
  ],
  "category": "Indian dishes",
  "diet": "nonveg",
  "allergens": [
   "milk",
   "nuts"
  ],
  "per100": {
   "kcal": 180.0,
   "protein": 12.5,
   "fat": 12.5,
   "carbs": 6.5,
   "fiber": 0.8,
   "sodium": 450.0,
   "iron": 0.9,
   "calcium": 50.0,
   "vitaminC": 3.0,
   "potassium": 230.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "egg_curry",
  "name": "Egg curry",
  "aliases": [
   "anda curry"
  ],
  "category": "Indian dishes",
  "diet": "egg",
  "allergens": [
   "egg"
  ],
  "per100": {
   "kcal": 130.0,
   "protein": 8.5,
   "fat": 9.0,
   "carbs": 4.5,
   "fiber": 1.0,
   "sodium": 370.0,
   "iron": 1.2,
   "calcium": 48.0,
   "vitaminC": 3.0,
   "potassium": 180.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "fish_curry",
  "name": "Fish curry",
  "aliases": [
   "machli curry"
  ],
  "category": "Indian dishes",
  "diet": "nonveg",
  "allergens": [
   "fish"
  ],
  "per100": {
   "kcal": 120.0,
   "protein": 12.0,
   "fat": 6.5,
   "carbs": 3.5,
   "fiber": 0.8,
   "sodium": 350.0,
   "iron": 0.9,
   "calcium": 40.0,
   "vitaminC": 3.0,
   "potassium": 300.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "mutton_curry",
  "name": "Mutton curry",
  "aliases": [
   "gosht curry",
   "mutton masala"
  ],
  "category": "Indian dishes",
  "diet": "nonveg",
  "allergens": [],
  "per100": {
   "kcal": 170.0,
   "protein": 15.0,
   "fat": 11.0,
   "carbs": 3.0,
   "fiber": 0.8,
   "sodium": 420.0,
   "iron": 2.2,
   "calcium": 25.0,
   "vitaminC": 2.0,
   "potassium": 290.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "sambar",
  "name": "Sambar",
  "aliases": [],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 55.0,
   "protein": 2.8,
   "fat": 1.8,
   "carbs": 7.5,
   "fiber": 2.2,
   "sodium": 330.0,
   "iron": 1.2,
   "calcium": 35.0,
   "vitaminC": 4.0,
   "potassium": 230.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "rasam",
  "name": "Rasam",
  "aliases": [],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 25.0,
   "protein": 0.9,
   "fat": 0.8,
   "carbs": 3.6,
   "fiber": 0.7,
   "sodium": 300.0,
   "iron": 0.5,
   "calcium": 15.0,
   "vitaminC": 6.0,
   "potassium": 120.0
  },
  "servings": [
   {
    "label": "1 katori (150 g)",
    "grams": 150.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "idli",
  "name": "Idli",
  "aliases": [
   "idly"
  ],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 130.0,
   "protein": 4.0,
   "fat": 0.4,
   "carbs": 27.0,
   "fiber": 0.9,
   "sodium": 260.0,
   "iron": 0.9,
   "calcium": 12.0,
   "vitaminC": 0.0,
   "potassium": 60.0
  },
  "servings": [
   {
    "label": "1 idli (40 g)",
    "grams": 40.0
   },
   {
    "label": "2 idlis",
    "grams": 80.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "dosa_plain",
  "name": "Dosa, plain",
  "aliases": [
   "dosai"
  ],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 168.0,
   "protein": 3.9,
   "fat": 3.7,
   "carbs": 29.5,
   "fiber": 1.2,
   "sodium": 260.0,
   "iron": 1.2,
   "calcium": 15.0,
   "vitaminC": 0.0,
   "potassium": 80.0
  },
  "servings": [
   {
    "label": "1 dosa (80 g)",
    "grams": 80.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "masala_dosa",
  "name": "Masala dosa (potato filling)",
  "aliases": [],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 175.0,
   "protein": 3.6,
   "fat": 6.0,
   "carbs": 26.0,
   "fiber": 1.8,
   "sodium": 330.0,
   "iron": 1.0,
   "calcium": 18.0,
   "vitaminC": 6.0,
   "potassium": 260.0
  },
  "servings": [
   {
    "label": "1 dosa (180 g)",
    "grams": 180.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "upma",
  "name": "Upma",
  "aliases": [
   "uppittu"
  ],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [
   "gluten"
  ],
  "per100": {
   "kcal": 120.0,
   "protein": 3.0,
   "fat": 4.0,
   "carbs": 18.0,
   "fiber": 1.5,
   "sodium": 330.0,
   "iron": 1.0,
   "calcium": 15.0,
   "vitaminC": 2.0,
   "potassium": 100.0
  },
  "servings": [
   {
    "label": "1 bowl (200 g)",
    "grams": 200.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "poha",
  "name": "Poha (with vegetables)",
  "aliases": [
   "aval",
   "flattened rice",
   "pohe"
  ],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 130.0,
   "protein": 2.6,
   "fat": 3.5,
   "carbs": 22.5,
   "fiber": 1.5,
   "sodium": 280.0,
   "iron": 2.0,
   "calcium": 15.0,
   "vitaminC": 3.0,
   "potassium": 100.0
  },
  "servings": [
   {
    "label": "1 plate (150 g)",
    "grams": 150.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "pav_bhaji",
  "name": "Pav bhaji (bhaji only)",
  "aliases": [
   "bhaji"
  ],
  "category": "Indian dishes",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 110.0,
   "protein": 2.5,
   "fat": 5.0,
   "carbs": 14.0,
   "fiber": 3.0,
   "sodium": 420.0,
   "iron": 1.2,
   "calcium": 40.0,
   "vitaminC": 12.0,
   "potassium": 330.0
  },
  "servings": [
   {
    "label": "1 serving (200 g)",
    "grams": 200.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "samosa",
  "name": "Samosa (fried, potato)",
  "aliases": [],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [
   "gluten"
  ],
  "per100": {
   "kcal": 262.0,
   "protein": 4.0,
   "fat": 17.0,
   "carbs": 24.0,
   "fiber": 2.5,
   "sodium": 350.0,
   "iron": 1.2,
   "calcium": 20.0,
   "vitaminC": 3.0,
   "potassium": 280.0
  },
  "servings": [
   {
    "label": "1 samosa (60 g)",
    "grams": 60.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "pakora",
  "name": "Pakora / bhajiya (fried)",
  "aliases": [
   "bhajiya",
   "pakoda",
   "fritters"
  ],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 280.0,
   "protein": 7.0,
   "fat": 19.0,
   "carbs": 22.0,
   "fiber": 3.0,
   "sodium": 400.0,
   "iron": 2.0,
   "calcium": 40.0,
   "vitaminC": 2.0,
   "potassium": 300.0
  },
  "servings": [
   {
    "label": "4 pieces (60 g)",
    "grams": 60.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "chicken_biryani",
  "name": "Chicken biryani",
  "aliases": [
   "biryani",
   "dum biryani"
  ],
  "category": "Indian dishes",
  "diet": "nonveg",
  "allergens": [],
  "per100": {
   "kcal": 165.0,
   "protein": 9.0,
   "fat": 6.5,
   "carbs": 18.5,
   "fiber": 0.8,
   "sodium": 330.0,
   "iron": 1.1,
   "calcium": 22.0,
   "vitaminC": 1.0,
   "potassium": 170.0
  },
  "servings": [
   {
    "label": "1 plate (300 g)",
    "grams": 300.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "veg_biryani",
  "name": "Veg biryani",
  "aliases": [
   "vegetable biryani"
  ],
  "category": "Indian dishes",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 150.0,
   "protein": 3.2,
   "fat": 5.5,
   "carbs": 22.0,
   "fiber": 1.8,
   "sodium": 300.0,
   "iron": 1.0,
   "calcium": 22.0,
   "vitaminC": 3.0,
   "potassium": 160.0
  },
  "servings": [
   {
    "label": "1 plate (300 g)",
    "grams": 300.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "veg_pulao",
  "name": "Veg pulao",
  "aliases": [
   "pulav",
   "pulao"
  ],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 140.0,
   "protein": 3.0,
   "fat": 4.5,
   "carbs": 22.0,
   "fiber": 1.5,
   "sodium": 280.0,
   "iron": 0.9,
   "calcium": 20.0,
   "vitaminC": 3.0,
   "potassium": 120.0
  },
  "servings": [
   {
    "label": "1 plate (250 g)",
    "grams": 250.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "khichdi",
  "name": "Khichdi (dal-rice)",
  "aliases": [
   "kichadi",
   "kichdi"
  ],
  "category": "Indian dishes",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 110.0,
   "protein": 3.8,
   "fat": 2.5,
   "carbs": 18.5,
   "fiber": 1.8,
   "sodium": 260.0,
   "iron": 1.2,
   "calcium": 18.0,
   "vitaminC": 1.0,
   "potassium": 120.0
  },
  "servings": [
   {
    "label": "1 bowl (250 g)",
    "grams": 250.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "curd_rice",
  "name": "Curd rice",
  "aliases": [
   "thayir sadam",
   "dahi chawal"
  ],
  "category": "Indian dishes",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 110.0,
   "protein": 3.2,
   "fat": 3.2,
   "carbs": 17.0,
   "fiber": 0.3,
   "sodium": 200.0,
   "iron": 0.2,
   "calcium": 70.0,
   "vitaminC": 0.0,
   "potassium": 100.0
  },
  "servings": [
   {
    "label": "1 bowl (200 g)",
    "grams": 200.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "dhokla",
  "name": "Dhokla",
  "aliases": [],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 160.0,
   "protein": 6.5,
   "fat": 4.5,
   "carbs": 24.0,
   "fiber": 2.0,
   "sodium": 520.0,
   "iron": 1.5,
   "calcium": 60.0,
   "vitaminC": 0.0,
   "potassium": 200.0
  },
  "servings": [
   {
    "label": "2 pieces (80 g)",
    "grams": 80.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "thepla",
  "name": "Methi thepla",
  "aliases": [
   "thepla"
  ],
  "category": "Indian dishes",
  "diet": "vegan",
  "allergens": [
   "gluten"
  ],
  "per100": {
   "kcal": 280.0,
   "protein": 8.0,
   "fat": 9.0,
   "carbs": 41.0,
   "fiber": 5.0,
   "sodium": 340.0,
   "iron": 3.0,
   "calcium": 45.0,
   "vitaminC": 3.0,
   "potassium": 300.0
  },
  "servings": [
   {
    "label": "1 thepla (45 g)",
    "grams": 45.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "gulab_jamun",
  "name": "Gulab jamun",
  "aliases": [],
  "category": "Sweets",
  "diet": "vegetarian",
  "allergens": [
   "milk",
   "gluten"
  ],
  "per100": {
   "kcal": 330.0,
   "protein": 5.0,
   "fat": 13.0,
   "carbs": 50.0,
   "fiber": 0.5,
   "sodium": 60.0,
   "iron": 0.5,
   "calcium": 100.0,
   "vitaminC": 0.0,
   "potassium": 150.0
  },
  "servings": [
   {
    "label": "1 piece (40 g)",
    "grams": 40.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "kheer",
  "name": "Rice kheer",
  "aliases": [
   "payasam",
   "payasa",
   "rice pudding"
  ],
  "category": "Sweets",
  "diet": "vegetarian",
  "allergens": [
   "milk",
   "nuts"
  ],
  "per100": {
   "kcal": 125.0,
   "protein": 3.2,
   "fat": 4.0,
   "carbs": 19.0,
   "fiber": 0.2,
   "sodium": 40.0,
   "iron": 0.2,
   "calcium": 100.0,
   "vitaminC": 0.0,
   "potassium": 150.0
  },
  "servings": [
   {
    "label": "1 katori (120 g)",
    "grams": 120.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "jalebi",
  "name": "Jalebi",
  "aliases": [],
  "category": "Sweets",
  "diet": "vegan",
  "allergens": [
   "gluten"
  ],
  "per100": {
   "kcal": 390.0,
   "protein": 2.0,
   "fat": 16.0,
   "carbs": 60.0,
   "fiber": 0.5,
   "sodium": 20.0,
   "iron": 0.6,
   "calcium": 20.0,
   "vitaminC": 0.0,
   "potassium": 90.0
  },
  "servings": [
   {
    "label": "1 piece (30 g)",
    "grams": 30.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "besan_laddu",
  "name": "Besan laddu",
  "aliases": [
   "laddoo",
   "ladoo"
  ],
  "category": "Sweets",
  "diet": "vegetarian",
  "allergens": [
   "milk"
  ],
  "per100": {
   "kcal": 470.0,
   "protein": 10.0,
   "fat": 25.0,
   "carbs": 55.0,
   "fiber": 5.0,
   "sodium": 30.0,
   "iron": 3.0,
   "calcium": 40.0,
   "vitaminC": 0.0,
   "potassium": 400.0
  },
  "servings": [
   {
    "label": "1 laddu (35 g)",
    "grams": 35.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "suji_halwa",
  "name": "Suji halwa",
  "aliases": [
   "sheera",
   "rava kesari"
  ],
  "category": "Sweets",
  "diet": "vegetarian",
  "allergens": [
   "milk",
   "gluten"
  ],
  "per100": {
   "kcal": 290.0,
   "protein": 3.5,
   "fat": 13.0,
   "carbs": 40.0,
   "fiber": 1.0,
   "sodium": 40.0,
   "iron": 0.8,
   "calcium": 25.0,
   "vitaminC": 0.0,
   "potassium": 60.0
  },
  "servings": [
   {
    "label": "1 katori (100 g)",
    "grams": 100.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "cheese_pizza",
  "name": "Pizza, cheese",
  "aliases": [],
  "category": "Global dishes",
  "diet": "vegetarian",
  "allergens": [
   "milk",
   "gluten"
  ],
  "per100": {
   "kcal": 266.0,
   "protein": 11.0,
   "fat": 10.0,
   "carbs": 33.0,
   "fiber": 2.3,
   "sodium": 598.0,
   "iron": 2.0,
   "calcium": 188.0,
   "vitaminC": 1.3,
   "potassium": 172.0
  },
  "servings": [
   {
    "label": "1 slice (107 g)",
    "grams": 107.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "french_fries",
  "name": "French fries",
  "aliases": [],
  "category": "Global dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 312.0,
   "protein": 3.4,
   "fat": 15.0,
   "carbs": 41.0,
   "fiber": 3.8,
   "sodium": 210.0,
   "iron": 0.8,
   "calcium": 10.0,
   "vitaminC": 4.7,
   "potassium": 579.0
  },
  "servings": [
   {
    "label": "1 medium (115 g)",
    "grams": 115.0
   }
  ],
  "source": "reference"
 },
 {
  "id": "mixed_salad",
  "name": "Mixed vegetable salad",
  "aliases": [
   "salad",
   "kachumber"
  ],
  "category": "Global dishes",
  "diet": "vegan",
  "allergens": [],
  "per100": {
   "kcal": 20.0,
   "protein": 1.0,
   "fat": 0.2,
   "carbs": 4.0,
   "fiber": 1.5,
   "sodium": 10.0,
   "iron": 0.5,
   "calcium": 20.0,
   "vitaminC": 10.0,
   "potassium": 200.0
  },
  "servings": [
   {
    "label": "1 bowl (150 g)",
    "grams": 150.0
   }
  ],
  "source": "dish"
 },
 {
  "id": "veg_fried_rice",
  "name": "Veg fried rice",
  "aliases": [
   "fried rice"
  ],
  "category": "Global dishes",
  "diet": "vegan",
  "allergens": [
   "soy"
  ],
  "per100": {
   "kcal": 160.0,
   "protein": 3.5,
   "fat": 5.5,
   "carbs": 24.0,
   "fiber": 1.2,
   "sodium": 400.0,
   "iron": 0.8,
   "calcium": 15.0,
   "vitaminC": 3.0,
   "potassium": 100.0
  },
  "servings": [
   {
    "label": "1 plate (250 g)",
    "grams": 250.0
   }
  ],
  "source": "dish"
 }
];
