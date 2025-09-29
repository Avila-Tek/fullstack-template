import {
  TCreateUserInput,
  TPaginationInput,
  TUpdateUserInput,
} from '@repo/schemas';
import { type FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    userController: UserController;
  }
}

class UserController {
  constructor(private readonly fastify: FastifyInstance) {
    this.fastify = fastify;

    this.findMany = this.findMany.bind(this);
    this.findOne = this.findOne.bind(this);
    this.createOne = this.createOne.bind(this);
    this.updateOne = this.updateOne.bind(this);
    this.deleteOne = this.deleteOne.bind(this);
  }

  async findMany(
    request: FastifyRequest<{ Querystring: TPaginationInput }>,
    reply: FastifyReply
  ) {
    const data = await this.fastify.userService.findMany({
      page: request.query.page,
      perPage: request.query.perPage,
    });
    if (!data) {
      reply
        .status(500)
        .send({ success: false, error: 'Internal server error' });
      return;
    }
    reply.status(200).send({
      success: true,
      data,
    });
  }

  async findOne(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const data = await this.fastify.userService.findOne({
      id: request.params.id,
    });
    if (!data) {
      reply.status(404).send({ success: false, error: 'Not found' });
      return;
    }
    reply.status(200).send({ success: true, data });
  }

  async createOne(
    request: FastifyRequest<{ Body: TCreateUserInput }>,
    reply: FastifyReply
  ) {
    const data = await this.fastify.userService.createOne(request.body);
    if (!data) {
      reply
        .status(500)
        .send({ success: false, error: 'Internal server error' });
      return;
    }
    reply.status(201).send({ success: true, data });
  }

  async updateOne(
    request: FastifyRequest<{ Params: { id: string }; Body: TUpdateUserInput }>,
    reply: FastifyReply
  ) {
    const data = await this.fastify.userService.updateOne(
      request.params.id,
      request.body
    );
    if (!data) {
      reply
        .status(500)
        .send({ success: false, error: 'Internal server error' });
      return;
    }
    reply.status(201).send({ success: true, data });
  }

  async deleteOne(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    await this.fastify.userService.deleteOne(request.id);
    reply.status(200).send({ success: true, data: {} });
  }
}

export default fp(
  async function (fastify: FastifyInstance) {
    const userController = new UserController(fastify);
    fastify.decorate('userController', userController);
  },
  { name: 'user-controller', dependencies: ['user-service'] }
);
