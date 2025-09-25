import { UserService } from './components/users';

export type APIConfig = {
  baseURL: string;
  token?: string;
};

export type APIService = {
  users: UserService;
};

export class API {
  public v1: APIService;

  constructor(private config: APIConfig) {
    this.v1 = Object.freeze({
      users: new UserService(this.config.baseURL, this.config.token),
    });
  }
}
