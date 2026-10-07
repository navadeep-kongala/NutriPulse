import { Moon, Sun, Settings, Activity } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Header({ onOpenSettings }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-line">
      <div className="max-w-5xl mx-auto px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className="text-leaf" size={26} strokeWidth={2.25} />
          <div>
            <h1 className="font-display text-2xl font-semibold leading-none tracking-tight">NutriPulse</h1>
            <p className="text-xs text-ink/60 mt-1">Search or snap a photo to see what&apos;s on your plate</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSettings}
            aria-label="Daily goals settings"
            className="p-2.5 rounded-lg hover:bg-leaf-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
          >
            <Settings size={19} />
          </button>
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2.5 rounded-lg hover:bg-leaf-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </div>
    </header>
  );
}
