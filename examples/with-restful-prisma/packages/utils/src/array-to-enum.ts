type ReplaceDashWithUnderscore<S extends string> =
  S extends `${infer Head}-${infer Tail}`
    ? `${Head}_${ReplaceDashWithUnderscore<Tail>}`
    : S;

/**
 * Get an enum object from an array of strings where the key and value are the same
 * Used to avoid magic strings in the code
 * @param array Array of strings
 * @returns A readonly object where the key and value are the same
 */
export function getEnumObjectFromArray<
  T extends Readonly<Array<string>>,
  U extends T[number],
>(array: T) {
  return Object.freeze(
    array.reduce(
      (acc, cur) => ({
        ...acc,
        [cur.replaceAll(/-/g, '_')]: cur,
      }),
      {} as {
        [K in U as ReplaceDashWithUnderscore<K>]: K;
      }
    )
  );
}