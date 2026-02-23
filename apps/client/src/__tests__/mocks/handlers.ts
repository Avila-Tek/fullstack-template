/**
 * Centralized handler aggregation for mocking GraphQL queries or other API calls.
 *
 * This file imports mock handlers from different modules (e.g., `user.mock`) and
 * aggregates them into a single `handlers` array. These handlers are used by MSW (Mock Service Worker)
 * to intercept and mock network requests, making it easier to simulate API responses in both
 * unit tests and integration tests.
 *
 * By centralizing the mock handlers, the application ensures modular and organized mock data
 * management, which becomes crucial as the complexity of the app increases.
 *
 * MSW can be used to mock GraphQL queries, REST API requests, or any other HTTP request,
 * providing a powerful way to simulate various scenarios (e.g., error responses, network delays)
 * without relying on actual network calls.
 *
 * Example usage:
 *
 * - For unit testing:
 *   ```js server.ts
 *   import { setupServer } from 'msw/node';
 *   import { handlers } from './mocks/handlers';
 *
 *   const server = setupServer(...handlers);
 *
 *
 */

import { userHandlers } from './handlers/user.mock';

// Exporting all handlers in a single array to be used in tests
export const handlers = [...userHandlers];
