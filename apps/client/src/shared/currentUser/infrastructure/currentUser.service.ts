import type { CurrentUser, UserSession } from '../domain/currentUser.model';
import type {
  CurrentUserApi,
  CurrentUserDto,
  SessionDto,
} from './currentUser.interfaces';
import {
  toCurrentUserDomain,
  toUserSessionDomain,
} from './currentUser.transform';

export class CurrentUserServiceClass {
  constructor(private api: CurrentUserApi) {}

  async getCurrentUser(): Promise<CurrentUser> {
    const result = await this.api.getCurrentUser();
    if (!result.success) {
      throw new Error(result.error);
    }
    return toCurrentUserDomain(result.data as CurrentUserDto);
  }

  async getSession(): Promise<UserSession> {
    const result = await this.api.getSession();
    if (!result.success) {
      throw new Error(result.error);
    }
    return toUserSessionDomain(result.data as SessionDto);
  }
}
