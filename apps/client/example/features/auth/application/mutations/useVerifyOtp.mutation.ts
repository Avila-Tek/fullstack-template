import type { TVerifyOtpInput } from '@repo/schemas';
import { useMutation } from '@tanstack/react-query';
import type { Session } from '../../domain/auth.model';
import { AuthService } from '../../infrastructure';

export function useVerifyOtpMutation() {
  return useMutation<Session, Error, TVerifyOtpInput>({
    mutationKey: ['auth', 'verifyOtp'],
    mutationFn: (input) => AuthService.verifyOtp(input),
  });
}
