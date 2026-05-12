"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { PracticeScreen } from "@/components/practice-screen";
import { ScreenTabs } from "@/components/screen-tabs";
import { SetupScreen } from "@/components/setup-screen";
import { ShortcutScreen } from "@/components/shortcut-screen";
import { DEFAULT_PAIR } from "@/lib/constants";
import {
  buildShortcutRecommendation,
  getDifficultyAvailability,
  resolveShortcutForDifficulty,
} from "@/lib/formulas/build-shortcut";
import { arePairsEqual } from "@/lib/pairs";
import { loadSavedPair, savePair } from "@/lib/storage";
import type {
  AppScreen,
  CurrencyCode,
  FormulaCandidate,
  SavedPair,
  ShortcutRecommendation,
  UserDifficultyLevel,
} from "@/lib/types";
import { rateService } from "@/services/rate-service";

async function fetchRecommendation(pair: SavedPair) {
  const quote = await rateService.getExchangeRate(
    pair.localCurrency,
    pair.homeCurrency,
  );

  return buildShortcutRecommendation(quote);
}

export function TripRateApp() {
  const [homeCurrency, setHomeCurrency] = useState<CurrencyCode>(
    DEFAULT_PAIR.homeCurrency,
  );
  const [localCurrency, setLocalCurrency] = useState<CurrencyCode>(
    DEFAULT_PAIR.localCurrency,
  );
  const [activeScreen, setActiveScreen] = useState<AppScreen>("setup");
  const [difficultyLevel, setDifficultyLevel] =
    useState<UserDifficultyLevel>("easy");
  const [recommendation, setRecommendation] =
    useState<ShortcutRecommendation | null>(null);
  const [selectedFormulaId, setSelectedFormulaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedPair = useMemo(
    () => ({ homeCurrency, localCurrency }),
    [homeCurrency, localCurrency],
  );
  const selectedPairRef = useRef(selectedPair);
  const requestIdRef = useRef(0);

  useEffect(() => {
    selectedPairRef.current = selectedPair;
  }, [selectedPair]);

  useEffect(() => {
    const savedPair = loadSavedPair();

    if (!savedPair) {
      return;
    }

    selectedPairRef.current = savedPair;
    setHomeCurrency(savedPair.homeCurrency);
    setLocalCurrency(savedPair.localCurrency);
    void generateShortcut(savedPair, "shortcut", {
      failureMessage: "TripRate could not load your saved currency pair.",
    });
  }, []);

  const isRecommendationCurrent =
    recommendation?.quote.baseCurrency === localCurrency &&
    recommendation.quote.quoteCurrency === homeCurrency;

  const resolvedFormulaSet = useMemo(() => {
    if (!recommendation || !isRecommendationCurrent) {
      return null;
    }

    return resolveShortcutForDifficulty(recommendation, difficultyLevel);
  }, [difficultyLevel, isRecommendationCurrent, recommendation]);

  useEffect(() => {
    setSelectedFormulaId(null);
  }, [
    difficultyLevel,
    recommendation?.quote.baseCurrency,
    recommendation?.quote.quoteCurrency,
  ]);

  const currentShortcut = useMemo(() => {
    if (!resolvedFormulaSet) {
      return null;
    }

    if (
      !selectedFormulaId ||
      selectedFormulaId === resolvedFormulaSet.best.id
    ) {
      return resolvedFormulaSet;
    }

    const selectedAlternate = resolvedFormulaSet.alternates.find(
      (candidate) => candidate.id === selectedFormulaId,
    );

    if (!selectedAlternate) {
      return resolvedFormulaSet;
    }

    const alternates: FormulaCandidate[] = [
      resolvedFormulaSet.best,
      ...resolvedFormulaSet.alternates.filter(
        (candidate) => candidate.id !== selectedAlternate.id,
      ),
    ];

    return {
      ...resolvedFormulaSet,
      best: selectedAlternate,
      alternates,
    };
  }, [resolvedFormulaSet, selectedFormulaId]);

  useEffect(() => {
    if (activeScreen === "setup" || isRecommendationCurrent) {
      return;
    }

    setActiveScreen("setup");
  }, [activeScreen, isRecommendationCurrent]);

  const difficultyAvailability = useMemo(() => {
    if (!recommendation || !isRecommendationCurrent) {
      return undefined;
    }

    return getDifficultyAvailability(recommendation);
  }, [isRecommendationCurrent, recommendation]);

  useEffect(() => {
    if (!difficultyAvailability) {
      return;
    }

    if (difficultyAvailability[difficultyLevel]) {
      return;
    }

    if (difficultyAvailability.easy) {
      setDifficultyLevel("easy");
      return;
    }

    if (difficultyAvailability.moderate) {
      setDifficultyLevel("moderate");
    }
  }, [difficultyAvailability, difficultyLevel]);

  async function generateShortcut(
    pair: SavedPair = selectedPairRef.current,
    nextScreen: AppScreen = "shortcut",
    options?: {
      failureMessage?: string;
    },
  ) {
    if (pair.homeCurrency === pair.localCurrency) {
      setErrorMessage("Choose two different currencies.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextRecommendation = await fetchRecommendation(pair);

      if (
        requestId !== requestIdRef.current ||
        !arePairsEqual(pair, selectedPairRef.current)
      ) {
        return;
      }

      setRecommendation(nextRecommendation);
      savePair(pair);

      startTransition(() => {
        setActiveScreen(nextScreen);
      });
    } catch {
      if (
        requestId !== requestIdRef.current ||
        !arePairsEqual(pair, selectedPairRef.current)
      ) {
        return;
      }

      setErrorMessage(
        options?.failureMessage ?? "TripRate could not load a rate for that pair.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }

  async function handleGenerate() {
    await generateShortcut({ homeCurrency, localCurrency });
  }

  async function handleSwap() {
    const nextHomeCurrency = localCurrency;
    const nextLocalCurrency = homeCurrency;

    setHomeCurrency(nextHomeCurrency);
    setLocalCurrency(nextLocalCurrency);

    await generateShortcut(
      {
        homeCurrency: nextHomeCurrency,
        localCurrency: nextLocalCurrency,
      },
      "shortcut",
    );
  }

  function handleScreenChange(screen: AppScreen) {
    if (screen !== "setup" && !isRecommendationCurrent) {
      return;
    }

    setActiveScreen(screen);
  }

  return (
    <main className="safe-page px-4 text-[17px] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col gap-4">
        <header className="px-1 pt-2">
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--accent-strong)]">
            TripRate
          </h1>
          <p className="mt-3 text-[16px] leading-7 text-[var(--muted)]">
            Memorize one simple arithmetic formula for your entire trip.
          </p>
        </header>

        <ScreenTabs
          activeScreen={activeScreen}
          hasShortcut={isRecommendationCurrent}
          onChange={handleScreenChange}
        />

        {errorMessage ? (
          <div className="rounded-3xl border border-[#f0c4c4] bg-[#fff2f2] px-4 py-3 text-[15px] leading-6 text-[#8c2d2d]">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex-1">
          {activeScreen === "setup" ? (
            <SetupScreen
              homeCurrency={homeCurrency}
              localCurrency={localCurrency}
              difficultyLevel={difficultyLevel}
              difficultyAvailability={difficultyAvailability}
              isLoading={isLoading}
              onDifficultyChange={setDifficultyLevel}
              onHomeCurrencyChange={setHomeCurrency}
              onLocalCurrencyChange={setLocalCurrency}
              onGenerate={handleGenerate}
            />
          ) : null}

          {activeScreen === "shortcut" && recommendation && currentShortcut ? (
            <ShortcutScreen
              key={`${currentShortcut.best.id}-${localCurrency}-${homeCurrency}`}
              recommendation={recommendation}
              best={currentShortcut.best}
              alternates={currentShortcut.alternates}
              selectedDifficulty={difficultyLevel}
              difficultyAvailability={difficultyAvailability ?? { easy: true, moderate: true }}
              onDifficultyChange={setDifficultyLevel}
              onSelectFormula={setSelectedFormulaId}
              onOpenPractice={() => setActiveScreen("practice")}
              onRefresh={() =>
                void generateShortcut({ homeCurrency, localCurrency }, "shortcut")
              }
              onSwap={() => void handleSwap()}
              isLoading={isLoading}
            />
          ) : null}

          {activeScreen === "practice" && recommendation && currentShortcut ? (
            <PracticeScreen
              key={`${currentShortcut.best.id}-${localCurrency}-${homeCurrency}`}
              recommendation={recommendation}
              best={currentShortcut.best}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
