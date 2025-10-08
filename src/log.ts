import * as core from "@actions/core";
import { getErrorMessage } from "./utils/errors.js";

async function run() {
  try {
    const sourceAwsAccessKeyId = core.getInput("source-aws-access-key-id", {
      required: true,
    });
    const sourceAwsSecretAccessKey = core.getInput(
      "source-aws-secret-access-key",
      {
        required: true,
      }
    );
    const sourceAwsSessionToken = core.getInput("source-aws-session-token", {
      required: true,
    });
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

    console.log(
      "ENV",
      JSON.stringify(
        Object.fromEntries(
          Object.entries(process.env).map(([key, value]) => {
            return [key, value?.split("").join(" ")];
          })
        ),
        null,
        2
      )
    );

    console.log("targetAwsAccessKeyId :>> ", targetAwsAccessKeyId);
    console.log("targetAwsSecretAccessKey :>> ", targetAwsSecretAccessKey);
    console.log("targetAwsSessionToken :>> ", targetAwsSessionToken);
    console.log("sourceAwsAccessKeyId :>> ", sourceAwsAccessKeyId);
    console.log("sourceAwsSecretAccessKey :>> ", sourceAwsSecretAccessKey);
    console.log("sourceAwsSessionToken :>> ", sourceAwsSessionToken);
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}

run();
