
import { useEffect, useState } from 'react';

const EMPTY_NUTRITION = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sugar_g: 0,
  sodium_mg: 0,
};

export default function NutritionFactsPanel({ result, onAddToLog }) {
  const [weight, setWeight] = useState('');

  useEffect(() => {
    setWeight('');
  }, [result?.key]);

  if (!result?.items?.length) {
    return null;
  }

  const item = result.items[0];

  /*
   * IMPORTANT:
   *
   * We need nutrition information for the food.
   *
   * If your backend/API already has nutrition data for this food,
   * use that data here.
   *
   * The calculation below assumes the nutrition values returned
   * by your API are PER 100 GRAMS.
   */

  const grams = Number(weight);

  const nutritionPer100g = item.nutrition || EMPTY_NUTRITION;

  const multiplier =
    Number.isFinite(grams) && grams > 0
      ? grams / 100
      : 0;

  const nutrition = {
    calories: nutritionPer100g.calories * multiplier,
    protein_g: nutritionPer100g.protein_g * multiplier,
    carbs_g: nutritionPer100g.carbs_g * multiplier,
    fat_g: nutritionPer100g.fat_g * multiplier,
    fiber_g: nutritionPer100g.fiber_g * multiplier,
    sugar_g: nutritionPer100g.sugar_g * multiplier,
    sodium_mg: nutritionPer100g.sodium_mg * multiplier,
  };

  async function handleAdd() {
    if (!grams || grams <= 0) {
      return;
    }

    await onAddToLog({
      ...item,
      grams,
      nutrition,
    });
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-wide opacity-60">
          Detected food
        </p>

        <h2 className="text-xl font-semibold">
          {item.name}
        </h2>
      </div>

      {/* Weight input */}
      <div className="mb-5">
        <label
          htmlFor="food-weight"
          className="block text-sm font-medium mb-2"
        >
          Enter food weight
        </label>

        <div className="flex items-center gap-2">
          <input
            id="food-weight"
            type="number"
            min="1"
            step="1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Example: 250"
            className="w-full rounded-lg border border-black/20 px-3 py-2.5 outline-none focus:border-black"
          />

          <span className="text-sm font-medium">
            grams
          </span>
        </div>

        <p className="text-xs opacity-60 mt-1">
          Enter the actual weight of the food portion.
        </p>
      </div>

      {/* Nutrition */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NutritionValue
          label="Calories"
          value={nutrition.calories}
          unit="kcal"
        />

        <NutritionValue
          label="Protein"
          value={nutrition.protein_g}
          unit="g"
        />

        <NutritionValue
          label="Carbs"
          value={nutrition.carbs_g}
          unit="g"
        />

        <NutritionValue
          label="Fat"
          value={nutrition.fat_g}
          unit="g"
        />

        <NutritionValue
          label="Fiber"
          value={nutrition.fiber_g}
          unit="g"
        />

        <NutritionValue
          label="Sugar"
          value={nutrition.sugar_g}
          unit="g"
        />

        <NutritionValue
          label="Sodium"
          value={nutrition.sodium_mg}
          unit="mg"
        />
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!grams || grams <= 0}
        className="mt-5 w-full rounded-lg px-4 py-3 font-medium bg-black text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add to Daily Log
      </button>
    </div>
  );
}

function NutritionValue({ label, value, unit }) {
  return (
    <div className="rounded-lg bg-black/5 p-3">
      <p className="text-xs opacity-60">
        {label}
      </p>

      <p className="text-lg font-semibold">
        {Number(value || 0).toFixed(1)}
        <span className="text-xs ml-1 font-normal">
          {unit}
        </span>
      </p>
    </div>
  );
}
