import {
  ApolloError,
  type OperationVariables,
  type ApolloClient,
  type QueryOptions,
} from '@apollo/client';
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
  client?: ApolloClient<unknown>;
}): Promise<TData> {
  try {
    const { data, error, errors } = client
      ? await client.query({
          ...opts,
        })
      : await getClient().query({
          ...opts,
        });

    if (typeof error !== 'undefined') {
      throw new Error(error.message);
    }

    if (
      typeof errors !== 'undefined' &&
      Array.isArray(errors) &&
      errors.length > 0
    ) {
      console.debug(errors);
      throw new Error('GraphQL errors occurred');
    }

    return data;
  } catch (err) {
    if (err instanceof ApolloError) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      console.log(err.name, JSON.stringify((err.networkError as any)?.result));
    } else {
      console.debug(err);
    }
    // return null;
    throw err;
  }
}
