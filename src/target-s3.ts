import * as core from "@actions/core";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getErrorMessage } from "./utils/errors.js";
import type { TargetS3Parameters } from "./utils/type.js";

export default async function ({
  accessKeyId,
  region,
  secretAccessKey,
  sessionToken,
  s3Props,
}: Omit<TargetS3Parameters, "type">) {
  try {
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken: sessionToken,
      },
    });

    const command = new PutObjectCommand(s3Props);

    return await s3Client.send(command);
  } catch (error) {
    core.error("target-s3: " + getErrorMessage(error));
    throw error;
  }
}
