import { getEvaluationAmounts } from "../constants";
import { calculateAverageError } from "./calculate-average-error";
import { isFriendlyOperation } from "./classify-difficulty";
import { generateCandidateFormulas } from "./generate-candidates";
import { rankFormulas } from "./rank-formulas";
import type {
  DifficultyAvailability,
  ExchangeRateQuote,
  FormulaCandidate,
  FormulaDifficultyLevel,
  ShortcutRecommendation,
  UserDifficultyLevel,
} from "../types";

const EASY_TARGET_MISS = 0.1;
const MODERATE_TARGET_MISS = 0.05;
const ALT_MISS_IMPROVEMENT_THRESHOLD = 0.01;
const ALT_MISS_REGRESSION_TOLERANCE = 0.01;
const ALT_TOTAL_DIFFICULTY_IMPROVEMENT_THRESHOLD = 0.75;
const ALT_PER_STEP_IMPROVEMENT_THRESHOLD = 0.15;
const RELAXED_EASY_MULTIPLIERS = new Set([3, 6, 7, 8, 9]);
const RELAXED_EASY_DIVISORS = new Set([6, 8]);
const RELAXED_EASY_PERCENT_ADJUSTMENTS = new Set([
  -50,
  -40,
  -30,
  -20,
  -10,
  10,
  20,
  30,
  40,
  50,
]);

export function buildShortcutRecommendation(quote: ExchangeRateQuote) {
  const testAmounts = getEvaluationAmounts(quote.rate);
  const candidates = generateCandidateFormulas(quote.rate);
  const rankedCandidates = rankFormulas(quote.rate, candidates, testAmounts);

  if (rankedCandidates.length === 0) {
    throw new Error("No shortcut formulas could be generated.");
  }

  const candidatesByDifficulty: Record<FormulaDifficultyLevel, FormulaCandidate[]> = {
    easy: [],
    average: [],
    difficult: [],
  };

  for (const candidate of rankedCandidates) {
    candidatesByDifficulty[candidate.difficulty].push(candidate);
  }

  return {
    quote,
    candidatesByDifficulty,
    testAmounts,
  };
}

function getAllCandidates(recommendation: ShortcutRecommendation) {
  return [
    ...recommendation.candidatesByDifficulty.easy,
    ...recommendation.candidatesByDifficulty.average,
    ...recommendation.candidatesByDifficulty.difficult,
  ];
}

function buildParityCandidate(recommendation: ShortcutRecommendation) {
  const baseline = calculateAverageError(
    recommendation.quote.rate,
    [],
    recommendation.testAmounts,
  );

  return {
    id: "parity-noop",
    operations: [],
    shortLabel: "1:1",
    explanation: "Treat it as roughly the same number.",
    difficulty: "easy" as FormulaDifficultyLevel,
    difficultyReason:
      "The currencies are close enough that using the same number stays within the target range.",
    operationCount: 0,
    examples: baseline.examples,
    averageError: baseline.averageError,
    averageRelativeError: baseline.averageRelativeError,
    simplicityPenalty: 0,
    memorabilityPenalty: 0,
    score: baseline.averageRelativeError * 100,
  };
}

function isRelaxedEasyCandidate(candidate: FormulaCandidate) {
  if (candidate.operationCount === 0) {
    return false;
  }

  if (candidate.operationCount > 2) {
    return false;
  }

  for (const operation of candidate.operations) {
    if (isFriendlyOperation(operation)) {
      continue;
    }

    if (
      operation.type === "multiply" &&
      RELAXED_EASY_MULTIPLIERS.has(operation.value)
    ) {
      continue;
    }

    if (
      operation.type === "divide" &&
      RELAXED_EASY_DIVISORS.has(operation.value)
    ) {
      continue;
    }

    if (
      operation.type === "percentAdjust" &&
      RELAXED_EASY_PERCENT_ADJUSTMENTS.has(operation.value)
    ) {
      continue;
    }

    return false;
  }

  return true;
}

export function compareBySimplicity(
  left: FormulaCandidate,
  right: FormulaCandidate,
) {
  if (left.operationCount !== right.operationCount) {
    return left.operationCount - right.operationCount;
  }

  const leftTotalDifficulty = getTotalDifficulty(left);
  const rightTotalDifficulty = getTotalDifficulty(right);

  if (leftTotalDifficulty !== rightTotalDifficulty) {
    return leftTotalDifficulty - rightTotalDifficulty;
  }

  const leftPerStepDifficulty = getPerStepDifficulty(left);
  const rightPerStepDifficulty = getPerStepDifficulty(right);

  if (leftPerStepDifficulty !== rightPerStepDifficulty) {
    return leftPerStepDifficulty - rightPerStepDifficulty;
  }

  if (left.simplicityPenalty !== right.simplicityPenalty) {
    return left.simplicityPenalty - right.simplicityPenalty;
  }

  if (left.memorabilityPenalty !== right.memorabilityPenalty) {
    return left.memorabilityPenalty - right.memorabilityPenalty;
  }

  return left.averageRelativeError - right.averageRelativeError;
}

export function compareByAccuracy(
  left: FormulaCandidate,
  right: FormulaCandidate,
) {
  if (left.averageRelativeError !== right.averageRelativeError) {
    return left.averageRelativeError - right.averageRelativeError;
  }

  return compareBySimplicity(left, right);
}

export function getTotalDifficulty(candidate: FormulaCandidate) {
  return candidate.simplicityPenalty + candidate.memorabilityPenalty;
}

export function getPerStepDifficulty(candidate: FormulaCandidate) {
  if (candidate.operationCount === 0) {
    return 0;
  }

  return getTotalDifficulty(candidate) / candidate.operationCount;
}

function improvesMiss(left: FormulaCandidate, right: FormulaCandidate) {
  return left.averageRelativeError < right.averageRelativeError;
}

function improvesTotalDifficulty(left: FormulaCandidate, right: FormulaCandidate) {
  return getTotalDifficulty(left) < getTotalDifficulty(right);
}

function primaryIsStrictlyBetter(
  primary: FormulaCandidate,
  alternate: FormulaCandidate,
) {
  return (
    primary.averageRelativeError <= alternate.averageRelativeError &&
    getTotalDifficulty(primary) <= getTotalDifficulty(alternate)
  );
}

export function selectBestCandidate(
  candidates: FormulaCandidate[],
  compareCandidates: (left: FormulaCandidate, right: FormulaCandidate) => number,
) {
  const sortedCandidates = [...candidates].sort(compareCandidates);
  const baselineCandidate = sortedCandidates[0];

  if (!baselineCandidate) {
    return null;
  }

  const dominatingCandidates = sortedCandidates.filter(
    (candidate) =>
      candidate.id !== baselineCandidate.id &&
      improvesMiss(candidate, baselineCandidate) &&
      improvesTotalDifficulty(candidate, baselineCandidate),
  );

  if (dominatingCandidates.length === 0) {
    return baselineCandidate;
  }

  return [...dominatingCandidates].sort(compareCandidates)[0] ?? baselineCandidate;
}

export function shouldKeepAlternate(
  primary: FormulaCandidate,
  alternate: FormulaCandidate,
) {
  if (alternate.id === primary.id) {
    return false;
  }

  if (primaryIsStrictlyBetter(primary, alternate)) {
    return false;
  }

  const missDelta = alternate.averageRelativeError - primary.averageRelativeError;
  const totalDifficultyDelta =
    getTotalDifficulty(alternate) - getTotalDifficulty(primary);
  const perStepDifficultyDelta =
    getPerStepDifficulty(alternate) - getPerStepDifficulty(primary);

  const isMeaningfullyMoreAccurate =
    missDelta <= -ALT_MISS_IMPROVEMENT_THRESHOLD;
  const isMeaningfullyEasierOverall =
    totalDifficultyDelta <= -ALT_TOTAL_DIFFICULTY_IMPROVEMENT_THRESHOLD;
  const isMeaningfullyEasierPerStep =
    perStepDifficultyDelta <= -ALT_PER_STEP_IMPROVEMENT_THRESHOLD;
  const hasAcceptableAccuracyRegression =
    missDelta <= ALT_MISS_REGRESSION_TOLERANCE;
  const hasAcceptablePerStepRegression =
    perStepDifficultyDelta <= ALT_PER_STEP_IMPROVEMENT_THRESHOLD;
  const hasAcceptableTotalDifficultyRegression =
    totalDifficultyDelta <= ALT_TOTAL_DIFFICULTY_IMPROVEMENT_THRESHOLD;

  if (
    isMeaningfullyMoreAccurate &&
    (hasAcceptablePerStepRegression || hasAcceptableTotalDifficultyRegression)
  ) {
    return true;
  }

  if (
    (isMeaningfullyEasierOverall || isMeaningfullyEasierPerStep) &&
    hasAcceptableAccuracyRegression
  ) {
    return true;
  }

  return false;
}

function getUsefulAlternates(
  primary: FormulaCandidate,
  candidates: FormulaCandidate[],
  compareCandidates: (left: FormulaCandidate, right: FormulaCandidate) => number,
) {
  return candidates
    .filter((candidate) => shouldKeepAlternate(primary, candidate))
    .sort(compareCandidates)
    .slice(0, 2);
}

function getEasyCandidates(recommendation: ShortcutRecommendation) {
  const relaxedCandidates = getAllCandidates(recommendation).filter((candidate) =>
    isRelaxedEasyCandidate(candidate),
  );
  const parityCandidate = buildParityCandidate(recommendation);

  if (parityCandidate.averageRelativeError < EASY_TARGET_MISS) {
    relaxedCandidates.push(parityCandidate);
  }

  return relaxedCandidates;
}

function getSortedEasyCandidates(recommendation: ShortcutRecommendation) {
  const easyCandidates = getEasyCandidates(recommendation);
  const candidatesWithinTarget = easyCandidates.filter(
    (candidate) => candidate.averageRelativeError <= EASY_TARGET_MISS,
  );

  if (candidatesWithinTarget.length > 0) {
    return [...candidatesWithinTarget].sort(compareBySimplicity);
  }

  return [...easyCandidates].sort(compareByAccuracy);
}

function getSelectableEasyCandidate(recommendation: ShortcutRecommendation) {
  const sortedEasyCandidates = getSortedEasyCandidates(recommendation);

  if (sortedEasyCandidates.length === 0) {
    return null;
  }

  return selectBestCandidate(sortedEasyCandidates, compareBySimplicity);
}

export function resolveShortcutForDifficulty(
  recommendation: ShortcutRecommendation,
  difficulty: UserDifficultyLevel,
) {
  if (difficulty === "easy") {
    const easyCandidate = getSelectableEasyCandidate(recommendation);

    if (easyCandidate) {
      return {
        requestedDifficulty: difficulty,
        resolvedDifficulty: "easy" as FormulaDifficultyLevel,
        best: easyCandidate,
        alternates: getUsefulAlternates(
          easyCandidate,
          getSortedEasyCandidates(recommendation),
          compareBySimplicity,
        ),
      };
    }

    const parityCandidate = buildParityCandidate(recommendation);
    const averageFallback = recommendation.candidatesByDifficulty.average[0];
    const difficultFallback = recommendation.candidatesByDifficulty.difficult[0];
    const fallbackCandidate = [averageFallback, difficultFallback, parityCandidate]
      .filter((candidate): candidate is FormulaCandidate => Boolean(candidate))
      .sort(compareByAccuracy)[0];

    if (fallbackCandidate) {
      return {
        requestedDifficulty: difficulty,
        resolvedDifficulty: fallbackCandidate.difficulty,
        best: fallbackCandidate,
        alternates: getUsefulAlternates(
          fallbackCandidate,
          recommendation.candidatesByDifficulty[fallbackCandidate.difficulty],
          compareByAccuracy,
        ),
      };
    }

    throw new Error("No shortcut formulas are available for this rate.");
  }

  const easyCandidate = getSelectableEasyCandidate(recommendation);
  const parityCandidate = buildParityCandidate(recommendation);
  const averageCandidate = recommendation.candidatesByDifficulty.average[0];
  const difficultCandidate = recommendation.candidatesByDifficulty.difficult[0];
  const moderatePool = [
    averageCandidate,
    difficultCandidate,
    parityCandidate,
  ].filter((candidate): candidate is FormulaCandidate => Boolean(candidate));
  const candidatesWithinTarget = moderatePool.filter(
    (candidate) => candidate.averageRelativeError <= MODERATE_TARGET_MISS,
  );

  if (candidatesWithinTarget.length > 0) {
    const bestModerateCandidate = selectBestCandidate(
      candidatesWithinTarget,
      compareBySimplicity,
    );

    if (!bestModerateCandidate) {
      throw new Error("No shortcut formulas are available for this rate.");
    }

    return {
      requestedDifficulty: difficulty,
      resolvedDifficulty: bestModerateCandidate.difficulty,
      best: bestModerateCandidate,
      alternates: getUsefulAlternates(
        bestModerateCandidate,
        candidatesWithinTarget,
        compareBySimplicity,
      ),
    };
  }

  if (!averageCandidate && !difficultCandidate) {
    const easyFallback = easyCandidate;

    if (easyFallback) {
      return {
        requestedDifficulty: difficulty,
        resolvedDifficulty: "easy" as FormulaDifficultyLevel,
        best: easyFallback,
        alternates: recommendation.candidatesByDifficulty.easy.slice(1, 3),
      };
    }

    throw new Error("No shortcut formulas are available for this rate.");
  }

  const bestFallbackCandidate = [...moderatePool].sort(compareByAccuracy)[0];

  if (
    easyCandidate &&
    easyCandidate.averageRelativeError <= bestFallbackCandidate.averageRelativeError
  ) {
    return {
      requestedDifficulty: difficulty,
      resolvedDifficulty: "easy" as FormulaDifficultyLevel,
      best: easyCandidate,
      alternates: getUsefulAlternates(
        easyCandidate,
        getSortedEasyCandidates(recommendation),
        compareBySimplicity,
      ),
    };
  }

  const resolvedFallbackCandidate = selectBestCandidate(
    moderatePool,
    compareByAccuracy,
  );

  if (!resolvedFallbackCandidate) {
    throw new Error("No shortcut formulas are available for this rate.");
  }

  return {
    requestedDifficulty: difficulty,
    resolvedDifficulty: resolvedFallbackCandidate.difficulty,
    best: resolvedFallbackCandidate,
    alternates: getUsefulAlternates(
      resolvedFallbackCandidate,
      moderatePool,
      compareByAccuracy,
    ),
  };
}

export function getDifficultyAvailability(
  recommendation: ShortcutRecommendation,
): DifficultyAvailability {
  const easyCandidate = getSelectableEasyCandidate(recommendation);

  if (!easyCandidate) {
    return {
      easy: false,
      moderate:
        Boolean(recommendation.candidatesByDifficulty.average[0]) ||
        Boolean(recommendation.candidatesByDifficulty.difficult[0]),
    };
  }

  const moderateShortcut = resolveShortcutForDifficulty(recommendation, "moderate");

  return {
    easy: true,
    moderate: moderateShortcut.best.id !== easyCandidate.id,
  };
}
