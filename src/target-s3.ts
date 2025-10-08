import * as core from "@actions/core";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { isUint8Array } from "util/types";
import { getErrorMessage } from "./utils/errors.js";
import { isArrayOfRecords } from "./utils/nodash.js";
import type {
  AWSConfig,
  SourceData,
  TargetS3Parameters,
} from "./utils/type.js";

export default async function (
  sourceData: SourceData,
  { accessKeyId, region, secretAccessKey, sessionToken }: AWSConfig,
  { s3Config }: Omit<TargetS3Parameters, "type">
) {
  try {
    let data = sourceData;

    if (isArrayOfRecords(data)) {
      const encoder = new TextEncoder();
      data = encoder.encode(JSON.stringify(data));
    }

    if (!isUint8Array(data)) {
      throw new Error("Something HERE");
    }

    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken: sessionToken,
      },
    });

    const command = new PutObjectCommand({
      Body: data,
      ...s3Config,
    });

    return await s3Client.send(command);
  } catch (error) {
    core.error("target-s3: " + getErrorMessage(error));
    throw error;
  }
}
