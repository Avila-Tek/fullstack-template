import { envs } from '@/config';
import { createApp } from './app';

export async function start() {
  try {
    const server = await createApp();
    process.on('unhandledRejection', (err) => {
      server.log.fatal(err, 'Error unhandledRejection');
      process.exit(1);
    });

    const { port, host } = envs;

    await server.listen({ host, port });

    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.on(signal, () =>
        server.close().then((err) => {
          console.error(err);
          process.exit(err ? 1 : 0);
        })
      );
    }
    return server;
  } catch (err) {
    console.log(err);
  }
}
