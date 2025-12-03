import { Select, Input, Button } from '@/shared/ui';
import {
  useGetCounterpartiesQuery,
  useGetDepartmentsQuery,
  useCreateSalaryMutation,
  useUpdateSalaryMutation,
} from '@/store/api/catalogsApi';
import { Salary } from '@shared/types/catalogs';
import { useState, useEffect } from 'react';
import { useNotification } from '@/shared/hooks/useNotification';

export const SalaryForm = ({
  salary,
  onClose,
}: {
  salary: Salary | null;
  onClose: () => void;
}) => {
  const [employeeCounterpartyId, setEmployeeCounterpartyId] = useState(
    salary?.employeeCounterpartyId || ''
  );
  const [departmentId, setDepartmentId] = useState(salary?.departmentId || '');
  const [baseWage, setBaseWage] = useState(salary?.baseWage.toString() || '');
  const [contributionsPct, setContributionsPct] = useState(
    salary?.contributionsPct.toString() || '30'
  );
  const [incomeTaxPct, setIncomeTaxPct] = useState(
    salary?.incomeTaxPct.toString() || '13'
  );
  const [periodicity, setPeriodicity] = useState(
    salary?.periodicity || 'monthly'
  );
  const [effectiveFrom, setEffectiveFrom] = useState(
    salary?.effectiveFrom ? salary.effectiveFrom.split('T')[0] : ''
  );
  const [effectiveTo, setEffectiveTo] = useState(
    salary?.effectiveTo ? salary.effectiveTo.split('T')[0] : ''
  );

  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();
  const [create, { isLoading: isCreating }] = useCreateSalaryMutation();
  const [update, { isLoading: isUpdating }] = useUpdateSalaryMutation();
  const { showSuccess, showError } = useNotification();

  const employees = counterparties.filter((c) => c.category === 'employee');

  // Синхронизация локального состояния с пропсом salary
  useEffect(() => {
    setEmployeeCounterpartyId(salary?.employeeCounterpartyId || '');
    setDepartmentId(salary?.departmentId || '');
    setBaseWage(salary?.baseWage?.toString() || '');
    setContributionsPct(salary?.contributionsPct?.toString() || '30');
    setIncomeTaxPct(salary?.incomeTaxPct?.toString() || '13');
    setPeriodicity(salary?.periodicity || 'monthly');
    // Обработка дат с проверкой на null/undefined
    setEffectiveFrom(
      salary?.effectiveFrom ? salary.effectiveFrom.split('T')[0] : ''
    );
    setEffectiveTo(salary?.effectiveTo ? salary.effectiveTo.split('T')[0] : '');
  }, [salary]); // Зависимость от salary

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      employeeCounterpartyId,
      departmentId: departmentId || undefined,
      baseWage: parseFloat(baseWage),
      contributionsPct: parseFloat(contributionsPct),
      incomeTaxPct: parseFloat(incomeTaxPct),
      periodicity,
      effectiveFrom: new Date(effectiveFrom).toISOString(),
      effectiveTo: effectiveTo
        ? new Date(effectiveTo).toISOString()
        : undefined,
    };
    try {
      if (salary) {
        await update({ id: salary.id, data }).unwrap();
        showSuccess('Зарплата успешно обновлена');
      } else {
        await create(data).unwrap();
        showSuccess('Зарплата успешно создана');
      }
      onClose();
    } catch (error) {
      const rawErrorMessage =
        error &&
        typeof error === 'object' &&
        'data' in error &&
        error.data &&
        typeof error.data === 'object' &&
        'message' in error.data &&
        typeof error.data.message === 'string'
          ? error.data.message
          : undefined;

      const errorMessage = rawErrorMessage
        ? rawErrorMessage
            .replace(/Операция\s+[\w-]+:\s*/gi, '')
            .replace(/^[^:]+:\s*/i, '')
            .trim()
        : salary
          ? 'Ошибка при обновлении зарплаты'
          : 'Ошибка при создании зарплаты';

      showError(
        errorMessage &&
          errorMessage.length > 5 &&
          !errorMessage.match(/^[A-Z_]+$/)
          ? errorMessage
          : salary
            ? 'Ошибка при обновлении зарплаты'
            : 'Ошибка при создании зарплаты'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Сотрудник"
        value={employeeCounterpartyId}
        onChange={(value) => setEmployeeCounterpartyId(value)}
        options={employees.map((e) => ({ value: e.id, label: e.name }))}
        placeholder="Выберите сотрудника"
        required
      />
      <Select
        label="Подразделение"
        value={departmentId}
        onChange={(value) => setDepartmentId(value)}
        options={departments.map((d) => ({ value: d.id, label: d.name }))}
        placeholder="Не выбрано"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Оклад"
          type="number"
          step="0.01"
          value={baseWage}
          onChange={(e) => setBaseWage(e.target.value)}
          required
        />
        <Select
          label="Периодичность"
          value={periodicity}
          onChange={(value) => setPeriodicity(value)}
          options={[
            { value: 'monthly', label: 'Ежемесячно' },
            { value: 'weekly', label: 'Еженедельно' },
            { value: 'biweekly', label: 'Раз в 2 недели' },
          ]}
          required
        />
        <Input
          label="Взносы %"
          type="number"
          step="0.01"
          value={contributionsPct}
          onChange={(e) => setContributionsPct(e.target.value)}
          required
        />
        <Input
          label="НДФЛ %"
          type="number"
          step="0.01"
          value={incomeTaxPct}
          onChange={(e) => setIncomeTaxPct(e.target.value)}
          required
        />
        <Input
          label="Действует с"
          type="date"
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          required
        />
        <Input
          label="Действует по"
          type="date"
          value={effectiveTo}
          onChange={(e) => setEffectiveTo(e.target.value)}
        />
      </div>
      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isCreating || isUpdating}>
          {salary ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </form>
  );
};
