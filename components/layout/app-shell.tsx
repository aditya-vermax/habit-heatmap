"use client";

import { Moon, Settings as SettingsIcon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useSettings, useToday } from "@/hooks/use-data";
import { APP_NAME } from "@/lib/config";
import { formatLong } from "@/lib/dates";

const SHEETS: Record<string, string> = { "/": "Today", "/habit": "Habit", "/settings": "Settings" };
const noop = () => () => {};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const today = useToday();
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const { settings, loaded, update } = useSettings();

  // Keep <html data-theme> and the pre-paint localStorage mirror in sync with the saved setting.
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    try {
      if (settings.theme === "system") {
        delete root.dataset.theme;
        localStorage.removeItem("hh-theme");
      } else {
        root.dataset.theme = settings.theme;
        localStorage.setItem("hh-theme", settings.theme);
      }
    } catch {
      /* storage blocked: the theme still applies for this session */
    }
  }, [loaded, settings.theme]);

  // Register the offline service worker, hand it the assets already loaded, and ask for durable storage.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => {
          const urls = performance
            .getEntriesByType("resource")
            .map((e) => e.name)
            .filter((u) => u.startsWith(location.origin));
          reg.active?.postMessage({ type: "CACHE_URLS", urls: [...urls, location.href] });
        })
        .catch(() => {});
    }
    void navigator.storage?.persist?.().catch(() => {});
  }, []);

  function toggleTheme() {
    const isDark =
      document.documentElement.dataset.theme === "dark" ||
      (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    void update({ theme: isDark ? "light" : "dark" });
  }

  const sheet = SHEETS[pathname] ?? "Sheet";

  return (
    <div className="sheet">
      <header className="titleblock">
        <div className="tb-name">
          <Link href="/">{APP_NAME}</Link>
        </div>
        <div className="tb-sheet">
          <span className="mono muted">Sheet</span>
          <strong>{sheet}</strong>
          <span className="mono muted" suppressHydrationWarning>
            {mounted ? formatLong(today) : "\u00a0"}
          </span>
        </div>
        <div className="tb-actions">
          <button
            type="button"
            className="btn btn-icon"
            onClick={toggleTheme}
            aria-label="Switch between light and dark theme"
          >
            <Sun size={18} aria-hidden="true" className="theme-sun" />
            <Moon size={18} aria-hidden="true" className="theme-moon" />
          </button>
          <Link href="/settings" className="btn btn-icon" aria-label="Settings">
            <SettingsIcon size={18} aria-hidden="true" />
          </Link>
        </div>
      </header>
      <main className="page">{children}</main>
      <footer className="footer mono">
        <span>Everything stays on this device.</span>
        <span>No account. No tracking.</span>
      </footer>
    </div>
  );
}
