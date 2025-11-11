import { useState, FormEvent } from 'react';
import {
  X,
  Mail,
  Phone,
  MessageCircle,
  User,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../shared/ui/Modal';
import { Button } from '../shared/ui/Button';
import { useNotification } from '../shared/hooks/useNotification';
import { useRequestDemoMutation } from '../store/api/demoApi';

interface DemoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoRequestModal = ({
  isOpen,
  onClose,
}: DemoRequestModalProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [consentPersonalData, setConsentPersonalData] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { showSuccess, showError } = useNotification();
  const [requestDemo, { isLoading }] = useRequestDemoMutation();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Имя обязательно
    if (!name.trim()) {
      newErrors.name = 'Имя обязательно для заполнения';
    }

    // Хотя бы один канал связи обязателен
    const hasContact = phone.trim() || email.trim() || telegram.trim();
    if (!hasContact) {
      newErrors.contact =
        'Укажите хотя бы один способ связи: телефон, email или Telegram';
    }

    // Валидация email если указан
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Введите корректный email адрес';
    }

    // Валидация телефона если указан
    if (phone.trim() && !/^[\d\s\-+()]+$/.test(phone)) {
      newErrors.phone = 'Введите корректный номер телефона';
    }

    // Согласие на обработку персональных данных обязательно
    if (!consentPersonalData) {
      newErrors.consentPersonalData =
        'Необходимо согласие на обработку персональных данных';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      await requestDemo({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        telegram: telegram.trim() || undefined,
        consentMarketing,
      }).unwrap();

      setIsSubmitted(true);
      showSuccess(
        'Запрос отправлен! Мы свяжемся с вами в ближайшее время.',
        'Спасибо за интерес к Vect-a'
      );
    } catch (error: unknown) {
      console.error('Failed to submit demo request:', error);
      showError(
        'Не удалось отправить запрос. Попробуйте позже или свяжитесь с нами напрямую.'
      );
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setPhone('');
      setEmail('');
      setTelegram('');
      setConsentPersonalData(false);
      setConsentMarketing(false);
      setErrors({});
      setIsSubmitted(false);
      onClose();
    }
  };

  if (isSubmitted) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} size="md">
        <div className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Спасибо за ваш запрос!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Мы получили вашу заявку на демонстрацию. Наш менеджер свяжется с
            вами в ближайшее время.
          </p>
          <Button
            variant="primary"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Закрыть
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="relative">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400 px-6 py-8 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Запросить демонстрацию
              </h2>
              <p className="text-white/90 text-sm sm:text-base">
                Мы покажем, как задачи вашего бизнеса можно решить с помощью
                Vect-a
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-white/80 hover:text-white transition-colors disabled:opacity-50 ml-4"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name field */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Имя <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                className={`input pl-10 ${errors.name ? 'input-error' : ''}`}
                placeholder="Ваше имя"
                disabled={isLoading}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.name}
              </p>
            )}
          </div>

          {/* Contact fields */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Телефон
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors({ ...errors, phone: '' });
                    if (errors.contact) setErrors({ ...errors, contact: '' });
                  }}
                  className={`input pl-10 ${errors.phone ? 'input-error' : ''}`}
                  placeholder="+7 (999) 123-45-67"
                  disabled={isLoading}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                    if (errors.contact) setErrors({ ...errors, contact: '' });
                  }}
                  className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                  placeholder="your@email.com"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="telegram"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Telegram
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MessageCircle className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="telegram"
                  type="text"
                  value={telegram}
                  onChange={(e) => {
                    setTelegram(e.target.value);
                    if (errors.contact) setErrors({ ...errors, contact: '' });
                  }}
                  className="input pl-10"
                  placeholder="@username"
                  disabled={isLoading}
                />
              </div>
            </div>

            {errors.contact && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.contact}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Укажите хотя бы один способ связи
            </p>
          </div>

          {/* Checkboxes */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consentPersonalData}
                onChange={(e) => {
                  setConsentPersonalData(e.target.checked);
                  if (errors.consentPersonalData) {
                    setErrors({ ...errors, consentPersonalData: '' });
                  }
                }}
                disabled={isLoading}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                Заполняя форму, вы даете согласие на обработку персональных
                данных <span className="text-red-500">*</span>
              </span>
            </label>
            {errors.consentPersonalData && (
              <p className="text-sm text-red-600 dark:text-red-400 -mt-2">
                {errors.consentPersonalData}
              </p>
            )}

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consentMarketing}
                onChange={(e) => setConsentMarketing(e.target.checked)}
                disabled={isLoading}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                Соглашаюсь на получение информационных и рекламных рассылок
              </span>
            </label>
          </div>

          {/* Submit button */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600"
            >
              {isLoading ? 'Отправка...' : 'Запросить демонстрацию'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
