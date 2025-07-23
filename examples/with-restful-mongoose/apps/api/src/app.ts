// Import this first!
import "./instrument";
import type { Server } from "node:http";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import * as Sentry from "@sentry/node";
import Fastify, { type FastifyHttpOptions } from "fastify";
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod";
import mongoose from "mongoose";
import { swaggerPlugin } from "./plugins";

export async function createApp() {
	let connection: typeof mongoose | null = null;
	try {
		connection = await mongoose
			.connect(String(process.env.DATABASE))
			.then((conn) => {
				console.log("Connected to database");
				return conn;
			});

		mongoose.connection.on("error", (err) => `❌🤬❌🤬 ${err}`);
	} catch (err) {
		console.log(`ERROR: ${err}`);
		if (connection?.connection) {
			connection.connection.close();
		}
		process.exit(1);
	}

	let config: FastifyHttpOptions<Server> = {};

	if (process.env.NODE_ENV === "production") {
		config = {
			logger: {
				level: "info",
				transport: {
					target: "@axiomhq/pino",
					options: {
						dataset: process.env.AXIOM_DATASET,
						token: process.env.AXIOM_TOKEN,
					},
				},
			},
		};
	}

	const app = Fastify(config).withTypeProvider<ZodTypeProvider>();

	// Add schema validator and serializer
	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(serializerCompiler);

	if (process.env.NODE_ENV === "production") {
		Sentry.setupFastifyErrorHandler(app);
		await app.register(helmet);
		await app.register(rateLimit);
	}

	await app.register(cors, {
		origin: JSON.parse(process.env.CORS_ORIGINS ?? '["*"]'),
		credentials: true,
	});

	// Register the swagger plugin
	app.register(swaggerPlugin);

	await app.ready();

	return app;
}
