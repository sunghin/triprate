import { DifficultySelector } from "@/components/difficulty-selector";
import { CurrencySelect } from "@/components/currency-select";
import { SectionCard } from "@/components/section-card";
import type {
  CurrencyCode,
  DifficultyAvailability,
  UserDifficultyLevel,
} from "@/lib/types";

type SetupScreenProps = {
  homeCurrency: CurrencyCode;
  localCurrency: CurrencyCode;
  difficultyLevel: UserDifficultyLevel;
  difficultyAvailability?: DifficultyAvailability;
  isLoading: boolean;
  onDifficultyChange: (difficulty: UserDifficultyLevel) => void;
  onHomeCurrencyChange: (currency: CurrencyCode) => void;
  onLocalCurrencyChange: (currency: CurrencyCode) => void;
  onGenerate: () => void;
};

export function SetupScreen({
  homeCurrency,
  localCurrency,
  difficultyLevel,
  difficultyAvailability,
  isLoading,
  onDifficultyChange,
  onHomeCurrencyChange,
  onLocalCurrencyChange,
  onGenerate,
}: SetupScreenProps) {
  const sameCurrency = homeCurrency === localCurrency;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Pick your currency pair"
        description="Choose the currency you see in local stores and the home currency you think in."
      >
        <div className="space-y-4">
          <CurrencySelect
            id="local-currency"
            label="Currency in local stores"
            value={localCurrency}
            onChange={onLocalCurrencyChange}
          />
          <CurrencySelect
            id="home-currency"
            label="Your home currency"
            value={homeCurrency}
            onChange={onHomeCurrencyChange}
          />
          <DifficultySelector
            selectedDifficulty={difficultyLevel}
            availability={difficultyAvailability}
            onChange={onDifficultyChange}
          />
          <button
            type="button"
            onClick={onGenerate}
            disabled={sameCurrency || isLoading}
            className="min-h-14 w-full rounded-3xl bg-[var(--accent)] px-5 text-[17px] font-semibold text-white transition disabled:opacity-50"
          >
            {isLoading ? "Building formula..." : "Generate formula"}
          </button>
          {sameCurrency ? (
            <p className="text-sm leading-6 text-[var(--muted)]">
              Pick two different currencies to generate a formula.
            </p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="How TripRate works"
        description="TripRate looks for a formula you can keep in your head for your entire overseas trip."
      >
        <ul className="space-y-3 text-[15px] leading-6 text-[var(--accent-strong)]">
          <li>1. We fetch the current conversion rate for your pair.</li>
          <li>2. We test simple formulas for common shopping amounts.</li>
          <li>3. We balance between speed, simplicity and accuracy.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
