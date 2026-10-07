import { useState } from 'react';
import { Plus, Check, Sparkles } from 'lucide-react';

const NUTRIENT_ROWS = [
  { key: 'fat_g', label: 'Total Fat', unit: 'g', indent: false },
  { key: 'carbs_g', label: 'Total Carbohydrate', unit: 'g', indent: false },
  { key: 'fiber_g', label: 'Dietary Fiber', unit: 'g', indent: true },
  { key: 'sugar_g', label: 'Total Sugars', unit: 'g', indent: true },
  { key: 'protein_g', label: 'Protein', unit: 'g', indent: false },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg', indent: false },
];

function FactsCard({ item, onAdd }) {
  const [added, setAdded] = useState(false);
  const n = item.nutrition;

  function handleAdd() {
    onAdd(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="border-[3px] border-ink rounded-sm px-5 py-4 bg-card">
      <h3 className="font-display text-2xl font-bold leading-none">Nutrition Facts</h3>
      <div className="h-1.5 bg-ink my-2" />

      <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
        <span className="font-medium truncate">{item.name}</span>
        <span className="text-ink/60 tabular-nums shrink-0">{item.grams}g</span>
      </div>

      {item.source === 'estimated' && (
        <div className="flex items-center gap-1 text-[11px] text-citrus mb-1">
          <Sparkles size={11} /> AI-estimated — not in the local database
        </div>
      )}

      <div className="h-px bg-line my-2" />

      <div className="flex items-end justify-between mb-1">
        <span className="font-display text-sm font-semibold">Calories</span>
        <span className="font-display text-4xl font-bold tabular-nums">{n.calories}</span>
      </div>
      <div className="h-2 bg-ink my-2" />

      {NUTRIENT_ROWS.map((row) => (
        <div
          key={row.key}
          className={`flex items-center justify-between py-1 text-sm border-b border-line ${
            row.indent ? 'pl-4 text-ink/70' : 'font-medium'
          }`}
        >
          <span>{row.label}</span>
          <span className="tabular-nums">
            {n[row.key]}
            {row.unit}
          </span>
        </div>
      ))}

      <button
        onClick={handleAdd}
        className="mt-4 w-full flex items-center justify-center gap-1.5 bg-leaf text-paper text-sm font-medium py-2.5 rounded-lg hover:bg-leaf-dark transition-colors"
      >
        {added ? <Check size={15} /> : <Plus size={15} />}
        {added ? 'Added to today' : "Add to today's log"}
      </button>
    </div>
  );
}

export default function NutritionFactsPanel({ result, onAddToLog }) {
  if (!result) {
    return (
      <div className="border border-dashed border-line rounded-xl px-5 py-14 text-center text-sm text-ink/40">
        Search a food or snap a photo to see its nutrition facts here.
      </div>
    );
  }

  return (
    <div key={result.key} className="space-y-4 animate-result-in">
      {result.approximate && (
        <p className="text-xs text-citrus bg-citrus/10 rounded-lg px-3 py-2">
          Portion size is approximate — specify a weight (e.g. "150g") for a more precise figure.
        </p>
      )}
      {result.items.map((item, i) => (
        <FactsCard key={i} item={item} onAdd={onAddToLog} />
      ))}
    </div>
  );
}
