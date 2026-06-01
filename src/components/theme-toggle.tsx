"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label="Toggle theme"
      aria-pressed={isDark}
      type="button"
    >
      <span className="theme-icon theme-icon-sun" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2" />
        </svg>
      </span>
      <span className="theme-icon theme-icon-moon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M20 14.8A8.5 8.5 0 1 1 9.2 4 7 7 0 1 0 20 14.8z" />
        </svg>
      </span>
      <span className="theme-thumb" aria-hidden="true" />
    </button>
  );
}
