import { Building } from 'lucide-react';
import { Input } from '../../shared/ui/Input';
import { CurrencySelect } from '../../shared/ui/CurrencySelect';

interface ProfileInfoSectionProps {
  firstName: string;
  lastName: string;
  companyName: string;
  companyInn?: string | null;
  currencyBase: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onCompanyNameChange: (value: string) => void;
  onCompanyInnChange: (value: string) => void;
  onCurrencyBaseChange: (value: string) => void;
}

export const ProfileInfoSection = ({
  firstName,
  lastName,
  companyName,
  companyInn,
  currencyBase,
  onFirstNameChange,
  onLastNameChange,
  onCompanyNameChange,
  onCompanyInnChange,
  onCurrencyBaseChange,
}: ProfileInfoSectionProps) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Имя
          </label>
          <Input
            type="text"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            placeholder="Введите имя"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Фамилия
          </label>
          <Input
            type="text"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            placeholder="Введите фамилию"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Название компании
        </label>
        <Input
          type="text"
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          icon={<Building size={16} />}
          placeholder="Введите название компании"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          ИНН
        </label>
        <Input
          type="text"
          value={companyInn || ''}
          onChange={(e) => onCompanyInnChange(e.target.value)}
          placeholder="Введите ИНН компании"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Базовая валюта
        </label>
        <CurrencySelect
          value={currencyBase}
          onChange={(value) => onCurrencyBaseChange(value)}
          placeholder="Выберите базовую валюту"
        />
      </div>
    </>
  );
};
