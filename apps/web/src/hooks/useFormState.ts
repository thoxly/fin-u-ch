// packages/shared/src/hooks/useFormState.ts
import { useState, useEffect } from 'react';

/**
 * Хук для управления локальным состоянием формы с автоматической синхронизацией
 * с внешним объектом (например, редактируемой сущностью из API).
 *
 * Используется в формах справочников (ArticleForm, AccountForm и др.)
 * для корректного обновления полей при переключении между сущностями.
 *
 * @template T - Тип формы (объект с полями)
 * @param initialValues - Значения по умолчанию (для создания новой сущности)
 * @param item - Текущая редактируемая сущность (null при создании)
 * @returns [state, setState] — текущее состояние и сеттер
 */
export const useFormState = <T extends object>(
  initialValues: T,
  item: T | null
) => {
  const [state, setState] = useState<T>(initialValues);

  useEffect(() => {
    if (item !== null) {
      // Режим редактирования: подтягиваем данные из item
      setState({ ...initialValues, ...item });
    } else {
      // Режим создания: сбрасываем к значениям по умолчанию
      setState(initialValues);
    }
  }, [item, initialValues]);

  return [state, setState] as const;
};
