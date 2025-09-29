import { StandardError } from '../types';
import { EntityType, ErrorCodes, errorsDictionary } from './general';

export class ErrorRegistry {
  private readonly errors: Record<EntityType, Record<string, StandardError>>;

  constructor() {
    this.errors = errorsDictionary;
  }

  getError<T extends EntityType>(
    entity: T,
    type: ErrorCodes<T>
  ): StandardError {
    if (!this.errors[entity]) {
      throw new Error(`Entity ${entity} does not exist in error registry.`);
    }
    if (!this.errors[entity][type]) {
      throw new Error(
        `Error type ${String(type)} does not exist for entity ${entity}.`
      );
    }

    return this.errors[entity][type];
  }
}

export const errorRegistry = new ErrorRegistry();
export type { EntityType, ErrorCodes } from './general';
