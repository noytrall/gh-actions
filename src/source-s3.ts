import * as core from '@actions/core';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getErrorMessage } from './utils/errors.js';
import type { AWSConfig, SourceS3Parameters } from './utils/types.js';

export default async function (
  { accessKeyId, region, secretAccessKey, sessionToken }: AWSConfig,
  s3Config: SourceS3Parameters['s3Config'],
) {
  try {
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken: sessionToken,
      },
    });

    core.info('Getting object from bucket: ' + s3Config.Bucket);
    const command = new GetObjectCommand(s3Config);

    return await s3Client.send(command);
  } catch (error) {
    core.error('source-s3: ' + getErrorMessage(error));
    throw error;
  }
}
