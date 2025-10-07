export const chunk = <T>(array: Array<T>, length: number): T[][] => {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += length)
    chunks.push(array.slice(i, i + length));

  return chunks;
};

export const isString = (value: any): value is string =>
  typeof value === "string";

export const isArray = <T = unknown>(value: any): value is Array<T> =>
  Array.isArray(value);

export const isRecord = (value: any): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !isArray(value);

export const isArrayOfRecords = (
  value: any,
  force?: boolean
): value is Array<Record<string, unknown>> => {
  if (force !== undefined) return force;

  return isArray(value) && value.every(isRecord);
};
