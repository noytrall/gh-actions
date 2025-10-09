export const chunk = <T>(array: Array<T>, length: number): T[][] => {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += length)
    chunks.push(array.slice(i, i + length));

  return chunks;
};

export const isString = (value: any): value is string =>
  typeof value === "string";

export const isNumber = (value: any): value is number =>
  typeof value === "number";

export const isArray = <T = unknown>(value: any): value is Array<T> =>
  Array.isArray(value);

export const isObject = (value: any): value is Object =>
  value !== null && typeof value === "object";

export const isRecord = (value: any): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !isArray(value);

export const isArrayOfRecords = (
  value: any,
  force?: boolean
): value is Array<Record<string, unknown>> => {
  if (force !== undefined) return force;

  return isArray(value) && value.every(isRecord);
};

export const isUint8Array = (value: any): value is Uint8Array => {
  return isArray(value) && value.every(isNumber);
};
