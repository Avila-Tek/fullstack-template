import { API } from '@repo/services';

let api: API | null = null;

function getTokenFromStorage(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const token = localStorage.getItem('accessToken');
  if (!token) return undefined;
  try {
    return JSON.parse(token);
  } catch {
    return token;
  }
}

export function getAPIClient(): API {
  let baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  baseURL += '/api';
  if (!api) {
    api = new API({ token: getTokenFromStorage, baseURL });
  }
  return api;
}
