import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { Modal } from '../../shared/ui/Modal';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import {
  useGetSalariesQuery,
  useCreateSalaryMutation,
  useUpdateSalaryMutation,
  useDeleteSalaryMutation,
  useGetCounterpartiesQuery,
  useGetDepartmentsQuery,
} from '../../store/api/catalogsApi';
import { formatMoney } from '../../shared/lib/money';
import { formatDate } from '../../shared/lib/date';
import { OffCanvas } from '@/shared/ui/OffCanvas';
import type { Salary } from '@shared/types/catalogs';

export const SalariesPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Salary | null>(null);
  const { data: salaries = [], isLoading } = useGetSalariesQuery();
  const [deleteSalary] = useDeleteSalaryMutation();

  const columns = [
    { key: 'employeeName', header: 'Сотрудник' },
    {
      key: 'baseWage',
      header: 'Оклад',
      render: (s: Salary) => formatMoney(s.baseWage),
    },
    {
      key: 'contributionsPct',
      header: 'Взносы %',
      render: (s: Salary) => `${s.contributionsPct}%`,
    },
    {
      key: 'incomeTaxPct',
      header: 'НДФЛ %',
      render: (s: Salary) => `${s.incomeTaxPct}%`,
    },
    { key: 'periodicity', header: 'Периодичность' },
    {
      key: 'effectiveFrom',
      header: 'Действует с',
      render: (s: Salary) => formatDate(s.effectiveFrom),
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (s: Salary) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing(s);
              setIsFormOpen(true);
            }}
            className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
            title="Изменить"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => window.confirm('Удалить?') && deleteSalary(s.id)}
            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
            title="Удалить"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Зарплаты</h1>
          <Button
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          >
            Создать запись
          </Button>
        </div>
        <Card>
          <Table
            columns={columns}
            data={salaries}
            keyExtractor={(s) => s.id}
            loading={isLoading}
          />
        </Card>
      </div>
      <OffCanvas
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Редактировать' : 'Создать'}
        size="lg"
      >
        <SalaryForm salary={editing} onClose={() => setIsFormOpen(false)} />
      </OffCanvas>
    </Layout>
  );
};

const SalaryForm = ({
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
    salary?.effectiveFrom.split('T')[0] || ''
  );
  const [effectiveTo, setEffectiveTo] = useState(
    salary?.effectiveTo ? salary.effectiveTo.split('T')[0] : ''
  );

  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();
  const [create, { isLoading: isCreating }] = useCreateSalaryMutation();
  const [update, { isLoading: isUpdating }] = useUpdateSalaryMutation();

  const employees = counterparties.filter((c) => c.category === 'employee');

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
      if (salary) await update({ id: salary.id, data }).unwrap();
      else await create(data).unwrap();
      onClose();
    } catch (error) {
      console.error('Failed to save salary:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Сотрудник"
        value={employeeCounterpartyId}
        onChange={(e) => setEmployeeCounterpartyId(e.target.value)}
        options={employees.map((e) => ({ value: e.id, label: e.name }))}
        placeholder="Выберите сотрудника"
        required
      />
      <Select
        label="Подразделение"
        value={departmentId}
        onChange={(e) => setDepartmentId(e.target.value)}
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
          onChange={(e) => setPeriodicity(e.target.value)}
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
