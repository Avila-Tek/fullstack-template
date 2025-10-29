import 'dotenv/config';
import './instrument';
import { envs as _envs } from './config';
import { start } from './server';

start()
  .then((fastify) => {
    fastify?.log.info({ msg: `🚀 Server running on port ${process.env.PORT}` });
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
