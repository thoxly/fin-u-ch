import { ReactNode } from 'react';
import * as Icons from 'lucide-react';
import { classNames } from '../lib/utils';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  className?: string;
  fullHeight?: boolean;
  iconName?: keyof typeof Icons;
  icon?: ReactNode;
  actions?: ReactNode;
}

export const EmptyState = ({
  title,
  description,
  className,
  fullHeight = false,
  iconName = 'Inbox',
  icon,
  actions,
}: EmptyStateProps): JSX.Element => {
  const IconComponent = Icons[iconName] as Icons.LucideIcon | undefined;

  return (
    <div
      className={classNames(
        styles.container,
        fullHeight && styles.fullHeight,
        className
      )}
    >
      <div className={styles.inner}>
        {(icon || IconComponent) && (
          <div className={styles.icon}>
            {icon ? icon : IconComponent ? <IconComponent size={24} /> : null}
          </div>
        )}
        <h3 className={styles.title}>{title}</h3>
        {description && <div className={styles.description}>{description}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
};
