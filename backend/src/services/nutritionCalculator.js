const FIELDS = ['protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g'];

// Scales a food's per-100g nutrition profile to an actual gram amount.
export function scaleNutrition(per100g, grams) {
  const factor = grams / 100;
  const scaled = { calories: Math.round(per100g.calories * factor) };
  for (const field of FIELDS) {
    scaled[field] = Math.round((per100g[field] ?? 0) * factor * 10) / 10;
  }
  scaled.sodium_mg = Math.round((per100g.sodium_mg ?? 0) * factor);
  return scaled;
}

export function sumNutrition(items) {
  const totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 };
  for (const item of items) {
    totals.calories += item.calories || 0;
    totals.protein_g += item.protein_g || 0;
    totals.carbs_g += item.carbs_g || 0;
    totals.fat_g += item.fat_g || 0;
    totals.fiber_g += item.fiber_g || 0;
    totals.sugar_g += item.sugar_g || 0;
    totals.sodium_mg += item.sodium_mg || 0;
  }
  totals.calories = Math.round(totals.calories);
  totals.protein_g = Math.round(totals.protein_g * 10) / 10;
  totals.carbs_g = Math.round(totals.carbs_g * 10) / 10;
  totals.fat_g = Math.round(totals.fat_g * 10) / 10;
  totals.fiber_g = Math.round(totals.fiber_g * 10) / 10;
  totals.sugar_g = Math.round(totals.sugar_g * 10) / 10;
  totals.sodium_mg = Math.round(totals.sodium_mg);
  return totals;
}

// Calories contributed by each macro, for the macro distribution bar.
// Uses the standard 4/4/9 kcal-per-gram approximation.
export function macroCalorieSplit({ protein_g = 0, carbs_g = 0, fat_g = 0 }) {
  const proteinKcal = protein_g * 4;
  const carbsKcal = carbs_g * 4;
  const fatKcal = fat_g * 9;
  const total = proteinKcal + carbsKcal + fatKcal;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((proteinKcal / total) * 100),
    carbs: Math.round((carbsKcal / total) * 100),
    fat: Math.round((fatKcal / total) * 100),
  };
}
