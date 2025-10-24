import * as core from '@actions/core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { scanTable } from './utils/dynamo.js';
import { getErrorMessage } from './utils/errors.js';
import type { AWSConfig, BaseDynamoParameters, DynamoData } from './utils/types.js';

export async function sourceDynamo(
  { accessKeyId, region, secretAccessKey, sessionToken }: AWSConfig,
  { dynamoTableName }: Omit<BaseDynamoParameters, 'type'>,
  {
    transformerFunction,
    maxNumberOfRecords,
  }: { transformerFunction?: (data: DynamoData) => DynamoData; maxNumberOfRecords?: number } = {},
) {
  try {
    const dynamodbClient = new DynamoDBClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken: sessionToken,
      },
    });
    const client = DynamoDBDocumentClient.from(dynamodbClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
    const result = await scanTable(client, dynamoTableName, { transformerFunction, maxNumberOfRecords });
    return result;
  } catch (error) {
    core.error('source-dynamo: ' + getErrorMessage(error));
    throw error;
  }
}
