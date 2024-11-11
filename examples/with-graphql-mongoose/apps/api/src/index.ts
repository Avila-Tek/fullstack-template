import 'dotenv/config';
import { start } from './server';

start()
  .then((_server) => {
    console.log('Server running');
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
