"use client";

import { useMemo, useState } from "react";
import { CURRENCY_OPTIONS, getCurrencyOption } from "@/lib/currencies";
import type { CurrencyCode } from "@/lib/types";

type CurrencySelectProps = {
  id: string;
  label: string;
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
};

export function CurrencySelect({
  id,
  label,
  value,
  onChange,
}: CurrencySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedCurrency = getCurrencyOption(value);
  const sortedCurrencies = useMemo(
    () =>
      [...CURRENCY_OPTIONS].sort(
        (left, right) =>
          left.code.localeCompare(right.code) ||
          left.name.localeCompare(right.name),
      ),
    [],
  );
  const filteredCurrencies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return sortedCurrencies;
    }

    return sortedCurrencies.filter((currency) =>
      `${currency.code} ${currency.name}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, sortedCurrencies]);

  function handleSelect(currency: CurrencyCode) {
    onChange(currency);
    setIsOpen(false);
    setQuery("");
  }

  return (
    <div className="block">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]"
      >
        {label}
      </label>
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-1">
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          className="flex min-h-14 w-full items-center justify-between gap-3 bg-transparent text-left text-[17px] font-medium text-[var(--accent-strong)] outline-none"
        >
          <span>
            {selectedCurrency.code} · {selectedCurrency.name}
          </span>
          <span className="text-sm text-[var(--muted)]">
            {isOpen ? "Close" : "Search"}
          </span>
        </button>
      </div>
      {isOpen ? (
        <div className="mt-3 rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow)]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-1">
            <input
              autoFocus
              type="text"
              inputMode="search"
              placeholder="Search code or currency name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-14 w-full bg-transparent text-[17px] font-medium text-[var(--accent-strong)] outline-none placeholder:text-[var(--muted)]"
            />
          </div>

          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {filteredCurrencies.map((currency) => {
              const isSelected = currency.code === value;

              return (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() => handleSelect(currency.code)}
                  className="flex min-h-13 w-full items-center justify-between rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-[17px] font-semibold text-[var(--accent-strong)]">
                      {currency.code}
                    </span>
                    <span className="block text-[15px] leading-6 text-[var(--muted)]">
                      {currency.name}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-[var(--accent)]">
                    {isSelected ? "Selected" : currency.symbol}
                  </span>
                </button>
              );
            })}

            {filteredCurrencies.length === 0 ? (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-5 text-[15px] leading-6 text-[var(--muted)]">
                No currencies match that search.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
