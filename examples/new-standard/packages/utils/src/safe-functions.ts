/**
 * @type Safe<T>
 * @template T - The expected data type if the operation is successful.
 * @description A discriminated union type representing the result of an operation.
 *              The result can either be a success with `data` or a failure with an `error` message.
 */
export type Safe<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

/**
 * @function safe
 * @description A utility function to safely handle synchronous and asynchronous operations.
 *              This function captures errors and provides a consistent result structure for both
 *              success and failure scenarios, using a `Safe` type.
 *
 * @param {Promise<T> | (() => T)} promiseOrFunc - A promise or synchronous function to execute safely.
 *                                                  When a promise is provided, the function awaits it;
 *                                                  if a function is provided, it executes it immediately.
 * @param {string} [err] - Optional custom error message to return in case of failure.
 *
 * @returns {Promise<Safe<T>> | Safe<T>} - A `Safe<T>` object, which is either:
 *                                         - `{ success: true, data: T }` if successful,
 *                                         - `{ success: false, error: string }` if failed.
 *
 * @example <caption>Handling an async operation safely</caption>
 * ```typescript
 * const fetchData = async () => {
 *   const result = await safe(fetch('https://api.example.com/data'));
 *   if (result.success) {
 *     console.log(result.data); // Handle the fetched data
 *   } else {
 *     console.error(result.error); // Handle the error message
 *   }
 * };
 * ```
 *
 * @example <caption>Handling a sync function safely</caption>
 * ```typescript
 * const calculate = () => safe(() => someComputation());
 * const result = calculate();
 * if (result.success) {
 *   console.log(result.data); // Handle computation result
 * } else {
 *   console.error(result.error); // Handle the error message
 * }
 * ```
 */
export function safe<T>(promise: Promise<T>, err?: string): Promise<Safe<T>>;
export function safe<T>(func: () => T, err?: string): Safe<T>;
export function safe<T>(
  promiseOrFunc: Promise<T> | (() => T),
  err?: string
): Promise<Safe<T>> | Safe<T> {
  if (promiseOrFunc instanceof Promise) {
    return safeAsync(promiseOrFunc, err);
  }
  return safeSync(promiseOrFunc, err);
}

/**
 * @function safeAsync
 * @description Handles async operations safely by awaiting the promise and catching errors.
 * @param {Promise<T>} promise - The promise to await.
 * @param {string} [err] - Optional custom error message to return if an error occurs.
 * @returns {Promise<Safe<T>>} - A `Safe<T>` result object.
 */
async function safeAsync<T>(
  promise: Promise<T>,
  err?: string
): Promise<Safe<T>> {
  try {
    const data = await promise;
    return { data, success: true };
  } catch (e) {
    console.error(e);
    if (err !== undefined) {
      return { success: false, error: err };
    }
    if (e instanceof Error) {
      return { success: false, error: e.message };
    }
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * @function safeSync
 * @description Handles synchronous operations safely by executing the function and catching errors.
 * @param {() => T} func - The synchronous function to execute.
 * @param {string} [err] - Optional custom error message to return if an error occurs.
 * @returns {Safe<T>} - A `Safe<T>` result object.
 */
function safeSync<T>(func: () => T, err?: string): Safe<T> {
  try {
    const data = func();
    return { data, success: true };
  } catch (e) {
    console.error(e);
    if (err !== undefined) {
      return { success: false, error: err };
    }
    if (e instanceof Error) {
      return { success: false, error: e.message };
    }
    return { success: false, error: 'Something went wrong' };
  }
}
