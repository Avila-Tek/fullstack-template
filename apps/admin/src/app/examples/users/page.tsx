import { paginationInputSchema } from '@repo/schemas';
import React from 'react';
import z from 'zod';
import { usersPaginationQueryOptions } from '@/src/features/userManagement/application/queries/useUsers.query';
import { getQueryClient } from '@/src/lib/get-query-client';
import { UsersQuery } from './users-query';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page({ searchParams }: Props) {
  const qs = await searchParams;
  const queryClient = getQueryClient();
  const parsed = paginationInputSchema.safeParse(qs);
  if (!parsed.success) {
    return (
      <p className="error">
        Error parsing params {z.prettifyError(parsed.error)}
      </p>
    );
  }
  void queryClient.prefetchQuery(
    usersPaginationQueryOptions({
      page: parsed.data.page,
      perPage: parsed.data.perPage,
    })
  );
  return <UsersQuery page={parsed.data.page} perPage={parsed.data.perPage} />;
}
