import type { TPaginationInput } from '@repo/schemas';
import { queryOptions } from '@tanstack/react-query';
import { UserService } from '../../infrastructure';

export const usersQueryKeys = {
  all: () => ['users'] as const,
  pagination: (params: TPaginationInput) =>
    [...usersQueryKeys.all(), 'pagination', params] as const,
};

export function usersPaginationQueryOptions({
  page,
  perPage,
}: TPaginationInput) {
  return queryOptions({
    queryKey: usersQueryKeys.pagination({ page, perPage }),
    queryFn: () => UserService.getUsers({ page, perPage }),
  });
}
