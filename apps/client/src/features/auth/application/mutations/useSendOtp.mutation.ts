import type { TSendOtpInput } from '@repo/schemas';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '../../infrastructure';

export function useSendOtpMutation() {
  return useMutation<void, Error, TSendOtpInput>({
    mutationKey: ['auth', 'sendOtp'],
    mutationFn: (input) => AuthService.sendOtp(input),
  });
}
