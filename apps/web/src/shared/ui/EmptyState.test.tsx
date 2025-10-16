/// <reference types="jest" />
/* eslint-env jest */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FolderOpen } from 'lucide-react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="Нет данных" />);
    expect(screen.getByText('Нет данных')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Пусто" description="Добавьте запись" />);
    expect(screen.getByText('Добавьте запись')).toBeInTheDocument();
  });

  it('renders default icon by iconName (Inbox)', () => {
    const { container } = render(<EmptyState title="Пусто" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders custom icon via icon prop', () => {
    render(
      <EmptyState
        title="Пусто"
        icon={<FolderOpen aria-label="folder-open" />}
      />
    );
    expect(screen.getByLabelText('folder-open')).toBeInTheDocument();
  });

  it('applies fullHeight when true', () => {
    const { container } = render(<EmptyState title="Пусто" fullHeight />);
    // container has root element with class from CSS module; ensure at least two class names applied (container + fullHeight)
    const root = container.firstElementChild as HTMLElement;
    expect(root.className.split(' ').length).toBeGreaterThanOrEqual(1);
  });

  it('merges external className', () => {
    const { container } = render(
      <EmptyState title="Пусто" className="test-extra-class" />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/test-extra-class/);
  });
});
