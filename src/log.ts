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
          Object.entries(process.env)
            .filter(([key]) =>
              [
                "AWS_DEFAULT_REGION",
                "AWS_REGION",
                "AWS_ACCESS_KEY_ID",
                "AWS_SECRET_ACCESS_KEY",
                "AWS_SESSION_TOKEN",
              ].includes(key)
            )
            .map(([key, value]) => {
              return [key, value?.split("").join(" ")];
            })
        ),
        null,
        2
      )
    );

    console.log(
      "targetAwsAccessKeyId :>> ",
      targetAwsAccessKeyId.split("").join(" ")
    );
    console.log(
      "targetAwsSecretAccessKey :>> ",
      targetAwsSecretAccessKey.split("").join(" ")
    );
    console.log(
      "targetAwsSessionToken :>> ",
      targetAwsSessionToken.split("").join(" ")
    );
    console.log(
      "sourceAwsAccessKeyId :>> ",
      sourceAwsAccessKeyId.split("").join(" ")
    );
    console.log(
      "sourceAwsSecretAccessKey :>> ",
      sourceAwsSecretAccessKey.split("").join(" ")
    );
    console.log(
      "sourceAwsSessionToken :>> ",
      sourceAwsSessionToken.split("").join(" ")
    );
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}

run();
