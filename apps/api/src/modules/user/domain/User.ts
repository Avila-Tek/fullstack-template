import type { Email } from './value-objects/Email';
import type { UserId } from './value-objects/UserId';
import { UserStatusEnum, type UserStatus } from './value-objects/UserStatus';

export interface UserProps {
  id: UserId;
  email: Email;
  passwordHash: string | null;
  firstName: string | null;
  lastName: string | null;
  status: UserStatus;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    return new User(props);
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  get id(): UserId {
    return this.props.id;
  }

  get email(): Email {
    return this.props.email;
  }

  get firstName(): string | null {
    return this.props.firstName;
  }

  get lastName(): string | null {
    return this.props.lastName;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get passwordHash(): string | null {
    return this.props.passwordHash;
  }

  isActive(): boolean {
    return this.props.status.equals(UserStatusEnum.ACTIVE);
  }
}
