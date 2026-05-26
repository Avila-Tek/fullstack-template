import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Session } from '../../domain/auth.model';
import { AuthService } from '../../infrastructure';
import type { SignInInput } from '../../domain/auth.model';

export function useSignInMutation() {
  const queryClient = useQueryClient();

  return useMutation<Session, Error, SignInInput>({
    mutationKey: ['auth', 'signIn'],
    mutationFn: (input) => AuthService.signIn(input),
    onSuccess: () => {
      // Session cookie is set by the server; invalidate React Query cache
      // so useSession() picks up the new session on next render.
      void queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    },
  });
}
