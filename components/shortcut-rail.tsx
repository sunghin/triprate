import type { FormulaCandidate, FormulaOperation } from "@/lib/types";

type ShortcutRailProps = {
  baseCurrency: string;
  quoteCurrency: string;
  candidate: FormulaCandidate;
  tone: "primary" | "neutral";
};

type StepDescription = {
  detail: string;
  title: string;
};

function getShiftLabel(places: number) {
  if (places > 0) {
    return `+${"0".repeat(places)}`;
  }

  return `-${"0".repeat(Math.abs(places))}`;
}

export function formatOperationStep(operation: FormulaOperation): StepDescription {
  switch (operation.type) {
    case "shift":
      return {
        detail: getShiftLabel(operation.places),
        title:
          operation.places > 0
            ? `add ${operation.places} zero${operation.places === 1 ? "" : "es"}`
            : `remove ${Math.abs(operation.places)} zero${
                Math.abs(operation.places) === 1 ? "" : "es"
              }`,
      };
    case "multiply":
      return {
        detail: `x${operation.value}`,
        title: `multiply by ${operation.value}`,
      };
    case "divide":
      return {
        detail: `/${operation.value}`,
        title: `divide by ${operation.value}`,
      };
    case "percentAdjust":
      return {
        detail: `${operation.value > 0 ? "+" : ""}${operation.value}%`,
        title:
          operation.value > 0
            ? `add ${operation.value}%`
            : `subtract ${Math.abs(operation.value)}%`,
      };
    case "add":
      return {
        detail: `+${operation.value}`,
        title: `add ${operation.value}`,
      };
    case "subtract":
      return {
        detail: `-${operation.value}`,
        title: `subtract ${operation.value}`,
      };
    default:
      return {
        detail: "",
        title: "",
      };
  }
}

function getToneClasses(tone: ShortcutRailProps["tone"]) {
  if (tone === "primary") {
    return {
      rail: "border-white/16 bg-white/8",
      currency: "border-white/18 bg-white text-[var(--accent-strong)] shadow-[0_8px_24px_rgba(8,20,54,0.18)]",
      step: "border-white/18 bg-white/12 text-white",
      arrow: "text-white/70",
    };
  }

  return {
    rail: "border-[var(--border)] bg-white/70",
    currency:
      "border-[rgba(138,151,179,0.28)] bg-white text-[var(--accent-strong)] shadow-[0_8px_24px_rgba(109,123,147,0.14)]",
    step: "border-[rgba(138,151,179,0.28)] bg-[rgba(244,247,252,0.92)] text-[var(--accent-strong)]",
    arrow: "text-[rgba(74,90,116,0.72)]",
  };
}

function getItemClasses(kind: "currency" | "step", dense: boolean, tone: ShortcutRailProps["tone"]) {
  const toneClasses = getToneClasses(tone);
  const baseClasses =
    "flex items-center justify-center rounded-full border text-center font-semibold tracking-tight whitespace-nowrap";

  if (kind === "currency") {
    return `${baseClasses} ${toneClasses.currency} ${
      dense ? "min-h-9 px-3 text-[12px]" : "min-h-10 px-4 text-[13px]"
    }`;
  }

  return `${baseClasses} ${toneClasses.step} ${
    dense ? "min-h-8 px-2.5 text-[12px]" : "min-h-9 px-3 text-[13px]"
  }`;
}

export function ShortcutRail({
  baseCurrency,
  quoteCurrency,
  candidate,
  tone,
}: ShortcutRailProps) {
  const dense = candidate.operationCount >= 3;
  const railTone = getToneClasses(tone);
  const steps = candidate.operations.map(formatOperationStep);
  const nodes = [
    { kind: "currency" as const, value: baseCurrency },
    ...steps.flatMap((step) => [
      { kind: "arrow" as const, value: "→" },
      { kind: "step" as const, value: step.detail },
    ]),
    { kind: "arrow" as const, value: "→" },
    { kind: "currency" as const, value: quoteCurrency },
  ];
  const templateColumns = nodes
    .map((node) => (node.kind === "arrow" ? "auto" : "minmax(0,1fr)"))
    .join(" ");

  return (
    <div
      className={`rounded-[28px] border px-3 py-3 ${railTone.rail} ${
        dense ? "sm:px-4" : "sm:px-5"
      }`}
    >
      <div
        className="grid items-center gap-2"
        style={{ gridTemplateColumns: templateColumns }}
      >
        {nodes.map((node, index) =>
          node.kind === "arrow" ? (
            <span
              key={`${candidate.id}-rail-arrow-${index}`}
              aria-hidden="true"
              className={`text-sm font-semibold ${railTone.arrow}`}
            >
              {node.value}
            </span>
          ) : (
            <div
              key={`${candidate.id}-rail-node-${index}`}
              className={getItemClasses(node.kind, dense, tone)}
            >
              {node.value}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
