"use client";
import { useTheme } from "./themeProvider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  if (compact) {
    return (
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all
          bg-[var(--bg-card-hover)] hover:bg-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]
          ring-1 ring-[var(--border)]"
      >
        {isDark ? "☀️" : "🌙"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all w-full
        text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent)]/8"
    >
      <span className="text-base">{isDark ? "☀️" : "🌙"}</span>
      {isDark ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
