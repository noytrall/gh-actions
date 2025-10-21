import * as core from '@actions/core';
import fs from 'node:fs';
import path from 'node:path';
import { getErrorMessage } from '../../utils/errors.js';
import { configSchema, TargetS3Parameters, type AWSConfig, type Config, type SourceData } from '../../utils/types.js';
import { targetDynamo } from '../../target-dynamo.js';
import { targetS3 } from '../../target-s3.js';
import { S3_INFO_FILE_PATH, SOURCE_DATA_FILE_PATH } from '../../utils/files.js';

export default async function () {
  try {
    const configPath = core.getInput('config-path', { required: true });
    const fullPath = path.resolve(process.env.GITHUB_WORKSPACE!, configPath);
    const config: Config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    const result = configSchema.safeParse(config);
    if (result.error) {
      core.error('parseResult: ' + JSON.stringify(result, null, 2));
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }

    const sourceDataFullPath = path.resolve(process.env.GITHUB_WORKSPACE!, SOURCE_DATA_FILE_PATH);
    core.info('READING DATA FROM: ' + sourceDataFullPath);
    const data: SourceData = JSON.parse(fs.readFileSync(sourceDataFullPath, 'utf8'));

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

      let targetS3Config: TargetS3Parameters['s3Config'] = {
        ...s3Config,
      };
      if (sourceType === 's3') {
        const s3InfoPath = path.resolve(process.env.GITHUB_WORKSPACE!, S3_INFO_FILE_PATH);
        core.info('READING S3 FROM: ' + s3InfoPath);
        const s3Info = JSON.parse(fs.readFileSync(s3InfoPath, 'utf8'));
        targetS3Config = { ...targetS3Config, ...s3Info };
      }

      if (sourceType === 'dynamo') targetS3Config.ContentType = 'application/json';

      await targetS3(data, targetAwsConfig, targetS3Config);
    }
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}
