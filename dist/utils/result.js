"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resultFail = exports.resultSuccess = void 0;
/**
 * Returns a ResultSuccess of type T.
 *
 * @param value the successful value
 */
exports.resultSuccess = ((value) => ({
    success: true,
    value,
}));
/**
 * Returns a ResultFailure of type T.
 *
 * @param code the error code
 * @param message the error message
 */
const resultFail = (code, error) => ({
    success: false,
    code,
    message: error instanceof Error ? error.message : error,
});
exports.resultFail = resultFail;
