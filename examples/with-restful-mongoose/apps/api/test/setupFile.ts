import { afterAll, beforeAll } from 'vitest';
import { setup, teardown } from 'vitest-mongodb';
import * as mongoose from 'mongoose';


beforeAll(async () => {
  await setup();
  const conn = await mongoose.connect(globalThis.__MONGO_URI__);
  await conn.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

afterAll(async () => {
  await teardown();
});
