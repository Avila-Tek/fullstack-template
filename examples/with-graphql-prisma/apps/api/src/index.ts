import 'dotenv/config';
import { start } from './server';

start()
  .then((server) => {
  })
  .catch((err) => {
    process.exit(1);
  });
