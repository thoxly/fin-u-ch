import React from 'react';
import { render, screen } from '@testing-library/react';
import { Plus } from 'lucide-react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders with title only', () => {
    render(<EmptyState title="No data found" />);

    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('renders with title and description', () => {
    render(
      <EmptyState
        title="No operations"
        description="You haven't created any operations yet"
      />
    );

    expect(screen.getByText('No operations')).toBeInTheDocument();
    expect(
      screen.getByText("You haven't created any operations yet")
    ).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(<EmptyState icon={Plus} title="Add your first operation" />);

    expect(screen.getByText('Add your first operation')).toBeInTheDocument();
  });

  it('renders with action button', () => {
    render(<EmptyState title="No data" action={<button>Create new</button>} />);

    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create new' })
    ).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState title="Test" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
