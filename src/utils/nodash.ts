export const chunk = <T>(array: T[], length: number): T[][] => {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += length) chunks.push(array.slice(i, i + length));

  return chunks;
};

export const isString = (value: unknown): value is string => typeof value === 'string';
