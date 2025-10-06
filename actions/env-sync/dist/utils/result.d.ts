export interface ResultSuccess<T> {
    success: true;
    value: T;
}
export interface ResultFailure<U extends string | number = string> {
    success: false;
    code: U;
    message: string;
}
/**
 * Union of success of type T and failure of type U.
 *
 * E.g. T is a string response and U a numeric error code.
 */
export type Result<T, U extends string | number = string> = ResultSuccess<T> | ResultFailure<U>;
/**
 * Union of success of type void and failure of type U.
 *
 * E.g. There is no response data for the success and U a numeric error code.
 */
export type VoidResult<U extends string | number = string> = Result<void, U>;
/**
 * Returns a ResultSuccess of type T.
 *
 * @param value the successful value
 */
export declare const resultSuccess: (<T>(v: T) => ResultSuccess<T>) & (() => ResultSuccess<void>);
/**
 * Returns a ResultFailure of type T.
 *
 * @param code the error code
 * @param message the error message
 */
export declare const resultFail: <U extends string | number = string>(code: U, error?: any) => ResultFailure<U>;
