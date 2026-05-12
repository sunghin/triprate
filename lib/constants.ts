import type { SavedPair } from "./types";

export const DEFAULT_PAIR: SavedPair = {
  homeCurrency: "USD",
  localCurrency: "JPY",
};

export const BASE_SHOPPING_AMOUNTS = [1, 5, 10, 20, 50, 100, 200, 500];

export const STORAGE_KEY = "triprate:last-pair";

export function getEvaluationAmounts(rate: number) {
  let scale = 1;

  if (rate < 0.001) {
    scale = 1000;
  } else if (rate < 0.01) {
    scale = 100;
  } else if (rate < 0.1) {
    scale = 10;
  }

  return BASE_SHOPPING_AMOUNTS.map((amount) => amount * scale);
}
