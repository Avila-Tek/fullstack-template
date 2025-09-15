import { hash as argonHash, verify } from 'argon2';

export async function hash(string: string): Promise<string> {
  const hashedString = (await argonHash(string, {})).toString();
  return hashedString;
}

export async function compareHash(
  hashedString: string,
  value: string
): Promise<boolean> {
  const sameHash = await verify(hashedString, value);
  return sameHash;
}
