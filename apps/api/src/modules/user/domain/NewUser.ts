import type { Email } from './value-objects/Email';
import { UserStatus } from './value-objects/UserStatus';

export interface UserProps {
  email: Email;
  passwordHash: string;
  firstName: string | null;
  lastName: string | null;
  status: UserStatus;
}

export class NewUser {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): NewUser {
    return new NewUser(props);
  }

  static restore(props: UserProps): NewUser {
    return new NewUser(props);
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

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  isActive(): boolean {
    return this.props.status.getValue() === 'active';
  }
}
