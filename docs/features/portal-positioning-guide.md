# Руководство по позиционированию всплывающих окон через Portal

## Проблема: Обрезание popover родительским контейнером

### Почему это происходит?

#### 1. **CSS `overflow` на родителе**

Когда у родительского элемента установлено свойство `overflow`:

- `overflow: hidden` — полностью скрывает выходящий контент
- `overflow: auto` — показывает скроллбар, но всё равно обрезает
- `overflow: scroll` — аналогично auto

Все дочерние элементы, **даже с `position: absolute` или `position: fixed`**, будут обрезаться по границам этого родителя.

```css
/* Проблемный контейнер */
.table-container {
  overflow: auto; /* ← Вот причина! */
  max-height: 600px;
}
```

#### 2. **Stacking Context (Контекст наложения)**

Некоторые CSS-свойства создают новый **stacking context**, который изолирует позиционирование:

```css
/* Эти свойства создают новый stacking context */
.container {
  transform: translateZ(0); /* ← Даже identity transform! */
  filter: blur(0);
  perspective: 1000px;
  will-change: transform;
  contain: layout;
  isolation: isolate;
}
```

Когда между `position: fixed` элементом и `body` есть родитель с любым из этих свойств:

- `position: fixed` перестает привязываться к viewport
- Элемент привязывается к родителю с новым stacking context
- Результат: обрезание по границам родителя с overflow

#### 3. **DOM-иерархия**

```
body
└── table-container (overflow: auto) ← Проблема здесь
    └── table
        └── row
            └── cell
                └── popover (position: fixed) ← Обрезается!
```

Даже `position: fixed` не помогает, если в цепочке родителей есть элементы с специальными CSS-свойствами.

---

## Решение: React Portal

### Что такое Portal?

**Portal** — это способ рендерить дочерний элемент в другом месте DOM-дерева, **за пределами родительской иерархии**.

```tsx
import { createPortal } from 'react-dom';

// Рендерится в targetNode, но управляется из текущего компонента
createPortal(children, targetNode);
```

### Преимущества Portal:

✅ **Визуальная свобода** — элемент не зависит от родительского overflow  
✅ **Правильный z-index** — всегда поверх контента  
✅ **Событийная модель React** — события всплывают по React-дереву, а не DOM  
✅ **Context работает** — доступ к React Context из родительского компонента

---

## Реализация

### 1. Компонент Portal

Создан универсальный компонент `Portal.tsx`:

```tsx
import { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
  containerId?: string;
}

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
  }, [containerId]);

  if (!containerRef.current) {
    return null;
  }

  return createPortal(children, containerRef.current);
};
```

**Особенности реализации:**

- Автоматически создает контейнер в `body` если его нет
- Можно переиспользовать для разных popover-ов
- Контейнер не удаляется при размонтировании (может использоваться другими порталами)

### 2. Использование Portal в Popover

```tsx
import { Portal } from '../../shared/ui/Portal';

export const ApplySimilarPopover = ({ isOpen, ... }) => {
  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed bg-white rounded-lg shadow-xl"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: 10000, // Высокий z-index
        }}
      >
        {/* Содержимое popover */}
      </div>
    </Portal>
  );
};
```

### 3. Итоговая DOM-структура

**До (проблема):**

```html
<body>
  <div class="table-container" style="overflow: auto">
    <table>
      <tr>
        <td>
          <div class="popover" style="position: fixed">
            ← Обрезается родителем!
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
```

**После (решение):**

```html
<body>
  <div class="table-container" style="overflow: auto">
    <table>
      <tr>
        <td>
          <!-- Popover больше не здесь -->
        </td>
      </tr>
    </table>
  </div>

  <div id="portal-root">
    <div class="popover" style="position: fixed">
      ← Рендерится вне таблицы, не обрезается!
    </div>
  </div>
</body>
```

---

## Рекомендации по стилям

### 1. Position: fixed

```css
.popover {
  position: fixed; /* ← Привязка к viewport */
  top: 100px; /* Точные координаты от viewport */
  left: 200px;
  z-index: 10000; /* Высокий z-index */
}
```

**Преимущества `fixed`:**

- Координаты относительно viewport (не скроллятся)
- Не зависит от родителей с `position: relative`
- Предсказуемое поведение

**Альтернатива `absolute`:**

- Используется редко для popover
- Требует `position: relative` на родителе
- Скроллится вместе с контентом

### 2. Z-index стратегия

Рекомендуемые уровни z-index:

```css
/* Слои приложения */
.content {
  z-index: 1;
}
.header {
  z-index: 10;
}
.sidebar {
  z-index: 20;
}
.dropdown {
  z-index: 100;
}
.tooltip {
  z-index: 500;
}
.modal-backdrop {
  z-index: 1000;
}
.modal {
  z-index: 1001;
}
.popover {
  z-index: 10000;
} /* ← Popover поверх всего */
```

### 3. Transform-origin для анимаций

```css
.popover {
  transform-origin: top left; /* Анимация от точки привязки */
  animation: popover-appear 0.2s ease-out;
}

@keyframes popover-appear {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

### 4. Адаптивное позиционирование

Умный расчет позиции с учетом границ viewport:

```tsx
useEffect(() => {
  if (!isOpen || !popoverRef.current) return;

  const updatePosition = () => {
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const padding = 16; // Отступ от краев

    // Вычисляем доступное место снизу и сверху
    const spaceBelow = viewportHeight - anchorPosition.top;
    const spaceAbove = anchorPosition.top;

    let top: number;

    // Открываем вниз, если есть место
    if (spaceBelow >= popoverRect.height + padding) {
      top = anchorPosition.top + 8;
    }
    // Иначе открываем вверх
    else if (spaceAbove >= popoverRect.height + padding) {
      top = anchorPosition.top - popoverRect.height - 8;
    }
    // Если места нет нигде - прижимаем к границе
    else {
      top = Math.max(
        padding,
        Math.min(
          viewportHeight - popoverRect.height - padding,
          anchorPosition.top
        )
      );
    }

    // Горизонтальное позиционирование
    let left = anchorPosition.left;
    if (left + popoverRect.width > viewportWidth - padding) {
      left = viewportWidth - popoverRect.width - padding;
    }
    if (left < padding) {
      left = padding;
    }

    setPositionStyle({ top: `${top}px`, left: `${left}px` });
  };

  // Двойной requestAnimationFrame для гарантии рендеринга
  requestAnimationFrame(() => {
    requestAnimationFrame(updatePosition);
  });
}, [isOpen, anchorPosition]);
```

---

## Частые проблемы и решения

### ❌ Проблема: Popover не закрывается при клике вне

**Причина:** Event listener слушает клики в исходном месте DOM, а popover теперь в другом месте.

**Решение:** Использовать `useEffect` с проверкой `popoverRef`:

```tsx
useEffect(() => {
  if (!isOpen) return;

  const handleClickOutside = (event: MouseEvent) => {
    if (
      popoverRef.current &&
      !popoverRef.current.contains(event.target as Node)
    ) {
      onClose();
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [isOpen, onClose]);
```

### ❌ Проблема: Координаты неправильные после скролла

**Причина:** Позиция вычислена один раз при открытии.

**Решение:** Пересчитывать позицию при скролле:

```tsx
useEffect(() => {
  if (!isOpen) return;

  const handleScroll = () => {
    updatePosition();
  };

  window.addEventListener('scroll', handleScroll, true);
  return () => window.removeEventListener('scroll', handleScroll, true);
}, [isOpen]);
```

### ❌ Проблема: Context недоступен в Portal

**Причина:** Обычно такой проблемы нет — Portal сохраняет React-иерархию.

**Решение:** Убедитесь что Portal внутри Provider:

```tsx
<ThemeProvider>
  <Portal>
    <Popover /> {/* ← Theme доступна */}
  </Portal>
</ThemeProvider>
```

---

## Итоговый чеклист

✅ Создан компонент `Portal.tsx`  
✅ Popover обернут в `<Portal>`  
✅ Используется `position: fixed`  
✅ Установлен высокий `z-index` (10000)  
✅ Реализовано умное позиционирование с учетом границ viewport  
✅ Обработка кликов вне через `useEffect` + `ref`  
✅ Пересчет позиции при изменении размера контента

---

## Дополнительные возможности

### Backdrop (затемнение фона)

```tsx
<Portal>
  {/* Полупрозрачный фон */}
  <div
    className="fixed inset-0 bg-black/20 backdrop-blur-sm"
    style={{ zIndex: 9999 }}
    onClick={onClose}
  />

  {/* Popover поверх backdrop */}
  <div className="fixed bg-white rounded-lg" style={{ zIndex: 10000 }}>
    {/* Контент */}
  </div>
</Portal>
```

### Анимация появления/исчезновения

```tsx
import { Transition } from 'react-transition-group';

<Portal>
  <Transition in={isOpen} timeout={200} unmountOnExit>
    {(state) => (
      <div
        style={{
          opacity: state === 'entered' ? 1 : 0,
          transform: state === 'entered' ? 'scale(1)' : 'scale(0.95)',
          transition: 'all 200ms ease-out',
        }}
      >
        {/* Контент */}
      </div>
    )}
  </Transition>
</Portal>;
```

---

## Заключение

**React Portal** — это стандартное и правильное решение для всплывающих элементов:

- Модальные окна
- Popover-ы
- Tooltip-ы
- Dropdown-ы
- Toast-уведомления

Использование Portal гарантирует:

- ✅ Отсутствие проблем с overflow
- ✅ Правильный z-index
- ✅ Предсказуемое позиционирование
- ✅ Легкая поддержка кода
