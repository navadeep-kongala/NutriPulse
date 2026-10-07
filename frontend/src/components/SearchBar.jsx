import { useEffect, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { searchFoods } from '../api/client.js';

export default function SearchBar({ onAnalyze, loading }) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { results } = await searchFoods(value, 6);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function submit(query) {
    const q = (query ?? value).trim();
    if (!q) return;
    setShowSuggestions(false);
    onAnalyze(q);
  }

  return (
    <div ref={containerRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" size={18} />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder="150g grilled chicken breast, 2 eggs…"
          className="w-full h-full bg-card border border-line rounded-xl py-3.5 pl-11 pr-[4.75rem] text-[15px] placeholder:text-ink/35 focus:outline-none focus:border-leaf focus:ring-1 focus:ring-leaf transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          aria-label="Analyze food"
          className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 rounded-lg bg-leaf text-paper text-sm font-medium hover:bg-leaf-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : 'Go'}
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full bg-card border border-line rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setValue(s.name);
                  submit(s.name);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-leaf-tint transition-colors flex items-center justify-between gap-3"
              >
                <span className="truncate">{s.name}</span>
                <span className="text-xs text-ink/40 tabular-nums shrink-0">{s.per100g.calories} kcal/100g</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
