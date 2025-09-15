// import { IPhone, IUser } from '@avila-tek/models';
/**
 * Mock data generators for various models.
 *
 * This file provides utility functions to generate mocked instances of various models,
 */

/**
 * Generates a mock `IUser` object.
 *
 * This function returns a user object with predefined default values. You can
 * override any of these values by passing a partial `IUser` object as the argument.
 *
 * @param {Partial<IUser>} initialValue - Optional partial object to override the default values.
 * @returns {IUser} A mock `IUser` object with default or customized properties.
 *
 * @example
 * Generate a user with default values
 * const defaultUser = mockUser();
 *
 * Generate a user with a custom email
 * const userWithCustomEmail = mockUser({ email: 'newemail@example.com' });
 */

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function mockUser(initialValue: Partial<any> = {}): any {
  return {
    email: 'juanperez@example.com',
    password: 'contraseñaSegura123',
    name: 'Juan',
    phone: mockPhone(), // Generates a default phone object
    ...initialValue, // Overwrites any provided values
  };
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function mockPhone(initialValue: Partial<any> = {}): any {
  return {
    code: '+34', // Default country code for Spain
    number: '600123456', // Default phone number
    ...initialValue, // Overwrites any provided values
  };
}
