import * as core from '@actions/core';
import fs from 'node:fs';
import path from 'node:path';
import { sourceDynamo } from '../../source-dynamo.js';
import { sourceS3 } from '../../source-s3.js';
import { configSchema, type AWSConfig, type Config, type SourceData } from '../../utils/types.js';
import { getErrorMessage } from '../../utils/errors.js';
import { SOURCE_DATA_FILE_PATH } from '../../utils/files.js';

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
    let s3SourcedMetadata: Record<string, string> | undefined = undefined;
    let s3SourcedContentType: string | undefined;

    const sourceType = config.source.type;

    const sourceAwsConfig: AWSConfig = {
      region: process.env.AWS_REGION!,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN!,
    };

    if (sourceType === 'dynamo') {
      const {
        source: { dynamoTableName },
      } = config;
      sourceData = await sourceDynamo(sourceAwsConfig, {
        dynamoTableName,
      });
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (sourceType === 's3') {
      const {
        source: { s3Config },
      } = config;
      const response = await sourceS3(sourceAwsConfig, s3Config);

      if (!response.Body) throw new Error('No Body attribute in response');
      sourceData = await response.Body.transformToByteArray();
      s3SourcedContentType = response.ContentType;
      s3SourcedMetadata = response.Metadata;
    }

    if (!sourceData) {
      // TODO: Handle this
      throw new Error('Somehow, sourceData is null');
    }
    core.info('WRITTING TO: ' + path.resolve(process.env.GITHUB_WORKSPACE!, SOURCE_DATA_FILE_PATH));
    fs.writeFileSync(path.resolve(process.env.GITHUB_WORKSPACE!, SOURCE_DATA_FILE_PATH), JSON.stringify(sourceData));

    if (config.target.type === 's3') {
      core.setOutput(
        's3-info',
        JSON.stringify({
          Metadata: s3SourcedMetadata,
          ContentType: s3SourcedContentType,
        }),
      );
    }
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}
