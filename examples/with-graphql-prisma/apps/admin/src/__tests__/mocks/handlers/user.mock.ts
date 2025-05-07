/**
 * Mock GraphQL queries for testing purposes.
 *
 * This file provides mocked responses for GraphQL queries,
 * allowing developers to test their components and functions
 * without needing to make real requests to the backend.
 * By using mock data, we can simulate different scenarios
 * (such as errors or varying query results) and ensure
 * that components behave correctly in response to them.
 *
 * This approach follows the guidelines from Apollo's official documentation:
 * https://www.apollographql.com/docs/react/development-testing/testing/
 *
 * The mocks are integrated into testing environments via tools like
 * `@apollo/client/testing` and used alongside libraries like
 * `@testing-library/react` to render components with mock data.
 */

import { GET_USER } from '@/graphql/queries';
import { GraphQLError } from 'graphql';
import { mockUser } from '../entities';

/**
 * Mock for the GET_USER GraphQL query.
 *
 * This mock intercepts requests to the GET_USER query and returns
 * different responses based on the input variables.
 *
 * - If the email is 'pepito@gmail.com', it returns a mocked user with
 *   that email.
 * - If the email is 'error@gmail.com', it simulates an error response.
 * - For all other emails, it returns a default mocked user.
 *
 * @property {Object} request - The request object for the mock, containing the query to be intercepted.
 * @property {Function} result - A function that returns different results depending on the query variables.
 * @property {number} maxUsageCount - The number of times this mock can be used before being removed.
 */
const getUserMock = {
  request: {
    query: GET_USER, // The GraphQL query being mocked
  },
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  result: (variables: Partial<any>) => {
    // This function checks the email variable and returns different results.
    // If the email is 'pepito@gmail.com', return a mock user with that email.
    if (variables.email === 'pepito@gmail.com') {
      return {
        data: {
          user: { ...mockUser({ email: 'pepito@gmail.com' }) },
        },
      };
    }
    // If the email is 'error@gmail.com', return an error response.
    if (variables.email === 'error@gmail.com') {
      return {
        errors: [new GraphQLError('Error!')],
      };
    }
    // For all other emails, return a default mock user.
    return {
      data: {
        user: { ...mockUser() },
      },
    };
  },
  maxUsageCount: 2, // The mock can be used twice before being removed, default is 1
};

// Example for mutating mocks, which work similarly to query mocks
// const deleteUserMock = {
//   request: {
//     query: DELETE_USER,
//     variables: { name: 'Buck' },
//   },
//   result: { data: { deleteUser: mockUser() } },
// };

/**
 * Exporting the array of handlers for GraphQL mocks.
 *
 * The handlers array contains all the mock objects that
 * should be used in tests. These mocks will intercept
 * GraphQL requests and return the mocked data defined in them.
 *
 * @example
 * // In a test file:
 * import { render } from '@testing-library/react';
 * import { MockedProvider } from '@apollo/client/testing';
 * import { handlers } from './mocks';
 *
 * render(
 *   <MockedProvider mocks={handlers} addTypename={false}>
 *     <YourComponent />
 *   </MockedProvider>
 * );
 */
export const handlers = [getUserMock];
