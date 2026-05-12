import type { DifficultyAvailability, UserDifficultyLevel } from "@/lib/types";

type DifficultySelectorProps = {
  selectedDifficulty: UserDifficultyLevel;
  availability?: DifficultyAvailability;
  onChange: (difficulty: UserDifficultyLevel) => void;
};

const DIFFICULTY_OPTIONS: Array<{
  level: UserDifficultyLevel;
  label: string;
  hint: string;
}> = [
  { level: "easy", label: "Easy", hint: "Up to 2 friendly steps" },
  {
    level: "moderate",
    label: "Moderate",
    hint: "Extra effort for higher accuracy",
  },
];

export function DifficultySelector({
  selectedDifficulty,
  availability,
  onChange,
}: DifficultySelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Formula difficulty
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DIFFICULTY_OPTIONS.map((option) => {
          const isSelected = option.level === selectedDifficulty;
          const isAvailable = availability ? availability[option.level] : true;

          return (
            <button
              key={option.level}
              type="button"
              disabled={!isAvailable}
              onClick={() => onChange(option.level)}
              className={`min-h-14 rounded-3xl border px-3 py-2 text-left transition ${
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border)] bg-[var(--card-strong)] text-[var(--accent-strong)]"
              } ${isAvailable ? "" : "opacity-40"}`}
            >
              <span className="block text-[15px] font-semibold">
                {option.label}
              </span>
              <span
                className={`mt-1 block text-xs leading-5 ${
                  isSelected ? "text-white/78" : "text-[var(--muted)]"
                }`}
              >
                {isAvailable ? option.hint : "Not useful for this pair"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
