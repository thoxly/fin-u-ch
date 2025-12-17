import { Link } from 'react-router-dom';
import { Button } from '../shared/ui/Button';
import { SmartLoginButton } from '../components/SmartLoginButton';

export const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 text-gray-900 dark:text-white scroll-smooth">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <nav className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <img
              src="/images/logo.png"
              alt="Vect-a"
              className="h-7 sm:h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <SmartLoginButton
              variant="secondary"
              size="sm"
              className="text-sm sm:text-base"
            >
              Войти
            </SmartLoginButton>
            <Link to="/register">
              <Button
                variant="primary"
                size="sm"
                className="text-sm sm:text-base"
              >
                Регистрация
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto bg-white/80 dark:bg-gray-800/50 backdrop-blur-md rounded-xl md:rounded-2xl shadow-lg p-6 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">
            Пользовательское соглашение
          </h1>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p>
              Добро пожаловать в Vect-a. Используя наш сервис, вы соглашаетесь с
              данными условиями.
            </p>

            <h3>1. Общие положения</h3>
            <p>
              Данное соглашение регулирует отношения между сервисом Vect-a и
              пользователем. Регистрируясь в сервисе, вы подтверждаете свое
              согласие с условиями данного соглашения.
            </p>

            <h3>2. Использование сервиса</h3>
            <p>
              Сервис предоставляется "как есть". Мы прилагаем все усилия для
              обеспечения бесперебойной работы, но не гарантируем отсутствие
              ошибок или временных сбоев.
            </p>

            <h3>3. Конфиденциальность</h3>
            <p>
              Мы серьезно относимся к защите ваших данных. Подробнее читайте в
              нашей Политике конфиденциальности.
            </p>

            <h3>4. Изменения условий</h3>
            <p>
              Мы оставляем за собой право вносить изменения в данное соглашение.
              Актуальная версия всегда доступна на этой странице.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-10 border-t border-gray-200 dark:border-gray-700 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/logo.png"
              alt="Vect-a"
              className="h-7 sm:h-8 w-auto"
            />
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            © 2025 Vect-a. Финансовый учёт
          </div>
        </div>
      </footer>
    </div>
  );
};
