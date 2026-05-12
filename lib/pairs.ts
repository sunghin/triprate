import { isCurrencyCode } from "./currencies";
import type { SavedPair } from "./types";

export function arePairsEqual(left: SavedPair, right: SavedPair) {
  return (
    left.homeCurrency === right.homeCurrency &&
    left.localCurrency === right.localCurrency
  );
}

export function isSavedPair(value: unknown): value is SavedPair {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SavedPair>;

  return (
    isCurrencyCode(candidate.homeCurrency) &&
    isCurrencyCode(candidate.localCurrency)
  );
}
