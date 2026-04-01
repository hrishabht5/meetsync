"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // On mount: read saved preference or system preference
  useEffect(() => {
    const saved = localStorage.getItem("meetsync_theme") as Theme | null;
    if (saved === "dark" || saved === "light") {
      apply(saved);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      apply("dark");
    } else {
      apply("light");
    }
  }, []);

  function apply(t: Theme) {
    setTheme(t);
    if (t === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("meetsync_theme", t);
  }

  const toggle = () => apply(theme === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
