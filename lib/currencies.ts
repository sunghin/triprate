export const CURRENCY_OPTIONS = [
  { code: "USD", name: "US Dollar", symbol: "$", rank: 1 },
  { code: "EUR", name: "Euro", symbol: "EUR", rank: 2 },
  { code: "JPY", name: "Japanese Yen", symbol: "JPY", rank: 3 },
  { code: "GBP", name: "British Pound", symbol: "GBP", rank: 4 },
  { code: "CNY", name: "Chinese Yuan", symbol: "CNY", rank: 5 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rank: 6 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rank: 7 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", rank: 8 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", rank: 9 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", rank: 10 },
  { code: "KRW", name: "South Korean Won", symbol: "KRW", rank: 11 },
  { code: "THB", name: "Thai Baht", symbol: "THB", rank: 12 },
  { code: "AED", name: "UAE Dirham", symbol: "AED", rank: 13 },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", rank: 14 },
  { code: "TRY", name: "Turkish Lira", symbol: "TRY", rank: 15 },
  { code: "INR", name: "Indian Rupee", symbol: "INR", rank: 16 },
  { code: "TWD", name: "New Taiwan Dollar", symbol: "TWD", rank: 17 },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR", rank: 18 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", rank: 19 },
  { code: "SEK", name: "Swedish Krona", symbol: "SEK", rank: 20 },
  { code: "NOK", name: "Norwegian Krone", symbol: "NOK", rank: 21 },
  { code: "DKK", name: "Danish Krone", symbol: "DKK", rank: 22 },
  { code: "PLN", name: "Polish Zloty", symbol: "PLN", rank: 23 },
  { code: "CZK", name: "Czech Koruna", symbol: "CZK", rank: 24 },
  { code: "HUF", name: "Hungarian Forint", symbol: "HUF", rank: 25 },
  { code: "RON", name: "Romanian Leu", symbol: "RON", rank: 26 },
  { code: "BGN", name: "Bulgarian Lev", symbol: "BGN", rank: 27 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", rank: 28 },
  { code: "ARS", name: "Argentine Peso", symbol: "ARS", rank: 29 },
  { code: "CLP", name: "Chilean Peso", symbol: "CLP", rank: 30 },
  { code: "COP", name: "Colombian Peso", symbol: "COP", rank: 31 },
  { code: "PEN", name: "Peruvian Sol", symbol: "PEN", rank: 32 },
  { code: "ZAR", name: "South African Rand", symbol: "ZAR", rank: 33 },
  { code: "MAD", name: "Moroccan Dirham", symbol: "MAD", rank: 34 },
  { code: "EGP", name: "Egyptian Pound", symbol: "EGP", rank: 35 },
  { code: "ILS", name: "Israeli New Shekel", symbol: "ILS", rank: 36 },
  { code: "QAR", name: "Qatari Riyal", symbol: "QAR", rank: 37 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KWD", rank: 38 },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BHD", rank: 39 },
  { code: "OMR", name: "Omani Rial", symbol: "OMR", rank: 40 },
  { code: "JOD", name: "Jordanian Dinar", symbol: "JOD", rank: 41 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "MYR", rank: 42 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "IDR", rank: 43 },
  { code: "PHP", name: "Philippine Peso", symbol: "PHP", rank: 44 },
  { code: "VND", name: "Vietnamese Dong", symbol: "VND", rank: 45 },
  { code: "ISK", name: "Icelandic Krona", symbol: "ISK", rank: 46 },
  { code: "RSD", name: "Serbian Dinar", symbol: "RSD", rank: 47 },
  { code: "GEL", name: "Georgian Lari", symbol: "GEL", rank: 48 },
  { code: "KZT", name: "Kazakhstani Tenge", symbol: "KZT", rank: 49 },
  { code: "DOP", name: "Dominican Peso", symbol: "DOP", rank: 50 },
] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["code"];

export type CurrencyOption = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  rank: number;
};

const CURRENCY_CODE_SET = new Set<string>(
  CURRENCY_OPTIONS.map((option) => option.code),
);

export function isCurrencyCode(code: unknown): code is CurrencyCode {
  return typeof code === "string" && CURRENCY_CODE_SET.has(code);
}

export function getCurrencyOption(code: CurrencyCode) {
  const currency = CURRENCY_OPTIONS.find((option) => option.code === code);

  if (!currency) {
    throw new Error(`Unsupported currency: ${code}`);
  }

  return currency;
}
