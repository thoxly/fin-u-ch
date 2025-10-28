import { ChevronDown } from 'lucide-react';
import { CURRENCIES } from '@fin-u-ch/shared';

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
  // const selectedCurrency = CURRENCIES.find(
  //   (currency) => currency.code === value
  // );

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
