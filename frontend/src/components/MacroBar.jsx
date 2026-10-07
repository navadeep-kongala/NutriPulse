export default function MacroBar({ nutrition, compact = false }) {
  const proteinKcal = (nutrition.protein_g || 0) * 4;
  const carbsKcal = (nutrition.carbs_g || 0) * 4;
  const fatKcal = (nutrition.fat_g || 0) * 9;
  const total = proteinKcal + carbsKcal + fatKcal || 1;

  const p = Math.round((proteinKcal / total) * 100);
  const c = Math.round((carbsKcal / total) * 100);
  const f = Math.max(0, 100 - p - c);

  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-line">
        {p > 0 && <div style={{ width: `${p}%` }} className="bg-leaf" title={`Protein ${p}%`} />}
        {c > 0 && <div style={{ width: `${c}%` }} className="bg-citrus" title={`Carbs ${c}%`} />}
        {f > 0 && <div style={{ width: `${f}%` }} className="bg-tomato" title={`Fat ${f}%`} />}
      </div>
      {!compact && (
        <div className="flex gap-4 mt-2 text-xs text-ink/60">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-leaf inline-block" />
            Protein {p}%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-citrus inline-block" />
            Carbs {c}%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-tomato inline-block" />
            Fat {f}%
          </span>
        </div>
      )}
    </div>
  );
}
