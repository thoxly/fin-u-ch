import { InputHTMLAttributes, forwardRef } from 'react';
import { classNames } from '../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = true, className, ...props }, ref) => {
    return (
      <div className={classNames(fullWidth && 'w-full')}>
        {label && <label className="label">{label}</label>}
        <input
          ref={ref}
          className={classNames('input', error && 'input-error', className)}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
