'use client';
import { useSuspenseQuery } from '@tanstack/react-query';
import React from 'react';
import { usersPaginationQueryOptions } from '@/src/features/userManagement/application/queries/useUsers.query';

export function UsersQuery({
  page,
  perPage,
}: {
  page: number;
  perPage: number;
}) {
  const query = useSuspenseQuery(
    usersPaginationQueryOptions({ page, perPage })
  );
  if (query.error) {
    <p className="error">{query.error.message}</p>;
  }
  return <code>{JSON.stringify(query.data, null, 2)}</code>;
}
