export enum UserStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UserStatus {
  private constructor(private readonly value: UserStatusEnum) {}

  static active(): UserStatus {
    return new UserStatus(UserStatusEnum.ACTIVE);
  }

  static inactive(): UserStatus {
    return new UserStatus(UserStatusEnum.INACTIVE);
  }

  static restore(value: UserStatusEnum): UserStatus {
    if (value === UserStatusEnum.ACTIVE) return UserStatus.active();
    if (value === UserStatusEnum.INACTIVE) return UserStatus.inactive();
    throw new Error('Invalid status value');
  }

  public getValue(): UserStatusEnum {
    return this.value;
  }

  public equals(other: UserStatus | UserStatusEnum): boolean {
    if (other instanceof UserStatus) {
      return this.value === other.getValue();
    }
    return this.value === other;
  }
}
