import type { FormulaOperation } from "../types";

const MULTIPLY_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const DIVIDE_VALUES = [2, 4, 6, 8, 10] as const;
const ADJUST_VALUES = [1, 2, 3, 4, 5, 10, 20];
const PERCENT_ADJUST_VALUES = [-50, -40, -30, -20, -10, 10, 20, 30, 40, 50] as const;

const ADJUST_OPERATIONS: FormulaOperation[] = [
  ...ADJUST_VALUES.flatMap((value) => [
    { type: "add", value } as const,
    { type: "subtract", value } as const,
  ]),
  ...PERCENT_ADJUST_VALUES.map(
    (value) => ({ type: "percentAdjust", value }) as const,
  ),
];

function serializeOperation(operation: FormulaOperation) {
  switch (operation.type) {
    case "shift":
      return `shift:${operation.places}`;
    case "multiply":
      return `multiply:${operation.value}`;
    case "divide":
      return `divide:${operation.value}`;
    case "percentAdjust":
      return `percentAdjust:${operation.value}`;
    case "add":
      return `add:${operation.value}`;
    case "subtract":
      return `subtract:${operation.value}`;
    default:
      return "";
  }
}

function isInversePair(previous: FormulaOperation, current: FormulaOperation) {
  if (previous.type === "shift" && current.type === "shift") {
    return previous.places + current.places === 0;
  }

  if (previous.type === "multiply" && current.type === "divide") {
    return previous.value === current.value;
  }

  if (previous.type === "divide" && current.type === "multiply") {
    return previous.value === current.value;
  }

  return false;
}

function isValidScaleSequence(operations: FormulaOperation[]) {
  let shiftCount = 0;

  for (let index = 0; index < operations.length; index += 1) {
    const current = operations[index];
    const previous = operations[index - 1];

    if (current.type === "shift") {
      shiftCount += 1;
    }

    if (shiftCount > 1) {
      return false;
    }

    if (!previous) {
      continue;
    }

    if (previous.type === current.type) {
      return false;
    }

    if (isInversePair(previous, current)) {
      return false;
    }
  }

  return true;
}

function getShiftValues(rate: number) {
  const magnitude = Math.max(rate, 1 / rate);
  const maxShift = Math.max(3, Math.ceil(Math.log10(magnitude)) + 1);
  const shiftValues: number[] = [];

  for (let places = -maxShift; places <= maxShift; places += 1) {
    if (places !== 0) {
      shiftValues.push(places);
    }
  }

  return shiftValues;
}

export function generateCandidateFormulas(rate: number) {
  const scaleOperations: FormulaOperation[] = [
    ...getShiftValues(rate).map((places) => ({ type: "shift", places }) as const),
    ...MULTIPLY_VALUES.map((value) => ({ type: "multiply", value }) as const),
    ...DIVIDE_VALUES.map((value) => ({ type: "divide", value }) as const),
  ];
  const allCandidates = new Map<string, FormulaOperation[]>();

  for (const scaleOperation of scaleOperations) {
    allCandidates.set(serializeOperation(scaleOperation), [scaleOperation]);
  }

  for (const adjustOperation of ADJUST_OPERATIONS) {
    allCandidates.set(serializeOperation(adjustOperation), [adjustOperation]);
  }

  for (const first of scaleOperations) {
    for (const second of scaleOperations) {
      const scaleSequence = [first, second];

      if (!isValidScaleSequence(scaleSequence)) {
        continue;
      }

      allCandidates.set(
        scaleSequence.map((operation) => serializeOperation(operation)).join("|"),
        scaleSequence,
      );

      for (const adjust of ADJUST_OPERATIONS) {
        const adjustedSequence = [...scaleSequence, adjust];

        allCandidates.set(
          adjustedSequence
            .map((operation) => serializeOperation(operation))
            .join("|"),
          adjustedSequence,
        );
      }
    }
  }

  for (const first of scaleOperations) {
    for (const second of scaleOperations) {
      for (const third of scaleOperations) {
        const scaleSequence = [first, second, third];

        if (!isValidScaleSequence(scaleSequence)) {
          continue;
        }

        allCandidates.set(
          scaleSequence.map((operation) => serializeOperation(operation)).join("|"),
          scaleSequence,
        );
      }
    }
  }

  for (const scaleOperation of scaleOperations) {
    for (const adjust of ADJUST_OPERATIONS) {
      const candidate = [scaleOperation, adjust];
      allCandidates.set(
        candidate.map((operation) => serializeOperation(operation)).join("|"),
        candidate,
      );
    }
  }

  return [...allCandidates.values()];
}
