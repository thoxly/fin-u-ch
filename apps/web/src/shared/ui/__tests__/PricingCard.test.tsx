import React from 'react';
import { render, screen } from '@testing-library/react';
import { PricingCard } from '../PricingCard';

describe('PricingCard', () => {
  test('renders START plan and shows Бесплатно when no price provided', () => {
    render(
      <PricingCard
        plan="START"
        description="Для одного пользователя"
        maxUsers={1}
        features={['Управление операциями']}
        isCurrentPlan={false}
        onSelectPlan={() => {}}
      />
    );

    expect(screen.getByText('START')).toBeInTheDocument();
    // when price not provided START should display Бесплатно
    expect(screen.getByText('Бесплатно')).toBeInTheDocument();
    expect(screen.getByText('Управление операциями')).toBeInTheDocument();
  });

  test('shows activate button for TEAM plan', () => {
    render(
      <PricingCard
        plan="TEAM"
        description="Для команды"
        maxUsers={5}
        features={['Роли и права доступа']}
        isCurrentPlan={false}
        onSelectPlan={() => {}}
      />
    );

    expect(screen.getByText('TEAM')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent(
      'Активировать промокод'
    );
  });

  test('renders provided price when given', () => {
    render(
      <PricingCard
        plan="BUSINESS"
        price="1000 ₽"
        description="Для больших организаций"
        maxUsers={Infinity}
        features={['Доступ к API']}
        isCurrentPlan={false}
        onSelectPlan={() => {}}
      />
    );

    expect(screen.getByText('1000 ₽')).toBeInTheDocument();
    expect(screen.getByText('Доступ к API')).toBeInTheDocument();
  });
});
