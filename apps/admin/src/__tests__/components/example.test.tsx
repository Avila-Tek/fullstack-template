import { redirect } from 'next/navigation';
import RootPage from '@/src/app/page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

it('redirects the root route to the login page', () => {
  RootPage();

  expect(redirect).toHaveBeenCalledWith('/login');
});
