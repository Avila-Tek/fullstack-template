import { Email } from './value-objects/Email';
import { type UserStatus, UserStatusEnum } from './value-objects/UserStatus';

export interface UserProps {
  email: Email;
  passwordHash: string;
  firstName: string | null;
  lastName: string | null;
  status: UserStatus;
}

export class NewUser {
  public email: Email;
  public passwordHash: string;
  public firstName: string | null;
  public lastName: string | null;
  public status: UserStatus;

  private constructor(private readonly props: UserProps) {
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.status = props.status;
  }

  static create(props: UserProps): NewUser {
    return new NewUser(props);
  }

  static restore(props: UserProps): NewUser {
    return new NewUser(props);
  }

  isActive(): boolean {
    return this.props.status.getValue() === UserStatusEnum.ACTIVE;
  }
}
