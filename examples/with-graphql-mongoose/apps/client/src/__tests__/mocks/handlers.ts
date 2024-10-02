/**
 * Centralized handler aggregation for mocking GraphQL queries or other API calls.
 *
 * This file imports mock handlers from different modules (in this case, `user.mock`) and
 * aggregates them into a single `handlers` array. This approach allows for better organization
 * and modularity of your mock data and handlers, making it easier to manage mocks as your
 * application grows.
 *
 * The `handlers` array is then exported and used in testing environments (e.g., when using
 * tools like `MockedProvider` from `@apollo/client/testing` or `msw` for mocking API requests).
 */


// Exporting all handlers in a single array to be used in tests
export const handlers = [...userHandlers];
