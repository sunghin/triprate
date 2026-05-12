import type { CurrencyCode } from "@/lib/types";

export function formatCurrencyAmount(amount: number, currency: CurrencyCode) {
  const absAmount = Math.abs(amount);
  const maximumFractionDigits =
    absAmount >= 100 ? 0 : absAmount >= 1 ? 2 : absAmount >= 0.1 ? 3 : 4;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits,
    minimumFractionDigits: absAmount >= 1 ? 0 : Math.min(2, maximumFractionDigits),
  }).format(amount);
}

export function formatRateValue(rate: number, currency: CurrencyCode) {
  const maximumFractionDigits =
    rate >= 100 ? 0 : rate >= 1 ? 2 : rate >= 0.1 ? 3 : 4;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits,
    minimumFractionDigits: rate < 1 ? Math.min(3, maximumFractionDigits) : 0,
  }).format(rate);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
