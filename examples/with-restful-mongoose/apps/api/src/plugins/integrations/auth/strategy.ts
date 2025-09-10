import { FastifyReply, FastifyRequest } from 'fastify';

export abstract class AuthStrategy {
  abstract name: string;
  public abstract initiate(
    request: FastifyRequest
  ): Promise<{ redirectUrl: string }>;
  public abstract handleCallback(request: FastifyRequest): Promise<void>;
}

export class AuthContext {
  private strategy: AuthStrategy;
  constructor(strategy: AuthStrategy) {
    this.strategy = strategy;
  }

  public async initiate(request: FastifyRequest) {
    try {
      const response = await this.strategy.initiate(request);
      return response;
    } catch (error) {
      console.error(
        `Authentication failed using strategy ${this.strategy.name}`,
        error
      );
      return {
        statusCode: 500,
        error: 'Internal Server Error',
        message: `Authentication failed using strategy ${this.strategy.name}`,
      };
    }
  }

  public async handleCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const response = await this.strategy.handleCallback(request);
      return response;
    } catch (error) {
      console.error(
        `Callback handling failed using strategy ${this.strategy.name}`,
        error
      );
      return {
        statusCode: 500,
        error: 'Internal Server Error',
        message: `Authentication failed using strategy ${this.strategy.name}`,
      };
    }
  }
}
