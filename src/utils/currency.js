export const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$', region: 'United States', format: 'before' },
  { code: 'EUR', name: 'Euro', symbol: '€', region: 'European Union', format: 'after' },
  { code: 'GBP', name: 'British Pound', symbol: '£', region: 'United Kingdom', format: 'before' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', region: 'Japan', format: 'before' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', region: 'India', format: 'before' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', region: 'Canada', format: 'before' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', region: 'Australia', format: 'before' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', region: 'Switzerland', format: 'after' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', region: 'China', format: 'before' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', region: 'Sweden', format: 'after' }
];

export const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'hi', name: 'Hindi' }
];

export const numberFormats = [
  { value: 'US', label: '1,234.56 (US)' },
  { value: 'EU', label: '1.234,56 (EU)' },
  { value: 'IN', label: '1,23,456.78 (India)' }
];

export const dateFormats = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' }
];

export function formatCurrencyAmount(amount, currencyCode, numberFormat) {
  const currency = currencies.find(c => c.code === currencyCode);
  if (!currency) return String(amount);

  let formatted = amount;
  switch (numberFormat) {
    case 'EU':
      formatted = Number(amount).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      break;
    case 'IN':
      formatted = Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      break;
    default:
      formatted = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return currency.format === 'before' ? `${currency.symbol}${formatted}` : `${formatted} ${currency.symbol}`;
}
