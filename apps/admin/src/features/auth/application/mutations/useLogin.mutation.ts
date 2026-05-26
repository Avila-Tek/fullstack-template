import type { Session } from '@repo/auth';
import type { TSignInEmailInput } from '@repo/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '../../infrastructure';

export function useSignInMutation() {
  const queryClient = useQueryClient();
  return useMutation<Session, Error, TSignInEmailInput>({
    mutationKey: ['auth', 'signIn'],
    mutationFn: (input) => AuthService.signIn(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    },
  });
}
