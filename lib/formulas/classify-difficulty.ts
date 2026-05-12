import type { FormulaDifficultyLevel, FormulaOperation } from "../types";

export function isFriendlyOperation(operation: FormulaOperation) {
  switch (operation.type) {
    case "shift":
      return true;
    case "multiply":
      return [2, 4, 5, 10].includes(operation.value);
    case "divide":
      return [2, 4, 10].includes(operation.value);
    case "percentAdjust":
      return Math.abs(operation.value) === 10;
    case "add":
    case "subtract":
      return Number.isInteger(operation.value);
    default:
      return false;
  }
}

export function isModerateOperation(operation: FormulaOperation) {
  if (isFriendlyOperation(operation)) {
    return true;
  }

  switch (operation.type) {
    case "multiply":
      return [3, 6, 8, 9].includes(operation.value);
    case "divide":
      return [6, 8].includes(operation.value);
    case "percentAdjust":
      return [10, 20, 30, 40, 50].includes(Math.abs(operation.value));
    default:
      return false;
  }
}

function formatOperationName(operation: FormulaOperation) {
  switch (operation.type) {
    case "shift":
      return operation.places > 0
        ? `x${10 ** operation.places}`
        : `/${10 ** Math.abs(operation.places)}`;
    case "multiply":
      return `x${operation.value}`;
    case "divide":
      return `/${operation.value}`;
    case "percentAdjust":
      return operation.value > 0 ? `+${operation.value}%` : `${operation.value}%`;
    case "add":
      return `+${operation.value}`;
    case "subtract":
      return `-${operation.value}`;
    default:
      return "";
  }
}

export function classifyFormulaDifficulty(operations: FormulaOperation[]) {
  const operationCount = operations.length;
  const unfriendlyOperation = operations.find(
    (operation) => !isModerateOperation(operation),
  );

  if (unfriendlyOperation) {
    return {
      level: "difficult" as FormulaDifficultyLevel,
      reason: `Contains an awkward step: ${formatOperationName(
        unfriendlyOperation,
      )}.`,
      operationCount,
    };
  }

  if (operationCount >= 4) {
    return {
      level: "difficult" as FormulaDifficultyLevel,
      reason: "Needs four or more mental steps.",
      operationCount,
    };
  }

  if (operationCount <= 2 && operations.every((operation) => isFriendlyOperation(operation))) {
    return {
      level: "easy" as FormulaDifficultyLevel,
      reason: "Uses at most two friendly mental steps.",
      operationCount,
    };
  }

  return {
    level: "average" as FormulaDifficultyLevel,
    reason: "Manageable, but not instant to do in your head.",
    operationCount,
  };
}
