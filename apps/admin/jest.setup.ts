import '@testing-library/jest-dom';

import { server } from './src/__tests__/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
