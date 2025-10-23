import { ChevronDown } from 'lucide-react';

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

const CURRENCIES: Currency[] = [
  { code: 'RUB', name: 'Российский рубль', symbol: '₽' },
  { code: 'USD', name: 'Доллар США', symbol: '$' },
  { code: 'EUR', name: 'Евро', symbol: '€' },
  { code: 'CNY', name: 'Китайский юань', symbol: '¥' },
  { code: 'AMD', name: 'Армянский драм', symbol: '֏' },
  { code: 'AED', name: 'Дирхам ОАЭ', symbol: 'د.إ' },
  { code: 'AUD', name: 'Австралийский доллар', symbol: 'A$' },
  { code: 'BGN', name: 'Болгарский лев', symbol: 'лв' },
  { code: 'BRL', name: 'Бразильский реал', symbol: 'R$' },
  { code: 'CAD', name: 'Канадский доллар', symbol: 'C$' },
  { code: 'CHF', name: 'Швейцарский франк', symbol: 'CHF' },
  { code: 'CZK', name: 'Чешская крона', symbol: 'Kč' },
  { code: 'DKK', name: 'Датская крона', symbol: 'kr' },
  { code: 'GBP', name: 'Британский фунт', symbol: '£' },
  { code: 'HKD', name: 'Гонконгский доллар', symbol: 'HK$' },
  { code: 'HUF', name: 'Венгерский форинт', symbol: 'Ft' },
  { code: 'IDR', name: 'Индонезийская рупия', symbol: 'Rp' },
  { code: 'ILS', name: 'Израильский шекель', symbol: '₪' },
  { code: 'INR', name: 'Индийская рупия', symbol: '₹' },
  { code: 'JPY', name: 'Японская иена', symbol: '¥' },
  { code: 'KRW', name: 'Южнокорейская вона', symbol: '₩' },
  { code: 'KZT', name: 'Казахстанский тенге', symbol: '₸' },
  { code: 'MXN', name: 'Мексиканское песо', symbol: '$' },
  { code: 'MYR', name: 'Малайзийский ринггит', symbol: 'RM' },
  { code: 'NOK', name: 'Норвежская крона', symbol: 'kr' },
  { code: 'NZD', name: 'Новозеландский доллар', symbol: 'NZ$' },
  { code: 'PLN', name: 'Польский злотый', symbol: 'zł' },
  { code: 'RON', name: 'Румынский лей', symbol: 'lei' },
  { code: 'SAR', name: 'Саудовский риял', symbol: '﷼' },
  { code: 'SEK', name: 'Шведская крона', symbol: 'kr' },
  { code: 'SGD', name: 'Сингапурский доллар', symbol: 'S$' },
  { code: 'THB', name: 'Тайский бат', symbol: '฿' },
  { code: 'TRY', name: 'Турецкая лира', symbol: '₺' },
  { code: 'UAH', name: 'Украинская гривна', symbol: '₴' },
  { code: 'ZAR', name: 'Южноафриканский рэнд', symbol: 'R' },
];

interface CurrencySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CurrencySelect = ({
  value,
  onChange,
  placeholder = 'Выберите валюту',
  disabled = false,
}: CurrencySelectProps): JSX.Element => {
  const selectedCurrency = CURRENCIES.find(
    (currency) => currency.code === value
  );

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {CURRENCIES.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.code} - {currency.name} ({currency.symbol})
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400"
      />
    </div>
  );
};
