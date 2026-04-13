import React from 'react';
import Home from '@/src/app/page';
import { render } from '../test-utils/test-utils';

// Mock the Google Font loader
vi.mock('next/font/google', () => ({
  Inter: vi.fn(() => 'MockedInter'),
}));

it('renders homepage unchanged', () => {
  const { container } = render(<Home />);

  expect(container).toMatchSnapshot();
});
