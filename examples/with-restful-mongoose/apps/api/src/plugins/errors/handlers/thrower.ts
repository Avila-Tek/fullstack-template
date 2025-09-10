import { EntityType, ErrorCodes, errorRegistry } from './dictionaries';
import { Exception } from './exception';

function throwException<T extends EntityType>(
  entity: T,
  errorCode: ErrorCodes<T>,
  params: Record<string, any> = {},
  silent: boolean = false
): never {
  const data = errorRegistry.getError(entity, errorCode);
  // Throwing exception
  throw new Exception({ data, silent, params });
}

function exception<T extends EntityType>(
  entity: T,
  errorCode: ErrorCodes<T>,
  params: Record<string, any> = {}
): never {
  throwException<T>(entity, errorCode, params, false);
}

/**
 * @function silentException
 * @description This is not related exception thorw by the systems. For example not being able to decode a jwt token in a updating operation.
 * @param entity
 * @param errorCode
 * @param params
 */
function silentException<T extends EntityType>(
  entity: T,
  errorCode: ErrorCodes<T>,
  params: Record<string, any> = {}
): never {
  throwException<T>(entity, errorCode, params, true);
}

export const thrower = Object.freeze({ exception, silentException });
