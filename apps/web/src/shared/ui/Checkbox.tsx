import { InputHTMLAttributes, forwardRef, ReactNode, useId } from 'react';
import { classNames } from '../lib/utils';

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className={className}>
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              ref={ref}
              id={inputId}
              type="checkbox"
              aria-describedby={errorId}
              aria-invalid={error ? 'true' : undefined}
              className={classNames(
                'h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800',
                error &&
                  'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500',
                className
              )}
              {...props}
            />
          </div>
          {label && (
            <div className="ml-3 text-sm">
              <label
                htmlFor={inputId}
                className="font-medium text-gray-700 dark:text-gray-300"
              >
                {label}
              </label>
            </div>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="mt-1 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
