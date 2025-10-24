import { isUint8Array } from 'node:util/types';

export const chunk = <T>(array: T[], length: number): T[][] => {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += length) chunks.push(array.slice(i, i + length));

  return chunks;
};

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isNumber = (value: unknown): value is number => typeof value === 'number';

export const isArray = <T = unknown>(value: unknown): value is T[] => Array.isArray(value);

export const isObject = (value: unknown): value is object => value !== null && typeof value === 'object';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !isArray(value) && !isUint8Array(value);

export const isArrayOfRecords = (value: unknown): value is Record<string, unknown>[] => {
  return isArray(value) && value.every(isRecord);
};

export const isUint8ArrayStringifiedAndParsed = (value: unknown): value is Record<string, number> => {
  return isRecord(value) && Object.values(value).every(isNumber);
};
