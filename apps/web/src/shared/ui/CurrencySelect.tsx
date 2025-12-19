import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { CURRENCIES } from '@fin-u-ch/shared';
import { classNames } from '../lib/utils';

interface CurrencySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  required?: boolean;
}

export const CurrencySelect = ({
  value,
  onChange,
  placeholder = 'Выберите валюту',
  disabled = false,
  label,
  error,
  required,
}: CurrencySelectProps): JSX.Element => {
  const selectedCurrency =
    CURRENCIES.find((currency) => currency.code === value) || null;
  const displayValue = selectedCurrency
    ? `${selectedCurrency.code} - ${selectedCurrency.name} (${selectedCurrency.symbol})`
    : placeholder;

  const handleChange = (currency: (typeof CURRENCIES)[0] | null) => {
    if (onChange && currency) {
      onChange(currency.code);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative w-full">
        <Listbox
          value={selectedCurrency}
          onChange={handleChange}
          disabled={disabled}
        >
          <div className="relative">
            <Listbox.Button
              className={classNames(
                'w-full px-3 py-2 pr-10 border rounded-lg',
                'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                'dark:border-gray-600 dark:bg-gray-800 dark:text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'appearance-none',
                'flex items-center justify-between',
                'text-left',
                !selectedCurrency && 'text-gray-400 dark:text-gray-500',
                'bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700',
                error && 'border-red-500 dark:border-red-500'
              )}
            >
              <span className="block truncate">{displayValue}</span>
              <ChevronUpDownIcon
                className="w-4 h-4 ml-2 text-gray-400 dark:text-gray-500 flex-shrink-0"
                aria-hidden="true"
              />
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 shadow-lg focus:outline-none">
                {CURRENCIES.map((currency) => (
                  <Listbox.Option
                    key={currency.code}
                    value={currency}
                    className={({ active }) =>
                      classNames(
                        'relative cursor-pointer select-none py-2 pl-3 pr-9',
                        active
                          ? 'bg-primary-100 dark:bg-zinc-800 text-primary-900 dark:text-white'
                          : 'text-gray-900 dark:text-gray-100'
                      )
                    }
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={classNames(
                            'block truncate',
                            selected ? 'font-medium' : 'font-normal'
                          )}
                        >
                          {currency.code} - {currency.name} ({currency.symbol})
                        </span>
                        {selected ? (
                          <span
                            className={classNames(
                              'absolute inset-y-0 right-0 flex items-center pr-3',
                              active
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-primary-600 dark:text-primary-400'
                            )}
                          >
                            <CheckIcon className="w-5 h-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
