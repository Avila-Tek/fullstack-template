import { paginationInputSchema } from '@repo/schemas';
import React from 'react';
import z from 'zod';
import { getQueryClient } from '@/src/lib/get-query-client';
import { usersQueries } from '@/src/services/user/queries';
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
    usersQueries.pagination({
      page: parsed.data.page,
      perPage: parsed.data.perPage,
    })
  );
  return <UsersQuery page={parsed.data.page} perPage={parsed.data.perPage} />;
}
