import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordHasherPort } from '../../application/ports/out/password-hasher.port.js';
import { ARGON2_OPTIONS } from '../better-auth/argon2.config.js';

@Injectable()
export class Argon2HashAdapter extends PasswordHasherPort {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2_OPTIONS);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
