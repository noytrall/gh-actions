import * as core from "@actions/core";
import { getErrorMessage } from "./utils/errors.js";

async function run() {
  try {
    console.log("ENV", JSON.stringify(process.env, null, 2));
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}

run();
