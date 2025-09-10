import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import mongoose, { Mongoose } from 'mongoose';

declare module 'fastify' {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  interface FastifyInstance {
    db: {
      connection: Mongoose | null;
      disconnect: () => Promise<void>;
    };
  }
}

export async function connectToDatabase() {
  let connection: typeof mongoose | null = null;
  try {
    connection = await mongoose
      .connect(String(process.env.DATABASE))
      .then((conn) => {
        console.log('🍃 Connected to Mongo database');
        return conn;
      });

    mongoose.connection.on('error', (err) => `❌❌ ${err}`);
  } catch (err) {
    console.log(`ERROR CONNECTING TO MONGO DATABASE: ${err}`);

    if (connection?.connection) {
      connection.connection.close();
    }

    process.exit(1);
  }

  return connection;
}

export async function disconnectFromDatabase(fastify: FastifyInstance) {
  try {
    if (fastify.db.connection) {
      await fastify.db.connection.connection.close();
      console.log('🍃 Disconnected from Mongo database');
    }
  } catch (err) {
    console.error(`ERROR DISCONNECTING FROM MONGO DATABASE: ${err}`);
  }
}

export default fp(
  async (fastify) => {
    const connection = await connectToDatabase();

    fastify.decorate('db', {
      connection,
      disconnect: async () => {
        await disconnectFromDatabase(fastify);
      },
    });
  },
  {
    name: 'database',
  }
);
