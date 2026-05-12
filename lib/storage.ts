import { STORAGE_KEY } from "./constants";
import { isSavedPair } from "./pairs";
import type { SavedPair } from "./types";

export function loadSavedPair(): SavedPair | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isSavedPair(parsedValue)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

export function savePair(pair: SavedPair) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pair));
  } catch {
    // Ignore storage failures and keep the app usable.
  }
}
