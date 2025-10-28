import {
  PeriodFormat,
  PeriodRange,
  PeriodFiltersState,
  PeriodFiltersProps,
} from './period';

describe('period types', () => {
  describe('PeriodFormat', () => {
    it('should accept valid period formats', () => {
      const validFormats: PeriodFormat[] = ['week', 'month', 'quarter', 'year'];

      validFormats.forEach((format) => {
        expect(format).toBeDefined();
      });
    });
  });

  describe('PeriodRange', () => {
    it('should have correct structure', () => {
      const range: PeriodRange = {
        from: '2024-01-15',
        to: '2024-01-21',
      };

      expect(range.from).toBe('2024-01-15');
      expect(range.to).toBe('2024-01-21');
    });

    it('should accept ISO date strings', () => {
      const range: PeriodRange = {
        from: '2024-01-01T00:00:00.000Z',
        to: '2024-12-31T23:59:59.999Z',
      };

      expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('PeriodFiltersState', () => {
    it('should have correct structure', () => {
      const state: PeriodFiltersState = {
        format: 'month',
        range: {
          from: '2024-01-15',
          to: '2024-01-21',
        },
      };

      expect(state.format).toBe('month');
      expect(state.range.from).toBe('2024-01-15');
      expect(state.range.to).toBe('2024-01-21');
    });

    it('should accept all period formats', () => {
      const formats: PeriodFormat[] = ['week', 'month', 'quarter', 'year'];

      formats.forEach((format) => {
        const state: PeriodFiltersState = {
          format,
          range: {
            from: '2024-01-01',
            to: '2024-12-31',
          },
        };

        expect(state.format).toBe(format);
      });
    });
  });

  describe('PeriodFiltersProps', () => {
    it('should have correct structure', () => {
      const mockOnChange = jest.fn();
      const props: PeriodFiltersProps = {
        value: {
          format: 'month',
          range: {
            from: '2024-01-15',
            to: '2024-01-21',
          },
        },
        onChange: mockOnChange,
      };

      expect(props.value.format).toBe('month');
      expect(props.value.range.from).toBe('2024-01-15');
      expect(props.value.range.to).toBe('2024-01-21');
      expect(typeof props.onChange).toBe('function');
    });

    it('should accept function for onChange', () => {
      const mockOnChange = jest.fn();
      const props: PeriodFiltersProps = {
        value: {
          format: 'week',
          range: {
            from: '2024-01-01',
            to: '2024-01-07',
          },
        },
        onChange: mockOnChange,
      };

      expect(typeof props.onChange).toBe('function');
    });
  });

  describe('type compatibility', () => {
    it('should be compatible with React component props', () => {
      const mockOnChange = jest.fn();
      const props: PeriodFiltersProps = {
        value: {
          format: 'month',
          range: {
            from: '2024-01-15',
            to: '2024-01-21',
          },
        },
        onChange: mockOnChange,
      };

      // This should not cause TypeScript errors
      const componentProps = {
        ...props,
        className: 'test-class',
      };

      expect(componentProps.value).toBeDefined();
      expect(componentProps.onChange).toBeDefined();
    });

    it('should work with array operations', () => {
      const ranges: PeriodRange[] = [
        { from: '2024-01-01', to: '2024-01-31' },
        { from: '2024-02-01', to: '2024-02-29' },
        { from: '2024-03-01', to: '2024-03-31' },
      ];

      expect(ranges).toHaveLength(3);
      expect(ranges[0].from).toBe('2024-01-01');
      expect(ranges[1].to).toBe('2024-02-29');
    });

    it('should work with object operations', () => {
      const states: PeriodFiltersState[] = [
        {
          format: 'month',
          range: { from: '2024-01-01', to: '2024-01-31' },
        },
        {
          format: 'quarter',
          range: { from: '2024-01-01', to: '2024-03-31' },
        },
      ];

      const monthStates = states.filter((state) => state.format === 'month');
      const quarterStates = states.filter(
        (state) => state.format === 'quarter'
      );

      expect(monthStates).toHaveLength(1);
      expect(quarterStates).toHaveLength(1);
    });
  });
});
