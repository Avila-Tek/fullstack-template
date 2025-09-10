'use client';
import { useSuspenseQuery } from '@tanstack/react-query';
import React from 'react';
import { usersQueries } from '@/src/services/user/queries';

export function UsersQuery({
  page,
  perPage,
}: {
  page: number;
  perPage: number;
}) {
  const query = useSuspenseQuery(usersQueries.pagination({ page, perPage }));
  if (query.error) {
    <p className="error">{query.error.message}</p>;
  }
  return <code>{JSON.stringify(query.data, null, 2)}</code>;
}
