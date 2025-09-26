import {
  authDTO,
  type TSignInInput,
  type TSignUpInput,
  type TUser,
  userSchema,
} from '@repo/schemas';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { compareHash } from '@/lib/encryptor';
import type { BrowserDetectInfo } from '@/types/browser';
import { IUserService } from './dependencies/user.interface';
import { generateSession } from './utils/session';

declare module 'fastify' {
  interface FastifyInstance {
    authService: AuthService;
  }
}

export class AuthService {
  constructor(
    private emailService: FastifyInstance['email'],
    private thrower: FastifyInstance['thrower'],
    private userService: IUserService
  ) {
    this.emailService = emailService;
    this.thrower = thrower;

    this.signIn = this.signIn.bind(this);
    this.signUp = this.signUp.bind(this);
    this.currentUser = this.currentUser.bind(this);
  }

  async signIn(
    data: TSignInInput,
    browser: BrowserDetectInfo,
    ip: string
  ): Promise<{ user: TUser; token: string }> {
    let _user = await this.userService.findOneWithPassword({
      email: data.email,
    });
    if (!_user) return this.thrower.exception('auth', 'invalid-credentials');
    if (typeof _user?.password === 'undefined')
      return this.thrower.exception('auth', 'invalid-credentials');

    // Validate password
    const isValidPassword = await compareHash(_user.password, data.password);
    if (!isValidPassword) {
      return this.thrower.exception('auth', 'invalid-credentials');
    }

    // Create sessions
    if (!process.env.SECRET) {
      return this.thrower.exception('auth', 'internal-server-error');
    }
    const user = userSchema.parse(_user);

    const session = await generateSession(user, browser, ip);

    return { user, token: session.token };
  }

  async signUp(data: TSignUpInput, browser: BrowserDetectInfo, ip: string) {
    if (!process.env.SECRET) throw new Error('Internal server error');

    if (data.password !== data.rePassword) {
      this.thrower.exception('auth', 'invalid-credentials');
    }

    const user = await this.userService.createOne(data);
    if (!user) {
      this.thrower.exception('user', '500-default');
    }
    return this.signIn(
      { email: data.email, password: data.password },
      browser,
      ip
    );
  }

  async currentUser(token: string) {
    const parsedPayload = authDTO.jwtUserPayload.safeParse(jwt.decode(token));
    if (!parsedPayload.success) {
      this.thrower.silentException('internal', 'not-found');
      return;
    }
    const payload = parsedPayload.data;
    if (typeof payload === 'undefined') {
      this.thrower.silentException('internal', 'not-found');
      return;
    }
    const user = await this.userService.findOne({ id: payload.id });
    if (!user) {
      return this.thrower.silentException('user', 'invalid-token');
    }
    return user;
  }
}

export default fp(
  async (fastify) => {
    const authService = new AuthService(
      fastify.email,
      fastify.thrower,
      fastify.userService
    );
    fastify.decorate('authService', authService);
  },
  { name: 'auth-service' }
);
