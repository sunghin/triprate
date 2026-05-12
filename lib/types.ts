export type { CurrencyCode } from "./currencies";
import type { CurrencyCode } from "./currencies";

export type AppScreen = "setup" | "shortcut" | "practice";
export type UserDifficultyLevel = "easy" | "moderate";
export type FormulaDifficultyLevel = "easy" | "average" | "difficult";
export type DifficultyAvailability = Record<UserDifficultyLevel, boolean>;

export type SavedPair = {
  homeCurrency: CurrencyCode;
  localCurrency: CurrencyCode;
};

export type ExchangeRateQuote = {
  baseCurrency: CurrencyCode;
  quoteCurrency: CurrencyCode;
  rate: number;
  fetchedAt: string;
  source: "mock" | "live";
};

export type FormulaOperation =
  | { type: "shift"; places: number }
  | { type: "multiply"; value: number }
  | { type: "divide"; value: 2 | 4 | 6 | 8 | 10 }
  | {
      type: "percentAdjust";
      value: -50 | -40 | -30 | -20 | -10 | 10 | 20 | 30 | 40 | 50;
    }
  | { type: "add"; value: number }
  | { type: "subtract"; value: number };

export type FormulaExample = {
  amount: number;
  estimate: number;
  exact: number;
  difference: number;
  relativeError: number;
};

export type FormulaCandidate = {
  id: string;
  operations: FormulaOperation[];
  shortLabel: string;
  explanation: string;
  difficulty: FormulaDifficultyLevel;
  difficultyReason: string;
  operationCount: number;
  examples: FormulaExample[];
  averageError: number;
  averageRelativeError: number;
  simplicityPenalty: number;
  memorabilityPenalty: number;
  score: number;
};

export type ShortcutRecommendation = {
  quote: ExchangeRateQuote;
  candidatesByDifficulty: Record<FormulaDifficultyLevel, FormulaCandidate[]>;
  testAmounts: number[];
};
