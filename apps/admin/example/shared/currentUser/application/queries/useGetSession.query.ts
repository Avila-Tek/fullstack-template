import { useQuery } from '@tanstack/react-query';
import { currentUserQueryKeyEnumObject } from '../../domain/currentUser.constants';
import type { UserSession } from '../../domain/currentUser.model';
import { CurrentUserService } from '../../infrastructure';

export function useGetSessionQuery() {
  return useQuery<UserSession, Error>({
    queryKey: [currentUserQueryKeyEnumObject.currentUser, 'session'],
    queryFn: () => CurrentUserService.getSession(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
