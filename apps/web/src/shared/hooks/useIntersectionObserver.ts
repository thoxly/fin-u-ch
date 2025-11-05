import { useEffect, useRef, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  rootMargin?: string;
  threshold?: number;
  enabled?: boolean;
}

/**
 * Hook for observing element intersection with viewport
 * @param callback - Function to call when element intersects
 * @param options - IntersectionObserver options
 * @returns Ref to attach to the element to observe
 */
export const useIntersectionObserver = <T extends HTMLElement = HTMLDivElement>(
  callback: (entry: IntersectionObserverEntry) => void,
  options: UseIntersectionObserverOptions = {}
): RefObject<T> => {
  const { rootMargin = '200px', threshold, enabled = true } = options;
  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          callback(entry);
        }
      },
      { rootMargin, threshold }
    );

    const currentElement = elementRef.current;
    observer.observe(currentElement);

    return () => {
      if (currentElement) {
        observer.disconnect();
      }
    };
  }, [callback, rootMargin, threshold, enabled]);

  return elementRef;
};
