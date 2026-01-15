import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { InfoHint } from '../../shared/ui/InfoHint';
import { Periodicity } from '@fin-u-ch/shared';
import { OperationAdditionalFields } from './OperationAdditionalFields';

interface OperationRecurrenceSectionProps {
  description: string;
  repeat: Periodicity;
  recurrenceEndDate: string;
  onDescriptionChange: (value: string) => void;
  onRepeatChange: (value: Periodicity) => void;
  onEndDateChange: (value: string) => void;
}

const repeatOptions = [
  { value: Periodicity.NONE, label: 'Не повторяется' },
  { value: Periodicity.DAILY, label: 'Ежедневно' },
  { value: Periodicity.WEEKLY, label: 'Еженедельно' },
  { value: Periodicity.MONTHLY, label: 'Ежемесячно' },
  { value: Periodicity.QUARTERLY, label: 'Ежеквартально' },
  { value: Periodicity.SEMIANNUAL, label: 'Раз в полгода' },
  { value: Periodicity.ANNUAL, label: 'Ежегодно' },
];

export const OperationRecurrenceSection = ({
  description,
  repeat,
  recurrenceEndDate,
  onDescriptionChange,
  onRepeatChange,
  onEndDateChange,
}: OperationRecurrenceSectionProps) => {
  return (
    <div className="space-y-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Дополнительно
      </h3>
      <div className="space-y-4">
        <OperationAdditionalFields
          description={description}
          onDescriptionChange={onDescriptionChange}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Периодичность
              </label>
              <InfoHint
                content={
                  <div className="space-y-3 text-xs leading-relaxed">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">
                        Зачем это нужно?
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        Периодичность позволяет автоматически создавать
                        повторяющиеся операции (например, зарплата каждый месяц,
                        аренда каждый квартал).
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">
                        Как использовать?
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        Выберите частоту повтора (ежедневно, еженедельно,
                        ежемесячно и т.д.). Опционально укажите дату окончания —
                        если не указать, операции будут создаваться бесконечно.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">
                        Что будет после создания?
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        Система создаст шаблон операции и будет автоматически
                        генерировать операции по выбранному расписанию. Каждая
                        операция появится в списке в день, указанный в шаблоне.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">
                        Обновление операций
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        При редактировании повторяющейся операции вы можете
                        обновить только текущую или все последующие операции
                        (это изменит шаблон).
                      </p>
                    </div>
                  </div>
                }
                className="ml-1"
              />
            </div>
            <Select
              label=""
              value={repeat}
              onChange={(value) => onRepeatChange(value as Periodicity)}
              options={repeatOptions}
            />
          </div>
          {repeat !== Periodicity.NONE && (
            <Input
              label="Дата окончания повторов"
              type="date"
              value={recurrenceEndDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              placeholder="Не указана (бесконечно)"
            />
          )}
        </div>
      </div>
    </div>
  );
};
