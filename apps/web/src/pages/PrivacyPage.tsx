import { Link } from 'react-router-dom';
import { Button } from '../shared/ui/Button';
import { SmartLoginButton } from '../components/SmartLoginButton';

export const PrivacyPage = () => {
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
            Политика конфиденциальности
          </h1>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p>
              Ваша конфиденциальность важна для нас. В этом документе описано,
              как мы собираем, используем и защищаем вашу информацию.
            </p>

            <h3>1. Сбор данных</h3>
            <p>
              Мы собираем только те данные, которые необходимы для работы
              сервиса: адрес электронной почты, данные профиля и финансовую
              информацию, которую вы вносите.
            </p>

            <h3>2. Использование данных</h3>
            <p>
              Ваши данные используются исключительно для предоставления вам
              услуг сервиса Vect-a, включая формирование отчетов и аналитики.
            </p>

            <h3>3. Защита данных</h3>
            <p>
              Мы применяем современные методы шифрования и защиты данных для
              предотвращения несанкционированного доступа.
            </p>

            <h3>4. Передача третьим лицам</h3>
            <p>
              Мы не продаем и не передаем ваши личные данные третьим лицам, за
              исключением случаев, предусмотренных законодательством.
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
