/* eslint-env jest */
/// <reference types="jest" />
// Declare Jest globals to satisfy TypeScript without altering compile settings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const describe: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const test: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const expect: any;
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import TableSkeleton from './TableSkeleton';

describe('TableSkeleton', () => {
  test('renders a table element', () => {
    render(<TableSkeleton />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  test('renders default 5 body rows and 4 columns', () => {
    render(<TableSkeleton />);
    const table = screen.getByRole('table');
    const rowgroupsDefault = within(table).getAllByRole('rowgroup');
    const tbody = rowgroupsDefault[rowgroupsDefault.length - 1];
    const rows = within(tbody).getAllByRole('row');
    expect(rows).toHaveLength(5);
    rows.forEach((row) => {
      const cells = within(row).getAllByRole('cell');
      expect(cells).toHaveLength(4);
    });
  });

  test('respects custom rows and columns props', () => {
    render(<TableSkeleton rows={3} columns={2} />);
    const table = screen.getByRole('table');
    const rowgroupsCustom = within(table).getAllByRole('rowgroup');
    const tbody = rowgroupsCustom[rowgroupsCustom.length - 1];
    const rows = within(tbody).getAllByRole('row');
    expect(rows).toHaveLength(3);
    rows.forEach((row) => {
      const cells = within(row).getAllByRole('cell');
      expect(cells).toHaveLength(2);
    });
  });

  test('renders header by default', () => {
    render(<TableSkeleton />);
    const table = screen.getByRole('table');
    const rowgroups = within(table).getAllByRole('rowgroup', { hidden: true });
    const thead = rowgroups[0];
    // header row exists with 4 <th>
    const headerRow = within(thead).getByRole('row');
    const headers = within(headerRow).getAllByRole('columnheader');
    expect(headers).toHaveLength(4);
  });

  test('does not render header when showHeader=false', () => {
    render(<TableSkeleton showHeader={false} />);
    const table = screen.getByRole('table');
    // Only tbody rowgroup should be present
    const rowgroups = within(table).getAllByRole('rowgroup');
    expect(rowgroups).toHaveLength(1);
    const tbody = rowgroups[0];
    expect(() => within(tbody).getByRole('columnheader')).toThrow();
  });

  test('cells have pulse animation class', () => {
    render(<TableSkeleton rows={1} columns={2} />);
    const table = screen.getByRole('table');
    const rowgroupsForPulse = within(table).getAllByRole('rowgroup');
    const tbody = rowgroupsForPulse[rowgroupsForPulse.length - 1];
    const row = within(tbody).getAllByRole('row')[0];
    const cells = within(row).getAllByRole('cell');
    const innerDivs = cells.map((c) => within(c).getByRole('generic'));
    innerDivs.forEach((div) => {
      expect(div).toHaveClass('animate-pulse');
    });
  });

  test('applies width styles to header and cells', () => {
    render(<TableSkeleton rows={1} columns={3} />);
    const table = screen.getByRole('table');
    // header widths
    const rowgroups = within(table).getAllByRole('rowgroup', { hidden: true });
    const thead = rowgroups[0];
    const headerRow = within(thead).getByRole('row');
    const headers = within(headerRow).getAllByRole('columnheader');
    headers.forEach((th) => {
      const block = within(th).getByRole('generic') as HTMLElement;
      expect(block.style.width).toMatch(/%$/);
    });
    // body widths
    const rowgroupsForWidths = within(table).getAllByRole('rowgroup');
    const tbody = rowgroupsForWidths[rowgroupsForWidths.length - 1];
    const row = within(tbody).getAllByRole('row')[0];
    const cells = within(row).getAllByRole('cell');
    cells.forEach((td) => {
      const block = within(td).getByRole('generic') as HTMLElement;
      expect(block.style.width).toMatch(/%$/);
    });
  });
});
