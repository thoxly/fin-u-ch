import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Receipt,
  Calendar,
  BarChart3,
  Smartphone,
} from 'lucide-react';
import { Button } from '../shared/ui/Button';
import { SmartLoginButton } from '../components/SmartLoginButton';
import { DemoRequestModal } from '../components/DemoRequestModal';
import { useIsDarkMode } from '../shared/hooks/useIsDarkMode';

// Функция для получения пути к скриншоту в зависимости от темы
const getScreenshot = (name: string, isDark: boolean): string => {
  const theme = isDark ? 'dark' : 'light';
  return `/images/landing/${theme}/${name}`;
};

export const LandingPage = () => {
  const isDark = useIsDarkMode();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

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

      {/* Hero Block */}
      <section className="relative text-center py-16 sm:py-24 md:py-32 overflow-hidden px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(99,102,241,0.15),transparent_70%)] animate-pulse"></div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold mb-4 sm:mb-6 tracking-tight"
        >
          Контролируйте деньги бизнеса легко
          <br />
          <span className="bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-400 bg-clip-text text-transparent">
            Полный учёт доходов и расходов в одном сервисе
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-10 max-w-2xl mx-auto"
        >
          Vect-a помогает предпринимателям видеть денежный поток, планировать
          бюджеты и принимать решения на основе данных.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4"
        >
          <Link to="/register" className="w-full sm:w-auto inline-block">
            <Button
              variant="primary"
              size="md"
              className="px-6 py-3 sm:px-8 sm:py-4 w-full sm:w-auto bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-100"
            >
              Попробовать бесплатно
            </Button>
          </Link>
          <button
            onClick={() => setIsDemoModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 active:bg-gray-100 dark:active:bg-gray-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-100 font-medium"
          >
            Запросить демонстрацию
          </button>
        </motion.div>
      </section>

      {/* Advantages Block - Cards with Icons Only */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 md:mb-16 px-4">
          Всё необходимое для учёта финансов
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-7xl mx-auto">
          {[
            {
              icon: LayoutDashboard,
              title: 'Дашборд',
              description:
                'Поступления, списания, остатки и чистый поток — всё в одном экране с наглядными графиками.',
            },
            {
              icon: Receipt,
              title: 'Учёт операций',
              description:
                'Добавляйте поступления и списания, настраивайте фильтры и ведите полный учёт всех операций.',
            },
            {
              icon: Calendar,
              title: 'Планирование бюджета',
              description:
                'Составляйте планы по месяцам, отслеживайте исполнение и сравнивайте план с фактом.',
            },
            {
              icon: BarChart3,
              title: 'Отчёты',
              description:
                'Анализируйте движение денежных средств, экспортируйте данные в Excel для партнёров.',
            },
          ].map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-md rounded-xl md:rounded-2xl shadow-lg p-6 transition-all"
              >
                <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-lg bg-blue-500/10 dark:bg-blue-400/10">
                  <IconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg sm:text-xl mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* How It Works Block */}
      <section className="relative bg-gradient-to-r from-indigo-50 via-sky-50 to-transparent dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 md:mb-16 px-4">
            Как это работает
          </h2>
          <div className="max-w-5xl mx-auto space-y-12 md:space-y-16">
            {[
              {
                step: '1',
                title: 'Добавьте операции',
                description:
                  'Вносите поступления и списания вручную или используйте шаблоны. Настраивайте периодические операции для автоматизации.',
                screenshot: 'add_operation_d.png',
                screenshotLight: 'add_operation_l.png',
                align: 'left' as const,
              },
              {
                step: '2',
                title: 'Планируйте бюджеты',
                description:
                  'Создавайте планы по месяцам, отслеживайте исполнение и сравнивайте с фактическими показателями.',
                screenshot: 'mini_plan_budget_d.png',
                screenshotLight: 'mini_plan_budget_l.png',
                align: 'right' as const,
              },
              {
                step: '3',
                title: 'Анализируйте отчёты',
                description:
                  'Просматривайте графики денежного потока, динамику поступлений и списаний. Экспортируйте данные для отчётности.',
                screenshot: 'chashflow_graph_d.png',
                screenshotLight: 'cashflow_graph_l.png',
                align: 'left' as const,
              },
            ].map((item, index) => {
              const screenshotPath = isDark
                ? getScreenshot(item.screenshot, true)
                : getScreenshot(item.screenshotLight, false);
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: item.align === 'left' ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-150px' }}
                  transition={{ delay: index * 0.2 }}
                  className={`flex flex-col ${
                    item.align === 'right'
                      ? 'md:flex-row-reverse'
                      : 'md:flex-row'
                  } items-center gap-6 md:gap-8`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white font-bold text-xl">
                        {item.step}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex-1 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg">
                    <img
                      src={screenshotPath}
                      alt={item.title}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Screenshot Gallery */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 md:mb-16 px-4">
          Посмотрите, как это выглядит
        </h2>
        <div className="grid sm:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto">
          {[
            {
              screenshot: 'dashboard_d.png',
              screenshotLight: 'dashboard_l.png',
              title: 'Дашборд',
              description:
                'Обзор финансовых показателей, денежный поток и динамика поступлений и списаний в одном экране.',
            },
            {
              screenshot: 'add_operation_d.png',
              screenshotLight: 'add_operation_l.png',
              title: 'Операции',
              description:
                'Удобный интерфейс для добавления и управления операциями с фильтрами и поиском.',
            },
            {
              screenshot: 'budget_d.png',
              screenshotLight: 'budget_l.png',
              title: 'Бюджет',
              description:
                'Планирование и отслеживание бюджетов с возможностью сравнения плана и факта.',
            },
            {
              screenshot: 'reports_d.png',
              screenshotLight: 'reports_l.png',
              title: 'Отчёты',
              description:
                'Детальные отчёты о движении денежных средств с графиками и возможностью экспорта.',
            },
          ].map((item, index) => {
            const screenshotPath = isDark
              ? getScreenshot(item.screenshot, true)
              : getScreenshot(item.screenshotLight, false);
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-md rounded-xl md:rounded-2xl shadow-lg overflow-hidden"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={screenshotPath}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-lg sm:text-xl mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Mobile Version Block */}
      <section className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 py-12 sm:py-16 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              className="flex-1 text-center md:text-left"
            >
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <Smartphone className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  Финансовый учёт в вашем телефоне
                </h2>
              </div>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-6">
                Все функции доступны в мобильной версии: фиксация операций,
                просмотр отчётов, планирование бюджетов. Управляйте финансами
                бизнеса из любой точки мира.
              </p>
              <Link to="/register" className="inline-block">
                <Button
                  variant="primary"
                  size="md"
                  className="px-6 py-3 sm:px-8 sm:py-4 bg-blue-500 hover:bg-blue-600 rounded-lg"
                >
                  Попробовать бесплатно
                </Button>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              className="flex-1 flex justify-center"
            >
              <div className="relative max-w-sm">
                <div className="bg-gray-800 rounded-[3rem] p-4 shadow-2xl">
                  <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden aspect-[9/19]">
                    <img
                      src={
                        isDark
                          ? getScreenshot('mobile_d.png', true)
                          : getScreenshot('mobile_l.png', false)
                      }
                      alt="Мобильная версия"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA Block */}
      <section className="relative py-16 sm:py-20 md:py-28 bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400 text-white text-center overflow-hidden px-4">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_30%,white,transparent_70%)]"></div>
        <div className="relative container mx-auto px-4 sm:px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 sm:mb-6"
          >
            Готовы упорядочить финансы вашего бизнеса?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-lg text-white/90 mb-6 sm:mb-10 max-w-2xl mx-auto"
          >
            Быстрый старт, полный функционал и поддержка. Начните использовать
            Vect-a уже сегодня.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4"
          >
            <Link to="/register" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="md"
                className="px-6 py-3 sm:px-10 sm:py-4 text-base sm:text-lg font-semibold w-full sm:w-auto bg-white text-blue-600 hover:bg-gray-100 rounded-lg"
              >
                Попробовать бесплатно
              </Button>
            </Link>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="px-6 py-3 sm:px-10 sm:py-4 text-base sm:text-lg font-semibold w-full sm:w-auto border-2 border-white text-white hover:bg-white/20 rounded-lg bg-transparent transition-colors"
            >
              Запросить демонстрацию
            </button>
          </motion.div>
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
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            © 2025 Vect-a. Финансовый учёт
          </div>
        </div>
      </footer>

      {/* Demo Request Modal */}
      <DemoRequestModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
};
