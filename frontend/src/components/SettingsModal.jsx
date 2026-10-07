import { useState } from 'react';
import { X } from 'lucide-react';

const FIELDS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
];

export default function SettingsModal({ goals, onSave, onClose }) {
  const [form, setForm] = useState(goals);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-card border border-line rounded-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="settings-title" className="font-display text-lg font-semibold">
            Daily goals
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1 text-ink/40 hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-sm text-ink/70">{f.label}</span>
              <div className="relative mt-1">
                <input
                  type="number"
                  min="0"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: Number(e.target.value) })}
                  className="w-full bg-paper border border-line rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-leaf focus:ring-1 focus:ring-leaf"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/40">{f.unit}</span>
              </div>
            </label>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-leaf text-paper font-medium py-2.5 rounded-lg hover:bg-leaf-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save goals'}
          </button>
        </form>
      </div>
    </div>
  );
}
