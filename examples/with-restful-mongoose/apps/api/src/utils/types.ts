export type GetValidValueResultType<
  D extends E[number],
  E extends readonly any[],
  S extends boolean = true,
> = S extends true
  ? E[number]
  : D extends E[number]
    ? E[number]
    : E[number] | undefined;

export const createLiteralOptionType = <E extends readonly any[]>(enums: E) => {
  if (!Array.isArray(enums)) throw new Error('[EnumOption]: invalid enums');

  const getValidValue = <
    D extends E[number] | undefined = undefined,
    S extends boolean = true,
  >(
    inputString: string,
    options?: {
      defaultValue?: D;
      throwError?: S;
    }
  ): GetValidValueResultType<D, E, S> => {
    const { throwError, defaultValue } = {
      throwError: true,
      ...options,
    };

    const found = enums.find((enumValue) => enumValue === inputString);
    if (found) return found as E[number];

    if (throwError)
      throw new Error(`[EnumOption]: String must be one of this: ${enums}`);

    return defaultValue ?? (found as undefined);
  };

  return { getValidValue };
};
