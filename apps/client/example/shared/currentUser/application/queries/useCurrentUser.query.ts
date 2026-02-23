import { useQuery } from '@tanstack/react-query';
import { currentUserQueryKeyEnumObject } from '../../domain/currentUser.constants';
import { CurrentUserService } from '../../infrastructure';

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: [currentUserQueryKeyEnumObject.currentUser],
    queryFn: () => CurrentUserService.getCurrentUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
