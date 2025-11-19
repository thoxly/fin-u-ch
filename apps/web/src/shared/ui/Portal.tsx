import { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
  containerId?: string;
}

/**
 * Portal компонент для рендеринга элементов за пределами DOM-иерархии родителя
 *
 * Используется для:
 * - Модальных окон
 * - Popover-ов
 * - Tooltip-ов
 * - Dropdown-ов
 *
 * Решает проблему обрезания элементов родительским overflow: hidden/auto
 */
export const Portal = ({
  children,
  containerId = 'portal-root',
}: PortalProps) => {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Ищем или создаем контейнер для портала
    let container = document.getElementById(containerId);

    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'relative';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    containerRef.current = container;

    return () => {
      // Не удаляем контейнер, так как он может использоваться другими порталами
      // Но можно добавить логику очистки при желании
    };
  }, [containerId]);

  if (!containerRef.current) {
    return null;
  }

  return createPortal(children, containerRef.current);
};
