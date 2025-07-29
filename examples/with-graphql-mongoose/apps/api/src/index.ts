import 'dotenv/config';
import { start } from './server';

start()
  .then((_server) => {
    console.log('Server running');
  })
  .catch((err) => {
    process.exit(1);
  });
