import { isString } from "./nodash.js";

export function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (isString(e)) return e;
  return "Something happened";
}
