/**
 * Returns a ResultSuccess of type T.
 *
 * @param value the successful value
 */
export const resultSuccess = ((value) => ({
    success: true,
    value,
}));
/**
 * Returns a ResultFailure of type T.
 *
 * @param code the error code
 * @param message the error message
 */
export const resultFail = (code, error) => ({
    success: false,
    code,
    message: error instanceof Error ? error.message : error,
});
//# sourceMappingURL=result.js.map