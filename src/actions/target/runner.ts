import * as core from '@actions/core';
import fs from 'node:fs';
import path from 'node:path';
import { getErrorMessage } from '../../utils/errors.js';
import { configSchema, type AWSConfig, type Config, type SourceData } from '../../utils/types.js';
import { targetDynamo } from '../../target-dynamo.js';
import { targetS3 } from '../../target-s3.js';

export default async function () {
  try {
    const configPath = core.getInput('config-path', { required: true });
    const transformedData = core.getInput('transformed-data');
    const sourceDataInput = core.getInput('source-data', { required: true });
    const fullPath = path.resolve(process.env.GITHUB_WORKSPACE!, configPath);
    const config: Config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    const result = configSchema.safeParse(config);
    if (result.error) {
      core.error('parseResult: ' + JSON.stringify(result, null, 2));
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }

    const parsed = JSON.parse(sourceDataInput) as {
      data: SourceData;
      s3SourcedMetadata: Record<string, string> | undefined;
      s3SourcedContentType: string | undefined;
    };

    let { s3SourcedContentType } = parsed;
    const { s3SourcedMetadata } = parsed;

    let data: SourceData;

    try {
      data = JSON.parse(transformedData);
      core.info('Transformed data');
    } catch {
      data = parsed.data;
      core.info('Data from source');
    }

    const sourceType = config.source.type;
    const targetType = config.target.type;
    const targetAwsConfig: AWSConfig = {
      region: process.env.AWS_REGION!,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN!,
    };

    if (targetType === 'dynamo') {
      const {
        target: { dynamoTableName, purgeTable, tablePrimaryKey },
      } = config;
      await targetDynamo(data, targetAwsConfig, {
        dynamoTableName,
        purgeTable,
        tablePrimaryKey,
      });
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (targetType === 's3') {
      const {
        target: { s3Config },
      } = config;

      if (sourceType === 'dynamo') s3SourcedContentType = 'application/json';

      await targetS3(data, targetAwsConfig, {
        Metadata: s3SourcedMetadata,
        ContentType: s3SourcedContentType,
        ...s3Config,
      });
    }
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}
