import type {
  ApolloClient,
  OperationVariables,
  QueryOptions,
} from '@apollo/client';
import {
  CombinedGraphQLErrors,
  ServerError,
  ServerParseError,
  UnconventionalError,
} from '@apollo/client/errors';
import { getClient } from './graphql-client';

/**
 * @function queryGraphql<TData,TVariables>
 * @description A wrapper around the Apollo Client's `query` function.
 * @param {QueryOptions} opts
 * @returns {Promise<TData>}
 * @example
 * ```tsx
 * import { GET_USERS } from '@/graphql/queries';
 * import { queryGraphql } from '@/lib/server-query';
 * import { Button, Header } from '@pomelos/ui';
 *
 * type TUser = {
 *  _id: string;
 *  name: string;
 * };
 *
 * type GET_USER_QUERY = {
 *  users: Array<TUser>
 * };
 *
 * export default async function Page() {
 *   const data = await queryGraphql<GET_USER_QUERY>({
 *     query: GET_USERS,
 *   });
 *   return (
 *     <>
 *       <Header>Storefront</Header>
 *       <Button />
 *     </>
 *   );
 * }
 * ```
 */

export async function queryGraphql<TData>({
  client,
  ...opts
}: QueryOptions<OperationVariables, TData> & {
  client?: ApolloClient;
}): Promise<TData> {
  try {
    const apollo = client ?? getClient();

    const result = await apollo.query({
      ...opts,
      errorPolicy: 'none',
    });

    const data = (result as any).data as TData | null | undefined;

    if (data == null) {
      throw new Error('No data returned from GraphQL query');
    }

    return data;
  } catch (err) {
    if (CombinedGraphQLErrors.is(err)) {
      console.log('CombinedGraphQLErrors', err.message);
    } else if (ServerError.is(err)) {
      console.log('ServerError', err.statusCode, err.message);
    } else if (ServerParseError.is(err)) {
      console.log('ServerParseError', err.message);
    } else if (UnconventionalError.is(err)) {
      console.log('UnconventionalError', err.message);
    } else {
      console.debug(err);
    }
    // return null;
    throw err;
  }
}
