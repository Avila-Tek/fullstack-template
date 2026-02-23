import { Password } from '../value-objects/Password';
import { Status, UserStatusEnum } from '../value-objects/Status';

interface AuthUserProps {
  id: string;
  email: string;
  passwordHash: string | null;
  roleId: string | null;
  status: UserStatusEnum;
}

export class AuthUser {
  public readonly id: string;
  public readonly email: string;
  public readonly password: Password;
  public readonly roleId: string | null;
  public readonly status: Status;

  private constructor(props: AuthUserProps) {
    this.id = props.id;
    this.email = props.email;
    this.password = Password.restore(props.passwordHash || '');
    this.roleId = props.roleId;
    this.status = Status.restore(props.status);
  }

  static restore(props: AuthUserProps): AuthUser {
    return new AuthUser(props);
  }

  public isActive(): boolean {
    return this.status.getValue() === UserStatusEnum.ACTIVE;
  }
}
