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
import { render, screen } from '@testing-library/react';
import CardSkeleton from './CardSkeleton';

describe('CardSkeleton', () => {
  test('renders container with pulse animation', () => {
    render(<CardSkeleton />);
    const container = screen.getByTestId('card-skeleton');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('animate-pulse');
  });

  test('renders default number of content lines (3)', () => {
    render(<CardSkeleton />);
    const container = screen.getByTestId('card-skeleton');
    // find all direct blocks inside content area by role generic
    const lines = container.querySelectorAll('.space-y-3 > div');
    expect(lines.length).toBe(3);
  });

  test('respects custom lines prop', () => {
    render(<CardSkeleton lines={5} />);
    const container = screen.getByTestId('card-skeleton');
    const lines = container.querySelectorAll('.space-y-3 > div');
    expect(lines.length).toBe(5);
  });

  test('applies size classes for sm, md, lg', () => {
    const { rerender } = render(<CardSkeleton size="sm" />);
    let container = screen.getByTestId('card-skeleton');
    expect(container.className).toMatch(/p-4/);

    rerender(<CardSkeleton size="md" />);
    container = screen.getByTestId('card-skeleton');
    expect(container.className).toMatch(/p-6/);

    rerender(<CardSkeleton size="lg" />);
    container = screen.getByTestId('card-skeleton');
    expect(container.className).toMatch(/p-8/);
  });

  test('has header block and content section', () => {
    render(<CardSkeleton />);
    const container = screen.getByTestId('card-skeleton');
    const header = container.querySelector('.mb-4 > div');
    expect(header).toBeInTheDocument();
    const content = container.querySelector('.space-y-3');
    expect(content).toBeInTheDocument();
  });
});
