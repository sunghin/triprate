import type { CurrencyCode, ExchangeRateQuote } from "@/lib/types";

const FRANKFURTER_API = "https://api.frankfurter.dev/v2/rates";

const USD_ANCHOR_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  JPY: 149.8,
  GBP: 0.79,
  CNY: 7.24,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.91,
  SGD: 1.34,
  HKD: 7.82,
  KRW: 1348,
  THB: 35.8,
  AED: 3.67,
  MXN: 17.2,
  TRY: 34,
  INR: 83.2,
  TWD: 31.4,
  SAR: 3.75,
  NZD: 1.66,
  SEK: 10.6,
  NOK: 10.8,
  DKK: 6.87,
  PLN: 3.95,
  CZK: 23.2,
  HUF: 360,
  RON: 4.58,
  BGN: 1.8,
  BRL: 5.2,
  ARS: 1100,
  CLP: 930,
  COP: 4000,
  PEN: 3.75,
  ZAR: 18.5,
  MAD: 10,
  EGP: 48.5,
  ILS: 3.65,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.377,
  OMR: 0.385,
  JOD: 0.709,
  MYR: 4.7,
  IDR: 15900,
  PHP: 57,
  VND: 25400,
  ISK: 138,
  RSD: 107,
  GEL: 2.69,
  KZT: 460,
  DOP: 59.5,
};

export type RateService = {
  getExchangeRate: (
    baseCurrency: CurrencyCode,
    quoteCurrency: CurrencyCode,
  ) => Promise<ExchangeRateQuote>;
};

type FrankfurterRateRow = {
  base: string;
  quote: string;
  rate: number;
  date: string;
};

function buildMockQuote(
  baseCurrency: CurrencyCode,
  quoteCurrency: CurrencyCode,
): ExchangeRateQuote {
  if (baseCurrency === quoteCurrency) {
    return {
      baseCurrency,
      quoteCurrency,
      rate: 1,
      fetchedAt: new Date().toISOString(),
      source: "mock",
    };
  }

  return {
    baseCurrency,
    quoteCurrency,
    rate: USD_ANCHOR_RATES[quoteCurrency] / USD_ANCHOR_RATES[baseCurrency],
    fetchedAt: new Date().toISOString(),
    source: "mock",
  };
}

async function fetchLiveQuote(
  baseCurrency: CurrencyCode,
  quoteCurrency: CurrencyCode,
): Promise<ExchangeRateQuote> {
  const apiUrl = new URL(FRANKFURTER_API);
  apiUrl.searchParams.set("base", baseCurrency);
  apiUrl.searchParams.set("quotes", quoteCurrency);

  const response = await fetch(apiUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Rate request failed with ${response.status}.`);
  }

  const data = (await response.json()) as FrankfurterRateRow[];
  const nextRate = data[0];

  if (!nextRate || typeof nextRate.rate !== "number") {
    throw new Error("Frankfurter did not return a rate row.");
  }

  return {
    baseCurrency,
    quoteCurrency,
    rate: nextRate.rate,
    fetchedAt: nextRate.date
      ? new Date(`${nextRate.date}T00:00:00.000Z`).toISOString()
      : new Date().toISOString(),
    source: "live",
  };
}

class FrankfurterRateService implements RateService {
  async getExchangeRate(
    baseCurrency: CurrencyCode,
    quoteCurrency: CurrencyCode,
  ) {
    if (baseCurrency === quoteCurrency) {
      return buildMockQuote(baseCurrency, quoteCurrency);
    }

    try {
      return await fetchLiveQuote(baseCurrency, quoteCurrency);
    } catch {
      return buildMockQuote(baseCurrency, quoteCurrency);
    }
  }
}

export const rateService: RateService = new FrankfurterRateService();
