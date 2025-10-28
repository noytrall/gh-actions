import * as core from '@actions/core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'vm';
import { doPurgeTable, populateTable, scanTableIterator } from '../../utils/dynamo.js';
import { getErrorMessage } from '../../utils/errors.js';
import { configSchema, type AWSConfig, type Config } from '../../utils/types.js';

export default async function () {
  console.log('process.env.GITHUB_WORKSPACE! :>> ', process.env.GITHUB_WORKSPACE!);
  console.log('process.cwd()', process.cwd());

  try {
    const configPath = core.getInput('config-path', { required: true });
    const fullPath = path.resolve(process.env.GITHUB_WORKSPACE!, configPath);

    const config: Config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    const result = configSchema.safeParse(config);
    if (result.error) {
      core.error('parseResult: ' + JSON.stringify(result, null, 2));
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }

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

    const targetAwsConfig: AWSConfig = {
      region: targetAwsRegion,
      accessKeyId: targetAwsAccessKeyId,
      secretAccessKey: targetAwsSecretAccessKey,
      sessionToken: targetAwsSessionToken,
    };
    const targetDynamodbClient = createDynamoDocumentClient(targetAwsConfig);

    if (config.target.purgeTable) {
      await doPurgeTable(targetDynamodbClient, config.target.dynamoTableName);
    }

    const sourceAwsConfig: AWSConfig = {
      region: sourceAwsRegion,
      accessKeyId: sourceAwsAccessKeyId,
      secretAccessKey: sourceAwsSecretAccessKey,
      sessionToken: sourceAwsSessionToken,
    };
    const sourceDynamodbClient = createDynamoDocumentClient(sourceAwsConfig);

    const transformerFunction = getTransformerScript();

    let maxNumberOfItems = config.maxNumberOfItems;

    for await (const items of scanTableIterator(sourceDynamodbClient, config.source.dynamoTableName)) {
      let transformedData = transformerFunction?.(items) ?? items;

      if (maxNumberOfItems !== undefined) {
        transformedData = transformedData.slice(0, maxNumberOfItems);
        maxNumberOfItems -= transformedData.length;
      }

      await populateTable(targetDynamodbClient, config.target.dynamoTableName, transformedData);

      if (maxNumberOfItems !== undefined && maxNumberOfItems <= 0) break;
    }
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}

const createDynamoDocumentClient = ({ accessKeyId, region, secretAccessKey, sessionToken }: AWSConfig) => {
  return DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken,
      },
    }),
    {
      marshallOptions: { removeUndefinedValues: true },
    },
  );
};

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
      TextEncoder: TextEncoder,
      TextDecoder: TextDecoder,
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
    return fn as (data: Record<string, unknown>[]) => Record<string, unknown>[];
  }
  return undefined;
}
