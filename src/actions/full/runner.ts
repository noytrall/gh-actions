import * as core from '@actions/core';
import fs from 'node:fs';
import path from 'node:path';
import { isUint8Array } from 'node:util/types';
import vm from 'vm';
import { sourceDynamo } from '../../source-dynamo.js';
import { sourceS3 } from '../../source-s3.js';
import { targetDynamo } from '../../target-dynamo.js';
import { targetS3 } from '../../target-s3.js';
import { getErrorMessage } from '../../utils/errors.js';
import { configSchema, type AWSConfig, type Config, type SourceData } from '../../utils/types.js';

export default async function () {
  console.log('process.env.GITHUB_WORKSPACE! :>> ', process.env.GITHUB_WORKSPACE!);
  console.log('process.cwd()', process.cwd());

  const transformerFunction = getTransformerScript();

  try {
    const configPath = core.getInput('config-path', { required: true });
    const fullPath = path.resolve(process.env.GITHUB_WORKSPACE!, configPath);

    const config: Config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    const result = configSchema.safeParse(config);

    const [
      sourceAwsRegion,
      sourceAwsAccessKeyId,
      sourceAwsSecretAccessKey,
      sourceAwsSessionToken,
      targetAwsRegion,
      targetAwsAccessKeyId,
      targetAwsSecretAccessKey,
      targetAwsSessionToken,
    ] = [
      'source-aws-region',
      'source-aws-access-key-id',
      'source-aws-secret-access-key',
      'source-aws-session-token',
      'target-aws-region',
      'target-aws-access-key-id',
      'target-aws-secret-access-key',
      'target-aws-session-token',
    ].map((key) =>
      core.getInput(key, {
        required: true,
      }),
    ) as [string, string, string, string, string, string, string, string];

    core.setSecret(sourceAwsAccessKeyId);
    core.setSecret(sourceAwsSecretAccessKey);
    core.setSecret(sourceAwsSessionToken);
    core.setSecret(targetAwsAccessKeyId);
    core.setSecret(targetAwsSecretAccessKey);
    core.setSecret(targetAwsSessionToken);

    if (result.error) {
      core.error('parseResult: ' + JSON.stringify(result, null, 2));
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }

    let sourceData: SourceData = null;
    let s3SourcedMetadata: Record<string, string> | undefined = undefined;
    let s3SourcedContentType: string | undefined;

    const sourceType = config.source.type;
    const targetType = config.target.type;

    const sourceAwsConfig: AWSConfig = {
      region: sourceAwsRegion,
      accessKeyId: sourceAwsAccessKeyId,
      secretAccessKey: sourceAwsSecretAccessKey,
      sessionToken: sourceAwsSessionToken,
    };
    const targetAwsConfig: AWSConfig = {
      region: targetAwsRegion,
      accessKeyId: targetAwsAccessKeyId,
      secretAccessKey: targetAwsSecretAccessKey,
      sessionToken: targetAwsSessionToken,
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

    console.log('transformerFunction', transformerFunction);
    if (transformerFunction) {
      console.log('TRANSFORMING');
      if (isUint8Array(sourceData)) {
        console.log('TRANSFORMING Uint8Array');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
        sourceData = new TextEncoder().encode(transformerFunction(new TextDecoder().decode(sourceData)));
      } else {
        console.log('DYNAMO');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        sourceData = transformerFunction(sourceData);
      }
    }

    if (targetType === 'dynamo') {
      const {
        target: { dynamoTableName, purgeTable, tablePrimaryKey },
      } = config;
      await targetDynamo(sourceData, targetAwsConfig, {
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

      await targetS3(sourceData, targetAwsConfig, {
        Metadata: s3SourcedMetadata,
        ContentType: s3SourcedContentType,
        ...s3Config,
      });
    }
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}

function getTransformerScript() {
  const scriptPath = core.getInput('script-path');

  if (scriptPath) {
    const scriptResolvedPath = path.resolve(process.env.GITHUB_WORKSPACE!, scriptPath);

    if (!fs.existsSync(scriptResolvedPath)) {
      throw new Error(`Script not found: ${scriptResolvedPath}`);
    }

    const code = fs.readFileSync(scriptResolvedPath, 'utf8');
    // Create a sandbox environment for the script
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sandbox: Record<string, any> = {
      module: {},
      exports: {},
      fetch,
      console,
      TextEncoder,
      TextDecoder,
      JSON,
    };

    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { filename: scriptResolvedPath });

    // Find exported function
    const fn =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      sandbox.module.exports.default ??
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      sandbox.module.exports.run ??
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      sandbox.exports.default ??
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      sandbox.exports.run;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return fn;
  }
  return undefined;
}
