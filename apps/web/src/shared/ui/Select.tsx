import { SelectHTMLAttributes, forwardRef, Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { classNames } from '../lib/utils';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
  onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder,
      fullWidth = true,
      className,
      value,
      onChange,
      disabled,
      required,
      ..._props
    },
    _ref
  ) => {
    const selectedOption = options?.find((opt) => opt.value === value) || null;
    const displayValue = selectedOption
      ? selectedOption.label
      : placeholder || '';

    const handleChange = (option: SelectOption | null) => {
      if (onChange && option) {
        onChange(String(option.value));
      }
    };

    return (
      <div className={classNames(fullWidth && 'w-full')}>
        {label && (
          <label className="label">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <Listbox
          value={selectedOption}
          onChange={handleChange}
          disabled={disabled}
        >
          <div className="relative">
            <Listbox.Button
              className={classNames(
                'input',
                'flex items-center justify-between',
                'text-left',
                error && 'input-error',
                disabled && 'opacity-50 cursor-not-allowed',
                !selectedOption && 'text-gray-400 dark:text-gray-500',
                className
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
                {options?.map((option) => (
                  <Listbox.Option
                    key={option.value}
                    value={option}
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
                          {option.label}
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
                )) || []}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
