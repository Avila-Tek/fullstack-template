import assert from 'node:assert';
import React from 'react';
import { LandingPage } from '@/src/features/landing/ui/pages/LandingPage';
import { render } from '../test-utils/test-utils';

// Mock the Google Font loader
jest.mock('next/font/google', () => ({
  Inter: jest.fn(() => 'MockedInter'),
}));

it('renders landing page with main heading', () => {
  const { container } = render(<LandingPage />);

  assert.ok(container.textContent?.includes('Mejora tus hábitos'));
});
