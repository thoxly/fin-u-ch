import { useState } from 'react';
import { Info } from 'lucide-react';
import { Input } from './Input';

interface PasswordInputProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  showValidation?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

interface PasswordRequirement {
  label: string;
  validate: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    label: 'Минимум 12 символов',
    validate: (password) => password.length >= 12,
  },
  {
    label: 'Минимум 1 строчная буква',
    validate: (password) => /[a-z]/.test(password),
  },
  {
    label: 'Минимум 1 заглавная буква',
    validate: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'Минимум 1 цифра',
    validate: (password) => /\d/.test(password),
  },
];

export const PasswordInput = ({
  label,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  showValidation = true,
  onValidationChange,
}: PasswordInputProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const requirements = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.validate(value),
  }));

  const isPasswordValid = requirements.every((req) => req.met);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // First propagate value change
    onChange(e);

    // Re-evaluate requirements based on the new value and notify parent
    if (onValidationChange) {
      const newRequirements = PASSWORD_REQUIREMENTS.map((req) =>
        req.validate(newValue)
      );
      const newIsValid = newRequirements.every(Boolean);
      onValidationChange(newIsValid);
    }
  };

  const handleFocus = () => setIsInputFocused(true);
  const handleBlur = () => setIsInputFocused(false);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          label={label}
          type="password"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className="pr-10" // Добавляем отступ справа для иконки
        />

        {showValidation && (
          <>
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded"
              title="Требования к паролю"
              style={{ top: label ? '70%' : '55%' }} // Корректировка позиции если есть лейбл
            >
              <Info size={18} />
            </button>

            {showTooltip && (
              <div
                className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-3">
                  Требования к паролю:
                </h4>
                <ul className="space-y-2">
                  {requirements.map((req, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <span
                        className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                          req.met
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            req.met
                              ? 'bg-green-600 dark:bg-green-400'
                              : 'bg-gray-400 dark:bg-gray-600'
                          }`}
                        />
                      </span>
                      <span
                        className={
                          req.met
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }
                      >
                        {req.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Альтернативный вариант: показывать требования под полем ввода при фокусе */}
      {showValidation && isInputFocused && value && (
        <div className="mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
          <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-3">
            Требования к паролю:
          </h4>
          <ul className="space-y-2">
            {requirements.map((req, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                <span
                  className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                    req.met
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      req.met
                        ? 'bg-green-600 dark:bg-green-400'
                        : 'bg-gray-400 dark:bg-gray-600'
                    }`}
                  />
                </span>
                <span
                  className={
                    req.met
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }
                >
                  {req.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
