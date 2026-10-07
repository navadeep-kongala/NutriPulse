import { Trash2 } from 'lucide-react';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyLog({ date, onDateChange, entries, onDelete, loading }) {
  const today = todayStr();

  return (
    <div className="bg-card border border-line rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="font-display font-semibold text-lg">Log</h2>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => onDateChange(e.target.value)}
          className="text-xs bg-transparent border border-line rounded-lg px-2 py-1.5 text-ink/70 focus:outline-none focus:border-leaf"
        />
      </div>

      {loading ? (
        <p className="text-sm text-ink/40 py-6 text-center">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-ink/40 py-6 text-center">
          Nothing logged {date === today ? 'yet today' : 'on this day'}.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {entries.map((e) => (
            <li key={e.id} className="py-2.5 flex items-center justify-between gap-3 group">
              <div className="min-w-0">
                <p className="text-sm truncate">{e.name}</p>
                <p className="text-xs text-ink/40 tabular-nums">
                  {e.grams ? `${e.grams}g · ` : ''}
                  {e.nutrition.calories} kcal
                </p>
              </div>
              <button
                onClick={() => onDelete(e.id)}
                aria-label={`Remove ${e.name}`}
                className="text-ink/30 hover:text-tomato transition-colors p-1 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
