import { getAPIClient } from '@/src/lib/api';
import { HabitsServiceClass } from './habits.service';

const api = getAPIClient();
export const HabitsService = new HabitsServiceClass(
  api.v1.habits,
  api.v1.habitLogs
);
