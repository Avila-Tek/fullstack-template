'use client';

import { useAnalytics } from '@repo/ui/analytics';
import {
  useFeatureFlagPayload,
  useFeatureFlagValue,
  useIdUser,
} from '@repo/ui/feature-flags';

export default function FFExamplePage() {
  const user = { id: 'jose', name: 'Jose Roberto', email: 'jose@avilatek.com' };
  useIdUser(user);
  const val = useFeatureFlagValue('testing-ff');
  const payload = useFeatureFlagPayload('testing-ff');
  const analytics = useAnalytics();
  console.log(val, payload);
  analytics?.track('new-user', user);
  return <h1>Hola!!</h1>;
}
