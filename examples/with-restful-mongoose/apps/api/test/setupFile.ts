import * as mongoose from 'mongoose';
import { afterAll, beforeAll } from 'vitest';
import { setup, teardown } from 'vitest-mongodb';

beforeAll(async () => {
  await setup();
  const conn = await mongoose.connect(globalThis.__MONGO_URI__);
  await conn.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

afterAll(async () => {
  await teardown();
});
