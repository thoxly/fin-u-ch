import { ReactNode } from 'react';
import { classNames } from '../lib/utils';

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export const Card = ({ children, title, className }: CardProps) => {
  return (
    <div className={classNames('card', className)}>
      {title && (
        <h3 className="text-base font-semibold mb-4 text-gray-900 dark:text-white">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};
