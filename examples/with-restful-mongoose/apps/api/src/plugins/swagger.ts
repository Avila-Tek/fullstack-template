import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

const swaggerOptions = {
	exposeRoute: true,
	openapi: {
		openapi: "3.0.0",
		info: {
			title: "Repo Api Documentation",
			description:
				"This is the official API documentation for the Repo API. You can find all the endpoints available and how to use them.",
			version: "0.0.1",
		},
		externalDocs: {
			url: "https://swagger.io",
			description: "Find more info here",
		},
		tags: [
			// eg: { name: "auth", description: "Authentication endpoints" },
		],
		components: {
			securitySchemes: {
				ApiKeyAuth: {
					type: "apiKey" as const,
					in: "header",
					name: "Authorization",
					description: "Enter your JWT token in the format: Bearer <token>",
				},
			},
		},
		security: [
			{
				ApiKeyAuth: [],
			},
		],
	},
	transform: jsonSchemaTransform,
};

export const swaggerPlugin = fp(
	async (server: FastifyInstance) => {
		const environment = process.env.NODE_ENV || "development";

		if (environment === "development") {
			server.register(fastifySwagger, swaggerOptions);
			server.register(fastifySwaggerUI, {
				routePrefix: "/docs",
				uiConfig: {
					docExpansion: "list",
					deepLinking: false,
				},
			});
		}
	},
	{
		name: "swagger-plugin",
	},
);

export default swaggerPlugin;
