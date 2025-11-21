import { Action } from '../types';

/**
 * Иерархия действий: высокие права автоматически включают низкие
 *
 * Например:
 * - delete включает update и read
 * - update включает read
 * - create включает read (для загрузки связанных данных)
 *
 * При добавлении нового действия обновите эту конфигурацию
 */
export const ACTION_HIERARCHY: Record<Action, Action[]> = {
  // Базовое действие (не включает другие)
  read: [],

  // Создание обычно требует чтения (для загрузки связанных данных в формах)
  create: ['read'],

  // Обновление включает чтение
  update: ['read'],

  // Удаление включает обновление и чтение
  delete: ['update', 'read'],

  // Специальные действия для операций
  confirm: ['read'],
  cancel: ['read'],

  // Экспорт данных
  export: ['read'],

  // Управление ролями (специальное право для пользователей)
  manage_roles: ['read'],
};

/**
 * Проверяет, включает ли действие другое действие по иерархии
 *
 * @example
 * includesAction('delete', 'read') // true - delete включает read
 * includesAction('read', 'delete') // false - read не включает delete
 * includesAction('update', 'read') // true - update включает read
 *
 * @param higherAction Действие с более высокими правами
 * @param lowerAction Действие с более низкими правами
 * @returns true, если higherAction включает lowerAction
 */
export function includesAction(
  higherAction: Action,
  lowerAction: Action
): boolean {
  // Действие всегда включает само себя
  if (higherAction === lowerAction) return true;

  // Проверяем прямое включение
  const included = ACTION_HIERARCHY[higherAction] || [];
  if (included.includes(lowerAction)) return true;

  // Проверяем транзитивное включение (например, delete → update → read)
  for (const intermediateAction of included) {
    if (includesAction(intermediateAction, lowerAction)) {
      return true;
    }
  }

  return false;
}

/**
 * Возвращает все действия, которые включает данное действие
 * (включая транзитивные зависимости)
 *
 * @example
 * getImpliedActions('delete') // ['update', 'read']
 * getImpliedActions('update') // ['read']
 * getImpliedActions('read') // []
 *
 * @param action Действие, для которого нужно получить список включаемых действий
 * @returns Массив действий, которые автоматически включены
 */
export function getImpliedActions(action: Action): Action[] {
  const result: Set<Action> = new Set();
  const queue: Action[] = [action];
  const visited: Set<Action> = new Set();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const implied = ACTION_HIERARCHY[current] || [];
    for (const impliedAction of implied) {
      result.add(impliedAction);
      queue.push(impliedAction);
    }
  }

  return Array.from(result);
}

/**
 * Находит минимальный набор действий, которые нужно явно указать,
 * чтобы получить все желаемые действия (с учетом иерархии)
 *
 * @example
 * minimizeActions(['read', 'update', 'delete']) // ['delete'] - delete включает остальные
 * minimizeActions(['read', 'create']) // ['create'] - create включает read
 *
 * @param actions Список действий
 * @returns Минимальный набор действий
 */
export function minimizeActions(actions: Action[]): Action[] {
  const result: Action[] = [];

  for (const action of actions) {
    // Проверяем, не включается ли это действие каким-то другим
    const isIncludedByOther = actions.some(
      (otherAction) =>
        otherAction !== action && includesAction(otherAction, action)
    );

    if (!isIncludedByOther) {
      result.push(action);
    }
  }

  return result;
}
