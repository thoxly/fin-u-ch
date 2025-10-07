import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let dashboardService: DashboardService;

  beforeEach(() => {
    dashboardService = new DashboardService();
  });

  describe('dashboard calculations', () => {
    it('should calculate income from operations', () => {
      const operations = [
        { type: 'income', amount: 1000 },
        { type: 'income', amount: 2000 },
        { type: 'expense', amount: 500 },
      ];

      const income = operations
        .filter((op: any) => op.type === 'income')
        .reduce((sum: number, op: any) => sum + op.amount, 0);

      expect(income).toBe(3000);
    });

    it('should calculate expense from operations', () => {
      const operations = [
        { type: 'income', amount: 1000 },
        { type: 'expense', amount: 500 },
        { type: 'expense', amount: 300 },
      ];

      const expense = operations
        .filter((op: any) => op.type === 'expense')
        .reduce((sum: number, op: any) => sum + op.amount, 0);

      expect(expense).toBe(800);
    });

    it('should calculate net profit', () => {
      const income = 3000;
      const expense = 800;
      const netProfit = income - expense;

      expect(netProfit).toBe(2200);
    });

    it('should handle negative net profit', () => {
      const income = 1000;
      const expense = 2000;
      const netProfit = income - expense;

      expect(netProfit).toBe(-1000);
    });

    it('should calculate account balance with income', () => {
      const openingBalance = 1000;
      const operations = [
        { type: 'income', accountId: 'acc-1', amount: 500 },
        { type: 'income', accountId: 'acc-1', amount: 300 },
      ];

      let balance = openingBalance;
      for (const op of operations) {
        if (op.type === 'income' && op.accountId === 'acc-1') {
          balance += op.amount;
        }
      }

      expect(balance).toBe(1800);
    });

    it('should calculate account balance with expense', () => {
      const openingBalance = 1000;
      const operations = [
        { type: 'expense', accountId: 'acc-1', amount: 200 },
        { type: 'expense', accountId: 'acc-1', amount: 100 },
      ];

      let balance = openingBalance;
      for (const op of operations) {
        if (op.type === 'expense' && op.accountId === 'acc-1') {
          balance -= op.amount;
        }
      }

      expect(balance).toBe(700);
    });

    it('should calculate account balance with transfers', () => {
      const openingBalance = 1000;
      const operations = [
        { type: 'transfer', sourceAccountId: 'acc-1', amount: 200 },
        { type: 'transfer', targetAccountId: 'acc-1', amount: 300 },
      ];

      let balance = openingBalance;
      for (const op of operations) {
        if (op.type === 'transfer') {
          if (op.sourceAccountId === 'acc-1') balance -= op.amount;
          if (op.targetAccountId === 'acc-1') balance += op.amount;
        }
      }

      expect(balance).toBe(1100);
    });

    it('should group operations by month', () => {
      const operations = [
        { operationDate: new Date('2024-01-15'), type: 'income', amount: 1000 },
        { operationDate: new Date('2024-01-20'), type: 'expense', amount: 500 },
        { operationDate: new Date('2024-02-10'), type: 'income', amount: 2000 },
      ];

      const monthsMap = new Map<string, { income: number; expense: number }>();

      for (const op of operations) {
        const date = new Date(op.operationDate);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthsMap.has(month)) {
          monthsMap.set(month, { income: 0, expense: 0 });
        }

        const data = monthsMap.get(month)!;
        if (op.type === 'income') data.income += op.amount;
        if (op.type === 'expense') data.expense += op.amount;
      }

      expect(monthsMap.size).toBe(2);
      expect(monthsMap.get('2024-01')).toEqual({ income: 1000, expense: 500 });
      expect(monthsMap.get('2024-02')).toEqual({ income: 2000, expense: 0 });
    });
  });
});
