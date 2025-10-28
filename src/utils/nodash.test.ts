import { chunk, isString } from './nodash';

describe('nodash', () => {
  describe('chunk', () => {
    it('should return an array of arrays', () => {
      expect(chunk([1, 2, 3, 4], 3)).toStrictEqual([[1, 2, 3], [4]]);
    });
  });

  describe('isString', () => {
    it.each([
      { argument: 1, expected: false },
      { argument: '', expected: true },
    ])('should return $expected for argument $argument', ({ argument, expected }) => {
      expect(isString(argument)).toBe(expected);
    });
  });
});
