import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  applyResolvedTheme,
  readStoredThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  /** User preference: light, dark, or follow system */
  theme: ThemePreference;
  /** Actually applied theme after resolving system preference */
  resolvedTheme: ResolvedTheme;
  setTheme: (preference: ThemePreference) => void;
  /** Quick toggle between light and dark (keeps explicit choice, not system) */
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  toggle: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => readStoredThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(readStoredThemePreference()));

  const apply = useCallback((preference: ThemePreference) => {
    const resolved = resolveTheme(preference);
    setResolvedTheme(resolved);
    applyResolvedTheme(resolved);
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  }, []);

  useEffect(() => {
    apply(theme);
  }, [theme, apply]);

  useEffect(() => {
    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, apply]);

  const setTheme = useCallback((preference: ThemePreference) => {
    setThemeState(preference);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const current = resolveTheme(prev);
      return current === "dark" ? "light" : "dark";
    });
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggle }),
    [theme, resolvedTheme, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
