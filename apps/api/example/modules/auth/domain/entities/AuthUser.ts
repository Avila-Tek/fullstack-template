import { Password } from '../value-objects/Password';
import { UserStatus, UserStatusEnum } from '../value-objects/UserStatus';

interface AuthUserProps {
  id: string;
  email: string;
  passwordHash: string | null;
  status: UserStatusEnum;
}

export class AuthUser {
  public readonly id: string;
  public readonly email: string;
  public readonly passwordHash: Password;
  public readonly status: UserStatus;

  private constructor(props: AuthUserProps) {
    this.id = props.id;
    this.email = props.email;
    this.passwordHash = Password.restore(props.passwordHash || '');
    this.status = UserStatus.restore(props.status);
  }

  static restore(props: AuthUserProps): AuthUser {
    return new AuthUser(props);
  }

  public isActive(): boolean {
    return this.status.getValue() === UserStatusEnum.ACTIVE;
  }
}
