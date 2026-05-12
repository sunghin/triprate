import assert from "node:assert/strict";
import test from "node:test";
import { loadSavedPair, savePair } from "../lib/storage";
import { arePairsEqual } from "../lib/pairs";
import {
  buildShortcutRecommendation,
  compareBySimplicity,
  resolveShortcutForDifficulty,
  selectBestCandidate,
} from "../lib/formulas/build-shortcut";
import type { FormulaCandidate, SavedPair } from "../lib/types";

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

function mockWindow() {
  const storage = new MemoryStorage();
  const windowMock = {
    localStorage: storage,
  } as unknown as Window & typeof globalThis;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowMock,
  });

  return storage;
}

function buildCandidate(
  overrides: Partial<FormulaCandidate> = {},
): FormulaCandidate {
  return {
    id: "candidate",
    operations: [],
    shortLabel: "candidate",
    explanation: "candidate",
    difficulty: "easy",
    difficultyReason: "test candidate",
    operationCount: 1,
    examples: [],
    averageError: 0,
    averageRelativeError: 0,
    simplicityPenalty: 0,
    memorabilityPenalty: 0,
    score: 0,
    ...overrides,
  };
}

test("loadSavedPair returns null and clears unsupported stored currencies", () => {
  const storage = mockWindow();
  storage.setItem(
    "triprate:last-pair",
    JSON.stringify({
      homeCurrency: "USD",
      localCurrency: "ZZZ",
    }),
  );

  assert.equal(loadSavedPair(), null);
  assert.equal(storage.getItem("triprate:last-pair"), null);
});

test("savePair and loadSavedPair round-trip a valid pair", () => {
  mockWindow();
  const pair: SavedPair = {
    homeCurrency: "USD",
    localCurrency: "JPY",
  };

  savePair(pair);

  assert.deepEqual(loadSavedPair(), pair);
});

test("near-parity rates can resolve to the 1:1 shortcut in easy mode", () => {
  const recommendation = buildShortcutRecommendation({
    baseCurrency: "EUR",
    quoteCurrency: "USD",
    rate: 1.02,
    fetchedAt: "2026-01-01T00:00:00.000Z",
    source: "mock",
  });

  const resolved = resolveShortcutForDifficulty(recommendation, "easy");

  assert.equal(resolved.best.shortLabel, "1:1");
  assert.equal(resolved.best.operationCount, 0);
});

test("pair comparison only passes for an exact match", () => {
  assert.equal(
    arePairsEqual(
      { homeCurrency: "USD", localCurrency: "JPY" },
      { homeCurrency: "USD", localCurrency: "JPY" },
    ),
    true,
  );
  assert.equal(
    arePairsEqual(
      { homeCurrency: "USD", localCurrency: "JPY" },
      { homeCurrency: "JPY", localCurrency: "USD" },
    ),
    false,
  );
});

test("selectBestCandidate promotes a candidate that beats the baseline on miss and total difficulty", () => {
  const baseline = buildCandidate({
    id: "baseline",
    shortLabel: "x7",
    operationCount: 1,
    averageRelativeError: 0.033,
    simplicityPenalty: 1.7,
    memorabilityPenalty: 1.1,
  });
  const promoted = buildCandidate({
    id: "promoted",
    shortLabel: "x8 -> -10%",
    operationCount: 2,
    averageRelativeError: 0.005,
    simplicityPenalty: 1.4,
    memorabilityPenalty: 1.0,
  });

  const selected = selectBestCandidate(
    [baseline, promoted],
    compareBySimplicity,
  );

  assert.equal(selected?.id, promoted.id);
});

test("moderate mode suppresses redundant alternates", () => {
  const recommendation = buildShortcutRecommendation({
    baseCurrency: "USD",
    quoteCurrency: "EUR",
    rate: 0.92,
    fetchedAt: "2026-01-01T00:00:00.000Z",
    source: "mock",
  });

  const resolved = resolveShortcutForDifficulty(recommendation, "moderate");

  assert.equal(resolved.best.shortLabel, "/6 -> x5 -> +10%");
  assert.deepEqual(resolved.alternates, []);
});

test("easy mode keeps a strong accuracy-versus-total-difficulty alternate", () => {
  const recommendation = buildShortcutRecommendation({
    baseCurrency: "USD",
    quoteCurrency: "CNY",
    rate: 7.24,
    fetchedAt: "2026-01-01T00:00:00.000Z",
    source: "mock",
  });

  const resolved = resolveShortcutForDifficulty(recommendation, "easy");

  assert.equal(resolved.best.shortLabel, "x7");
  assert.deepEqual(
    resolved.alternates.map((candidate) => candidate.shortLabel),
    ["x8 -> -10%"],
  );
});
