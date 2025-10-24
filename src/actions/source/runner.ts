import * as core from '@actions/core';
import fs from 'node:fs';
import path from 'node:path';
import { sourceDynamo } from '../../source-dynamo.js';
import { sourceS3 } from '../../source-s3.js';
import { configSchema, type AWSConfig, type Config, type SourceData } from '../../utils/types.js';
import { getErrorMessage } from '../../utils/errors.js';
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

    let sourceData: SourceData = null;

    const sourceType = config.source.type;

    const sourceAwsConfig: AWSConfig = {
      region: process.env.AWS_REGION!,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN!,
    };

    if (sourceType === 'dynamo') {
      const {
        source: { dynamoTableName, maxNumberOfRecords },
      } = config;
      sourceData = await sourceDynamo(
        sourceAwsConfig,
        {
          dynamoTableName,
        },
        { maxNumberOfRecords },
      );
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (sourceType === 's3') {
      const {
        source: { s3Config },
      } = config;
      const response = await sourceS3(sourceAwsConfig, s3Config);

      if (!response.Body) throw new Error('No Body attribute in response');
      sourceData = await response.Body.transformToByteArray();

      if (config.target.type === 's3') {
        fs.writeFileSync(
          path.resolve(process.env.GITHUB_WORKSPACE!, S3_INFO_FILE_PATH),
          JSON.stringify({
            Metadata: response.ContentType,
            ContentType: response.Metadata,
          }),
          'utf-8',
        );
      }
    }

    if (!sourceData) {
      // TODO: Handle this
      throw new Error('Somehow, sourceData is null');
    }
    core.info('WRITTING TO: ' + path.resolve(process.env.GITHUB_WORKSPACE!, SOURCE_DATA_FILE_PATH));
    fs.writeFileSync(
      path.resolve(process.env.GITHUB_WORKSPACE!, SOURCE_DATA_FILE_PATH),
      JSON.stringify(sourceData),
      'utf-8',
    );
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}
