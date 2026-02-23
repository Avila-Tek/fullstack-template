// import { getAccessTokenCookie } from '../cookies/cookies';
import { localStorageKeysEnumObject } from '../localStorage';

/**
 * Token provider utility for API authentication - Client-side only (synchronous)
 * Retrieves access token from localStorage
 * For server-side or async token retrieval, use getAccessTokenAsync
 * @returns The access token or undefined if not found
 */
export function getAccessToken(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  // Get token from localStorage
  const token = localStorage.getItem(localStorageKeysEnumObject.accessToken);
  if (token) {
    return token;
  }

  return undefined;
}

// /**
//  * Async token provider that checks both localStorage (client-side) and cookies (server-side)
//  * Use this when you need to get the token in both client and server contexts
//  * @returns The access token or undefined if not found
//  */
// export async function getAccessTokenAsync(): Promise<string | undefined> {
//   if (
//     typeof window !== 'undefined' &&
//     localStorage.getItem(localStorageKeysEnumObject.accessToken) !== null
//   ) {
//     // Client-side: get token from localStorage
//     return localStorage.getItem(localStorageKeysEnumObject.accessToken)!;
//   } else if (typeof window === 'undefined') {
//     // Server-side: get token from cookies
//     const token = await getAccessTokenCookie();
//     if (token) {
//       return token;
//     }
//   }

//   return undefined;
// }
