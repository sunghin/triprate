import type { AppScreen } from "@/lib/types";

type ScreenTabsProps = {
  activeScreen: AppScreen;
  hasShortcut: boolean;
  onChange: (screen: AppScreen) => void;
};

const SCREENS: Array<{
  key: AppScreen;
  label: string;
  requiresShortcut: boolean;
}> = [
  { key: "setup", label: "Setup", requiresShortcut: false },
  { key: "shortcut", label: "Formula", requiresShortcut: true },
  { key: "practice", label: "Practice", requiresShortcut: true },
];

export function ScreenTabs({
  activeScreen,
  hasShortcut,
  onChange,
}: ScreenTabsProps) {
  return (
    <nav className="grid grid-cols-3 gap-2 rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-2 shadow-[var(--shadow)] backdrop-blur">
      {SCREENS.map((screen) => {
        const isActive = screen.key === activeScreen;
        const isDisabled = screen.requiresShortcut && !hasShortcut;

        return (
          <button
            key={screen.key}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(screen.key)}
            className={`min-h-12 rounded-2xl px-3 text-[15px] font-semibold transition ${
              isActive
                ? "bg-[var(--accent)] text-white"
                : "bg-transparent text-[var(--accent-strong)]"
            } ${isDisabled ? "opacity-45" : ""}`}
          >
            {screen.label}
          </button>
        );
      })}
    </nav>
  );
}
