import {
  chunk,
  isArray,
  isArrayOfRecords,
  isNumber,
  isObject,
  isRecord,
  isString,
  isUint8ArrayStringifiedAndParsed,
} from './nodash';

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

  describe('isNumber', () => {
    it.each([
      { argument: 1, expected: true },
      { argument: '', expected: false },
    ])('should return $expected for argument $argument', ({ argument, expected }) => {
      expect(isNumber(argument)).toBe(expected);
    });
  });

  describe('isArray', () => {
    it.each([
      { argument: 1, expected: false },
      { argument: [], expected: true },
    ])('should return $expected for argument $argument', ({ argument, expected }) => {
      expect(isArray(argument)).toBe(expected);
    });
  });

  describe('isObject', () => {
    it.each([
      { argument: null, expected: false },
      { argument: 1, expected: false },
      { argument: [], expected: true },
      { argument: {}, expected: true },
    ])('should return $expected for argument $argument', ({ argument, expected }) => {
      expect(isObject(argument)).toBe(expected);
    });
  });

  describe('isRecord', () => {
    it.each([
      { argument: null, expected: false },
      { argument: 1, expected: false },
      { argument: [], expected: false },
      { argument: {}, expected: true },
    ])('should return $expected for argument $argument', ({ argument, expected }) => {
      expect(isRecord(argument)).toBe(expected);
    });
  });

  describe('isArrayOfRecord', () => {
    it.each([
      { argument: null, expected: false },
      { argument: 1, expected: false },
      { argument: [], expected: true },
      { argument: {}, expected: false },
      { argument: [1, {}], expected: false },
      { argument: [{}, {}], expected: true },
    ])('should return $expected for argument $argument', ({ argument, expected }) => {
      expect(isArrayOfRecords(argument)).toBe(expected);
    });
  });
  describe('isUint8ArrayStringifiedAndParsed', () => {
    it.each([
      { argument: null, expected: false },
      { argument: 1, expected: false },
      { argument: [], expected: false },
      { argument: {}, expected: true },
      { argument: [1, {}], expected: false },
      { argument: [{}, {}], expected: false },
      { argument: { '1': 1, '2': 2, '3': 3 }, expected: true },
    ])('should return $expected for argument $argument', ({ argument, expected }) => {
      expect(isUint8ArrayStringifiedAndParsed(argument)).toBe(expected);
    });
  });
});
