import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Получает ключ шифрования из переменной окружения
 * Если не задан, генерирует предупреждение и использует дефолтный (небезопасно для продакшена)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    console.warn(
      '⚠️  ENCRYPTION_KEY не задан в переменных окружения. Используется дефолтный ключ (небезопасно для продакшена!)'
    );
    // Дефолтный ключ для разработки (32 байта)
    return crypto.scryptSync(
      'default-dev-key-change-in-production',
      'salt',
      KEY_LENGTH
    );
  }

  // Если ключ задан как hex строка
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }

  // Иначе используем scrypt для генерации ключа из строки
  return crypto.scryptSync(key, 'salt', KEY_LENGTH);
}

/**
 * Шифрует строку с использованием AES-256-GCM
 * @param text - текст для шифрования
 * @returns зашифрованная строка в формате base64 (iv:salt:tag:encrypted)
 */
export function encrypt(text: string): string {
  if (!text) {
    return text;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Генерируем ключ из пароля и соли
  // Используем исходный ключ (Buffer) для генерации derived key
  const keyString = key instanceof Buffer ? key.toString('hex') : key;
  const derivedKey = crypto.scryptSync(keyString, salt, KEY_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const tag = cipher.getAuthTag();

  // Формат: iv:salt:tag:encrypted (все в base64)
  return `${iv.toString('base64')}:${salt.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
}

/**
 * Расшифровывает строку, зашифрованную с использованием AES-256-GCM
 * @param encryptedText - зашифрованная строка в формате base64 (iv:salt:tag:encrypted)
 * @returns расшифрованная строка
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    return encryptedText;
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 4) {
      // Если формат неверный, это может быть:
      // 1. Незашифрованное значение (для обратной совместимости со старыми данными)
      // 2. Неправильно зашифрованное значение
      // Проверяем длину: если очень длинное (> 100 символов), вероятно это зашифрованное значение с ошибкой
      if (encryptedText.length > 100) {
        throw new Error(
          `Неверный формат зашифрованного значения (ожидается формат "iv:salt:tag:encrypted" с 4 частями через ":")`
        );
      }
      // Если короткое, возможно это незашифрованное значение (для обратной совместимости)
      console.warn(
        '⚠️  Попытка расшифровать незашифрованное значение (для обратной совместимости)'
      );
      return encryptedText;
    }

    const [ivBase64, saltBase64, tagBase64, encrypted] = parts;

    const iv = Buffer.from(ivBase64, 'base64');
    const salt = Buffer.from(saltBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');

    // Генерируем ключ из пароля и соли
    // Используем исходный ключ (Buffer) для генерации derived key
    const keyString = key instanceof Buffer ? key.toString('hex') : key;
    const derivedKey = crypto.scryptSync(keyString, salt, KEY_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    console.error('Ошибка при расшифровке:', error.message);
    // Если не удалось расшифровать, выбрасываем ошибку
    // Это предотвратит использование зашифрованной строки как API ключа
    throw new Error(`Не удалось расшифровать значение: ${error.message}`);
  }
}
