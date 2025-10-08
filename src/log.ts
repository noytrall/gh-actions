import * as core from "@actions/core";
import { getErrorMessage } from "./utils/errors.js";

async function run() {
  try {
    const targetAwsAccessKeyId = core.getInput("target-aws-access-key-id", {
      required: true,
    });
    const targetAwsSecretAccessKey = core.getInput(
      "target-aws-secret-access-key",
      {
        required: true,
      }
    );
    const targetAwsSessionToken = core.getInput("target-aws-session-token", {
      required: true,
    });

    console.log("ENV", JSON.stringify(process.env, null, 2));

    console.log("targetAwsAccessKeyId :>> ", targetAwsAccessKeyId);
    console.log("targetAwsSecretAccessKey :>> ", targetAwsSecretAccessKey);
    console.log("targetAwsSessionToken :>> ", targetAwsSessionToken);
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}

run();
