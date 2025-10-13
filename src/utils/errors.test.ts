import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it.each([
    { argument: new Error('error-message'), expected: 'error-message' },
    { argument: 'message', expected: 'message' },
    { argument: 1, expected: 'Something happened' },
  ])('should return the correct error messages', ({ argument, expected }) => {
    const result = getErrorMessage(argument);
    expect(result).toBe(expected);
  });
});
