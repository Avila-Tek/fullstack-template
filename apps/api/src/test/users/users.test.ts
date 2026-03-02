import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { CreateUserService } from '../../modules/user/infrastructure/services/CreateUserService';
import { GetUserByEmailPort } from '../../modules/user/application/ports/in/GetUserByEmailPort';
import { UserRepository } from '../../modules/user/application/ports/out/UserRepository';

function mockUserEntity(overrides: Partial<any> = {}) {
  return {
    id: { value: 'u1' },
    email: { value: 'a@b.com' },
    firstName: 'John',
    lastName: 'Doe',
    timezone: 'UTC',
    status: { getValue: () => 'ACTIVE' },
    ...overrides,
  };
}

describe('CreateUserService', () => {
  let getUserByEmail: Pick<GetUserByEmailPort, 'execute'>;
  let userRepository: Pick<UserRepository, 'create' | 'findByEmail'>;
  let service: CreateUserService;

  beforeEach(() => {
    getUserByEmail = { execute: vi.fn() };
    userRepository = {
      create: vi.fn(),
      findByEmail: vi.fn(),
    };

    service = new CreateUserService(
      getUserByEmail as any,
      userRepository as any
    );
  });

  it('should throw ConflictException if user already exists', async () => {
    (getUserByEmail.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUserEntity()
    );

    const command = {
      email: 'a@b.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    } as any;

    await expect(service.execute(command)).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(getUserByEmail.execute).toHaveBeenCalledWith('a@b.com');
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('should successfully create a new user', async () => {
    (getUserByEmail.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );

    const createdUser = mockUserEntity();
    (userRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      createdUser
    );

    const command = {
      email: 'a@b.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    } as any;

    const result = await service.execute(command);

    expect(getUserByEmail.execute).toHaveBeenCalledWith('a@b.com');
    expect(userRepository.create).toHaveBeenCalled();

    // Check returned DTO maps correctly
    expect(result).toEqual({
      id: 'u1',
      email: 'a@b.com',
      firstName: 'John',
      lastName: 'Doe',
      timezone: 'UTC',
      status: 'ACTIVE',
    });
  });

  it('should successfully create a new user without first/last names', async () => {
    (getUserByEmail.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );

    const createdUser = mockUserEntity({
      firstName: null,
      lastName: null,
      timezone: null,
    });
    (userRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      createdUser
    );

    const command = {
      email: 'a@b.com',
      password: 'password123',
      firstName: '',
      lastName: '',
    } as any;

    const result = await service.execute(command);

    expect(getUserByEmail.execute).toHaveBeenCalledWith('a@b.com');
    expect(userRepository.create).toHaveBeenCalled();

    // Check returned DTO maps correctly with undefineds
    expect(result).toEqual({
      id: 'u1',
      email: 'a@b.com',
      firstName: undefined,
      lastName: undefined,
      timezone: undefined,
      status: 'ACTIVE',
    });
  });
});
