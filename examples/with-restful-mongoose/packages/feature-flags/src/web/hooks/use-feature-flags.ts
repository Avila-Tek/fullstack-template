import { useContext } from 'react';
import { FeatureFlagContext } from '../FFContext';

export function useFeatureFlagPayload(name: string) {
  const ctx = useContext(FeatureFlagContext);
  if (ctx === null || typeof ctx === 'undefined') {
    throw new TypeError(
      `useFeatureFlagPayload cannot be used outside FeatureFlagContextProvider`
    );
  }
  return ctx.context.useFeatureFlagPayload(name);
}
export function useFeatureFlagValue(name: string) {
  const ctx = useContext(FeatureFlagContext);
  if (ctx === null || typeof ctx === 'undefined') {
    throw new TypeError(
      `useFeatureFlagValue cannot be used outside FeatureFlagContextProvider`
    );
  }
  return ctx.context.useFeatureFlagValue(name);
}

export function useIdUser<TUser extends { id: string }>(user: TUser) {
  const ctx = useContext(FeatureFlagContext);
  if (ctx === null || typeof ctx === 'undefined') {
    throw new TypeError(
      `useIdUser cannot be used outside FeatureFlagContextProvider`
    );
  }
  return ctx.context.useIdUser(user);
}

export function useIdentifyUser() {
  const ctx = useContext(FeatureFlagContext);
  if (ctx === null || typeof ctx === 'undefined') {
    throw new TypeError(
      `useIdUser cannot be used outside FeatureFlagContextProvider`
    );
  }
  return ctx.context.useIdUser;
}
