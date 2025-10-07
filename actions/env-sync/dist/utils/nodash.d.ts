export declare const chunk: <T>(array: Array<T>, length: number) => T[][];
export declare const isString: (value: any) => value is string;
export declare const isArray: <T = unknown>(value: any) => value is Array<T>;
export declare const isRecord: (value: any) => value is Record<string, unknown>;
export declare const isArrayOfRecords: (value: any, force?: boolean) => value is Array<Record<string, unknown>>;
