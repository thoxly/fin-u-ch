import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../shared/ui/Button';
import { SmartLoginButton } from '../components/SmartLoginButton';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 text-gray-900 dark:text-white scroll-smooth">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src="/images/logo.png"
              alt="Vect-a"
              className="h-7 sm:h-8 w-auto"
            />
          </div>
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

      {/* Hero */}
      <section className="relative text-center py-16 sm:py-24 md:py-32 overflow-hidden px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(99,102,241,0.15),transparent_70%)] animate-pulse"></div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold mb-4 sm:mb-6 tracking-tight"
        >
          Контролируйте деньги бизнеса
          <br />
          <span className="bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-400 bg-clip-text text-transparent">
            просто и понятно
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-10 max-w-2xl mx-auto"
        >
          Vect-a помогает предпринимателю видеть денежный поток, планировать
          бюджеты и принимать решения на основе фактов.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4"
        >
          <Link to="/demo" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="md"
              className="px-6 py-3 sm:px-8 sm:py-4 w-full sm:w-auto"
            >
              Запросить демонстрацию
            </Button>
          </Link>
          <Link to="/register" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              className="px-6 py-3 sm:px-8 sm:py-4 w-full sm:w-auto"
            >
              Попробовать бесплатно
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Problems */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 md:mb-16 px-4">
          Когда бизнесу нужен порядок в финансах
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-10 max-w-6xl mx-auto px-4">
          {[
            [
              '📉',
              'Непонятно, где деньги',
              'Доходы и расходы ведутся вручную, а итоги не сходятся.',
            ],
            [
              '📅',
              'Сложно планировать',
              'Бюджеты теряются между таблицами и задачами.',
            ],
            [
              '📊',
              'Нет ясной картины',
              'Решения принимаются на глаз — без цифр и отчетов.',
            ],
          ].map(([icon, title, text]) => (
            <motion.div
              key={title}
              whileHover={{ scale: 1.03, y: -6 }}
              className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-md rounded-xl md:rounded-2xl shadow-lg p-6 sm:p-8 transition-all"
            >
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{icon}</div>
              <h3 className="font-semibold text-lg sm:text-xl mb-1 sm:mb-2">
                {title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                {text}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative bg-gradient-to-r from-indigo-50 via-sky-50 to-transparent dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 md:mb-16 px-4">
            Как работает Vect-a
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-10 max-w-6xl mx-auto px-4">
            {[
              [
                '1️⃣',
                'Настройте статьи и счета',
                'Создайте структуру доходов и расходов под свой бизнес.',
              ],
              [
                '2️⃣',
                'Вносите операции',
                'Добавляйте поступления, платежи и переводы — быстро и удобно.',
              ],
              [
                '3️⃣',
                'Анализируйте результаты',
                'Дашборд покажет план-факт и остатки по счетам.',
              ],
            ].map(([num, title, text]) => (
              <motion.div
                key={title}
                whileHover={{ scale: 1.04 }}
                className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-md rounded-xl md:rounded-2xl shadow-lg p-6 sm:p-8"
              >
                <div className="text-3xl sm:text-4xl font-bold text-primary-600 mb-2 sm:mb-3">
                  {num}
                </div>
                <h3 className="font-semibold text-lg sm:text-xl mb-1 sm:mb-2">
                  {title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  {text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 md:mb-16 px-4">
          Что даёт Vect-a
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-10 max-w-6xl mx-auto px-4">
          {[
            [
              '📊',
              'Дашборд',
              'Доходы, расходы, остатки, чистый поток — в одном экране.',
            ],
            [
              '🧾',
              'План-факт анализ',
              'Сравнивайте запланированные и реальные показатели.',
            ],
            [
              '💰',
              'Бюджетирование',
              'Составляйте планы по месяцам и следите за исполнением.',
            ],
            [
              '📤',
              'Экспорт данных',
              'Выгрузка в Excel для партнёров и инвесторов.',
            ],
            [
              '🤝',
              'Совместная работа',
              'Делитесь доступом с партнёрами или бухгалтером.',
            ],
            [
              '🔄',
              'Импорт из банка (скоро)',
              'Автоматическая загрузка выписок без ручного труда.',
            ],
          ].map(([icon, title, text]) => (
            <motion.div
              key={title}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-md rounded-xl md:rounded-2xl shadow-lg p-6 sm:p-8 transition-all"
            >
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{icon}</div>
              <h3 className="font-semibold text-lg sm:text-xl mb-1 sm:mb-2">
                {title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                {text}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-16 sm:py-20 md:py-28 bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400 text-white text-center overflow-hidden px-4">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_30%,white,transparent_70%)]"></div>
        <div className="relative container mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 sm:mb-6">
            Увидьте движение денег как на ладони
          </h2>
          <p className="text-base sm:text-lg text-white/90 mb-6 sm:mb-10 max-w-2xl mx-auto">
            Закажите демонстрацию Vect-a — и убедитесь, как просто управлять
            финансами бизнеса.
          </p>
          <Link to="/demo" className="inline-block w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              className="px-6 py-3 sm:px-10 sm:py-4 text-base sm:text-lg font-semibold w-full sm:w-auto"
            >
              Запросить демонстрацию
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-10 border-t border-gray-200 dark:border-gray-700 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/logo.png"
              alt="Vect-a"
              className="h-7 sm:h-8 w-auto"
            />
            <span className="text-base sm:text-lg font-bold">Vect-a</span>
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            © 2025 Vect-a. Финансовый учёт для малого бизнеса.
          </div>
        </div>
      </footer>
    </div>
  );
};
