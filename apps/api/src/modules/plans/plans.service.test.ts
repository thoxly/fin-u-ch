import { PlansService, MonthlyAmount } from './plans.service';

describe('PlansService', () => {
  let plansService: PlansService;

  beforeEach(() => {
    plansService = new PlansService();
  });

  describe('expandPlan', () => {
    it('should expand plan with repeat "none"', () => {
      const planItem = {
        startDate: new Date('2024-01-15'),
        amount: 1000,
        repeat: 'none',
      };
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-12-31');

      const result = plansService.expandPlan(planItem, periodStart, periodEnd);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ month: '2024-01', amount: 1000 });
    });

    it('should expand plan with repeat "monthly"', () => {
      const planItem = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        amount: 1000,
        repeat: 'monthly',
      };
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-12-31');

      const result = plansService.expandPlan(planItem, periodStart, periodEnd);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ month: '2024-01', amount: 1000 });
      expect(result[1]).toEqual({ month: '2024-02', amount: 1000 });
      expect(result[2]).toEqual({ month: '2024-03', amount: 1000 });
    });

    it('should expand plan with repeat "quarterly"', () => {
      const planItem = {
        startDate: new Date('2024-01-01'),
        amount: 3000,
        repeat: 'quarterly',
      };
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-12-31');

      const result = plansService.expandPlan(planItem, periodStart, periodEnd);

      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result[0]).toEqual({ month: '2024-01', amount: 3000 });
      expect(result[1]).toEqual({ month: '2024-04', amount: 3000 });
      expect(result[2]).toEqual({ month: '2024-07', amount: 3000 });
      expect(result[3]).toEqual({ month: '2024-10', amount: 3000 });
    });

    it('should expand plan with repeat "annual"', () => {
      const planItem = {
        startDate: new Date('2024-01-01'),
        amount: 12000,
        repeat: 'annual',
      };
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2026-12-31');

      const result = plansService.expandPlan(planItem, periodStart, periodEnd);

      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result[0]).toEqual({ month: '2024-01', amount: 12000 });
      expect(result[1]).toEqual({ month: '2025-01', amount: 12000 });
      expect(result[2]).toEqual({ month: '2026-01', amount: 12000 });
    });

    it('should only expand plan within period range', () => {
      const planItem = {
        startDate: new Date('2024-01-01'),
        amount: 1000,
        repeat: 'monthly',
      };
      const periodStart = new Date('2024-03-01');
      const periodEnd = new Date('2024-05-31');

      const result = plansService.expandPlan(planItem, periodStart, periodEnd);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ month: '2024-03', amount: 1000 });
      expect(result[1]).toEqual({ month: '2024-04', amount: 1000 });
      expect(result[2]).toEqual({ month: '2024-05', amount: 1000 });
    });

    it('should respect plan endDate', () => {
      const planItem = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-28'),
        amount: 1000,
        repeat: 'monthly',
      };
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-12-31');

      const result = plansService.expandPlan(planItem, periodStart, periodEnd);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ month: '2024-01', amount: 1000 });
      expect(result[1]).toEqual({ month: '2024-02', amount: 1000 });
    });
  });
});
