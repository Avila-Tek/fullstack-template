import { API } from '@repo/services';

let api: API | null = null;

export function getAPIClient(token?: string): API {
  let baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  baseURL += '/api';
  if (!api) {
    api = new API({ token, baseURL });
  }
  return api;
}
