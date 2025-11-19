import { ReactNode, useEffect, useState } from 'react';

interface FadeTransitionProps {
  show: boolean;
  children: ReactNode;
  duration?: number;
  className?: string;
}

export const FadeTransition = ({
  show,
  children,
  duration = 300,
  className = '',
}: FadeTransitionProps) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // Небольшая задержка для активации CSS transition
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Ждем завершения анимации перед unmount
      const timer = setTimeout(() => setShouldRender(false), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`transition-opacity ease-in-out ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        opacity: isVisible ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
};
