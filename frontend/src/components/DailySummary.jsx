import MacroBar from './MacroBar.jsx';

function ProgressRow({ label, value, goal, unit, colorVar }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-ink/60">{label}</span>
        <span className="tabular-nums text-ink/60">
          {value}
          {unit} / {goal}
          {unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-line overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: `var(${colorVar})` }}
        />
      </div>
    </div>
  );
}

export default function DailySummary({ totals, goals }) {
  const remaining = Math.max(0, goals.calories - totals.calories);

  return (
    <div className="bg-card border border-line rounded-xl p-5 space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display font-semibold text-lg">Today</h2>
        <span className="text-xs text-ink/50 tabular-nums">{remaining} kcal left</span>
      </div>

      <div className="flex items-end gap-2">
        <span className="font-display text-3xl font-bold tabular-nums">{totals.calories}</span>
        <span className="text-ink/50 text-sm mb-1">/ {goals.calories} kcal</span>
      </div>

      <MacroBar nutrition={totals} />

      <div className="space-y-2.5 pt-1">
        <ProgressRow label="Protein" value={totals.protein_g} goal={goals.protein_g} unit="g" colorVar="--color-leaf" />
        <ProgressRow label="Carbs" value={totals.carbs_g} goal={goals.carbs_g} unit="g" colorVar="--color-citrus" />
        <ProgressRow label="Fat" value={totals.fat_g} goal={goals.fat_g} unit="g" colorVar="--color-tomato" />
      </div>
    </div>
  );
}
