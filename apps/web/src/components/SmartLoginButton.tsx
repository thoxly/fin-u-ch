import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { Button } from '../shared/ui/Button';

interface SmartLoginButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

export const SmartLoginButton = ({
  variant = 'secondary',
  size = 'md',
  className,
  children,
}: SmartLoginButtonProps) => {
  const navigate = useNavigate();
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth?.isAuthenticated ?? false
  );

  const handleClick = () => {
    if (isAuthenticated) {
      // Если пользователь уже авторизован, перенаправляем на первую доступную страницу
      navigate('/redirect', { replace: true });
    } else {
      // Если не авторизован, переходим на страницу входа
      navigate('/login');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
};
