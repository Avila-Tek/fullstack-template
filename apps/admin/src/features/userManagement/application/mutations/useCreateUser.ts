import type { TCreateUserInput } from '@repo/schemas';
import { mutationOptions } from '@tanstack/react-query';
import type { User } from '@/src/features/userManagement/domain/user';
import { UserService } from '../../infrastructure';
import { usersQueryKeys } from '../queries/useUsers';

export function createUserMutationOptions() {
  return mutationOptions<User, Error, TCreateUserInput>({
    mutationKey: [...usersQueryKeys.all(), 'create'],
    mutationFn: (variables) => UserService.createUser(variables),
    onError(error) {
      console.error(error);
    },
  });
}
