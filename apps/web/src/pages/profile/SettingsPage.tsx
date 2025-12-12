import { useState } from 'react';
import { ProfileLayout } from './ProfileLayout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import {
  useGetMeQuery,
  useDeleteMyAccountMutation,
  useLogoutMutation,
} from '../../store/api/authApi';
import { PersonalSettingsSection } from '../../features/user-profile/PersonalSettingsSection';
import { ConfirmDeleteModal } from '../../shared/ui/ConfirmDeleteModal';
import { useNotification } from '../../shared/hooks/useNotification';

export const SettingsPage = () => {
  const { data: user, isLoading: userLoading } = useGetMeQuery();
  const [deleteMyAccount, { isLoading: isDeletingAccount }] =
    useDeleteMyAccountMutation();
  const [logout] = useLogoutMutation();
  const { showSuccess, showError } = useNotification();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (userLoading) {
    return (
      <ProfileLayout>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2">Загрузка...</span>
        </div>
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout>
      <Card>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Основные настройки
            </h2>
            <PersonalSettingsSection />
          </div>

          <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-400">
              Опасная зона
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Эти действия необратимы. Будьте осторожны.
            </p>
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-red-700 dark:text-red-400">
                    Удалить аккаунт
                  </h3>
                  <p className="text-sm text-red-600/80 dark:text-red-400/70 mt-1">
                    Полностью удалить ваш аккаунт и все связанные данные.
                    Действие нельзя отменить.
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  Удалить аккаунт
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          try {
            await deleteMyAccount().unwrap();
            showSuccess('Ваш аккаунт был успешно удален');
            await logout();
            window.location.href = '/login';
          } catch (error) {
            console.error('Failed to delete account:', error);
            showError('Не удалось удалить аккаунт');
          }
        }}
        title="Удаление аккаунта"
        message="Вы уверены, что хотите удалить свой аккаунт? Это действие необратимо и приведет к потере доступа к системе."
        confirmText="Удалить навсегда"
        isLoading={isDeletingAccount}
      />
    </ProfileLayout>
  );
};
