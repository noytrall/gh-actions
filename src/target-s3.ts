import * as core from '@actions/core';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { isUint8Array } from 'util/types';
import { getErrorMessage } from './utils/errors.js';
import { isArrayOfRecords, isUint8ArrayStringifiedAndParsed } from './utils/nodash.js';
import type { AWSConfig, SourceData, TargetS3Parameters } from './utils/types.js';

export async function targetS3(
  sourceData: SourceData,
  { accessKeyId, region, secretAccessKey, sessionToken }: AWSConfig,
  s3Config: TargetS3Parameters['s3Config'],
) {
  try {
    let data = sourceData;

    if (isArrayOfRecords(data)) {
      console.log('targetS3.isArrayOfRecords');
      const encoder = new TextEncoder();
      data = encoder.encode(JSON.stringify(data));
    }

    if (isUint8ArrayStringifiedAndParsed(data)) {
      core.info('IS Uint8Array Stringified and Parsed');
      data = new Uint8Array(Object.values(data));
    }

    if (!isUint8Array(data)) {
      throw new Error('Data type is invalid and cannot be used in PutObjectCommand');
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

    core.info('Putting object in bucket: ' + s3Config.Bucket);
    return await s3Client.send(command);
  } catch (error) {
    core.error('target-s3: ' + getErrorMessage(error));
    throw error;
  }
}
