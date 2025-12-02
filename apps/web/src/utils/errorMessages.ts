/**
 * Утилиты для обработки сообщений об ошибках
 * Удаляет системную информацию и преобразует технические сообщения в пользовательские
 */

/**
 * Удаляет ID операций и другие системные идентификаторы из сообщения
 */
const removeSystemIds = (message: string): string => {
  // Удаляем паттерны типа "Операция 123:" или "Операция abc-def-123:"
  return message.replace(/Операция\s+[\w-]+:\s*/gi, '');
};

/**
 * Преобразует технические сообщения об ошибках в пользовательские
 */
const translateTechnicalMessage = (message: string): string => {
  const technicalMessages: Record<string, string> = {
    // Prisma ошибки
    'Unique constraint failed': 'Запись с такими данными уже существует',
    'Record to update not found': 'Запись не найдена',
    'Record to delete does not exist': 'Запись не найдена',
    'Foreign key constraint failed': 'Связанная запись не найдена',

    // Валидация
    'Invalid input': 'Некорректные данные',
    'Required field': 'Обязательное поле не заполнено',
    'Invalid format': 'Некорректный формат данных',

    // Общие технические сообщения
    'already processed': 'уже обработана',
    'not found': 'не найдена',
    'Internal server error': 'Внутренняя ошибка сервера',
    'Network error': 'Ошибка сети',

    // Аутентификация
    'User account is inactive': 'Аккаунт деактивирован',
    'Invalid email or password': 'Неверный email или пароль',
    'Token expired': 'Сессия истекла',
    Unauthorized: 'Требуется авторизация',
  };

  // Проверяем точное совпадение
  if (technicalMessages[message]) {
    return technicalMessages[message];
  }

  // Проверяем частичное совпадение
  for (const [key, value] of Object.entries(technicalMessages)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return message;
};

/**
 * Очищает сообщение об ошибке от системной информации
 * и преобразует его в пользовательское сообщение
 */
export const sanitizeErrorMessage = (message: string): string => {
  if (!message || typeof message !== 'string') {
    return 'Произошла ошибка';
  }

  // Удаляем системные ID
  let cleaned = removeSystemIds(message);

  // Преобразуем технические сообщения
  cleaned = translateTechnicalMessage(cleaned);

  // Удаляем технические детали в скобках или после двоеточия
  // Например: "Error: Invalid input" -> "Invalid input"
  cleaned = cleaned.replace(/^[^:]+:\s*/i, '');

  // Удаляем stack traces (если они случайно попали)
  cleaned = cleaned.split('\n')[0].trim();

  // Если сообщение слишком техническое и короткое, заменяем на общее
  if (cleaned.length < 10 || /^[A-Z_]+$/.test(cleaned)) {
    return 'Произошла ошибка при выполнении операции';
  }

  return cleaned;
};

/**
 * Очищает массив сообщений об ошибках от системной информации
 */
export const sanitizeErrorMessages = (messages: string[]): string[] => {
  return messages
    .map(sanitizeErrorMessage)
    .filter((msg, index, arr) => arr.indexOf(msg) === index) // Убираем дубликаты
    .slice(0, 5); // Ограничиваем количество
};

/**
 * Очищает сообщение об ошибке и возвращает его, если оно содержит полезную информацию,
 * иначе возвращает дефолтное сообщение
 */
export const sanitizeErrorMessageWithDefault = (
  message: string | undefined | null,
  defaultMessage: string
): string => {
  if (!message || typeof message !== 'string') {
    return defaultMessage;
  }

  // Очищаем системную информацию
  const sanitized = message
    .replace(/Операция\s+[\w-]+:\s*/gi, '')
    .replace(/^[^:]+:\s*/i, '')
    .trim();

  // Проверяем, содержит ли сообщение полезную информацию
  if (sanitized && sanitized.length > 5 && !sanitized.match(/^[A-Z_]+$/)) {
    return sanitized;
  }

  return defaultMessage;
};
