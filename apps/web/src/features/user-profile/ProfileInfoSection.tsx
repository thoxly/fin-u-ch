import { Input } from '../../shared/ui/Input';

interface ProfileInfoSectionProps {
  firstName: string;
  lastName: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
}

export const ProfileInfoSection = ({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
}: ProfileInfoSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
  );
};
