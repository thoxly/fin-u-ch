import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';

interface EmailChangeSectionProps {
  currentEmail: string;
  onRequestEmailChange: (newEmail: string) => Promise<void>;
  isLoading: boolean;
}

export const EmailChangeSection = ({
  currentEmail,
  onRequestEmailChange,
  isLoading,
}: EmailChangeSectionProps) => {
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const handleRequestEmailChange = async (): Promise<void> => {
    try {
      if (!newEmail || newEmail === currentEmail) {
        alert('Введите новый email, отличный от текущего');
        return;
      }

      await onRequestEmailChange(newEmail);
      setShowChangeEmail(false);
      setNewEmail('');
    } catch (error: unknown) {
      const errorMessage = (error as { data?: { message?: string } })?.data
        ?.message;
      alert(errorMessage || 'Ошибка при запросе изменения email');
    }
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Email
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowChangeEmail(!showChangeEmail)}
        >
          Изменить email
        </Button>
      </div>
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <Mail size={16} />
        <span>{currentEmail}</span>
      </div>

      {showChangeEmail && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Новый email
            </label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Введите новый email"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowChangeEmail(false);
                setNewEmail('');
              }}
            >
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={handleRequestEmailChange}
              disabled={isLoading}
            >
              {isLoading ? 'Отправка...' : 'Отправить запрос'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            На ваш текущий email будет отправлено письмо с подтверждением
          </p>
        </div>
      )}
    </div>
  );
};
