export declare const chunk: <T>(array: Array<T>, length: number) => T[][];
export declare const isString: (value: any) => value is string;
export declare const isNumber: (value: any) => value is number;
export declare const isArray: <T = unknown>(value: any) => value is Array<T>;
export declare const isObject: (value: any) => value is Object;
export declare const isRecord: (value: any) => value is Record<string, unknown>;
export declare const isArrayOfRecords: (value: any, force?: boolean) => value is Array<Record<string, unknown>>;
export declare const isUint8Array: (value: any) => value is Uint8Array;
export declare const isUint8ArrayStringifiedAndParsed: (value: any) => value is Record<string, number>;
