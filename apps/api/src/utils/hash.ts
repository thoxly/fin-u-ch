import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Вычисляет SHA256 хэш от строки данных
 * @param data - данные для хэширования
 * @returns hex строка хэша
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Вычисляет хэш от объекта (JSON.stringify)
 * @param obj - объект для хэширования
 * @returns hex строка хэша
 */
export function hashObject(obj: any): string {
  // Сортируем ключи для консистентности
  const sorted = JSON.stringify(obj, Object.keys(obj).sort());
  return sha256(sorted);
}

/**
 * Хэширует пароль с использованием bcrypt
 * @param password - пароль для хэширования
 * @returns хэш пароля
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Проверяет пароль против хэша
 * @param password - пароль для проверки
 * @param hash - хэш для сравнения
 * @returns true, если пароль совпадает
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
