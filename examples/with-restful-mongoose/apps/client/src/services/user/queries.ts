import { TCreateUserInput, TPaginationInput, TUser } from '@repo/schemas';
import { Safe } from '@repo/utils';
import { mutationOptions, queryOptions } from '@tanstack/react-query';
import { getAPIClient } from '@/src/lib/api';

export const usersQueries = {
  all: () => ['users'],
  pagination({ page, perPage }: TPaginationInput) {
    return queryOptions({
      queryKey: [...usersQueries.all(), String(page), String(perPage)],
      async queryFn() {
        const api = getAPIClient();
        const data = await api.v1.users.pagination({ perPage, page });
        if (!data.success) {
          throw new Error(data.error);
        }
        return data.data;
      },
    });
  },
};

export const userMutations = {
  all: () => ['users'],
  create() {
    return mutationOptions<Safe<TUser>, Error, TCreateUserInput>({
      mutationKey: [...userMutations.all(), 'create'],
      async mutationFn(variables) {
        const api = getAPIClient();
        const safeResult = await api.v1.users.create(variables);
        return safeResult;
      },
      onError(error, variables, context) {
        console.error(error);
      },
    });
  },
};
