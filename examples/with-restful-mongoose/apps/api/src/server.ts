import { createApp } from './app';

export async function start() {
  try {
    const server = await createApp();
    process.on('unhandledRejection', (err) => {
      console.error(err);
      process.exit(1);
    });

    const port = parseInt(String(process.env.PORT || '3000'), 10);
    const host = process.env.HOST || '0.0.0.0';
    await server.listen({ host, port });

    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.on(signal, () =>
        server.close().then((err) => {
          process.exit(err ? 1 : 0);
        })
      );
    }
    return server;
  } catch (err) {
    console.log(err);
  }
}
