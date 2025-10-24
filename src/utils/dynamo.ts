import * as core from '@actions/core';
import { DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  type DynamoDBDocumentClient,
  ScanCommand,
  type ScanCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { getErrorMessage } from './errors.js';
import { chunk } from './nodash.js';
import type { DynamoData, DynamoTablePrimaryKey, TargetDynamoParameters } from './types.js';

export const scanTable = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  {
    attributes,
    maxNumberOfRecords,
    transformerFunction,
  }: {
    attributes?: string[];
    maxNumberOfRecords?: number;
    transformerFunction?: (data: DynamoData) => DynamoData;
  } = {},
) => {
  try {
    const dataHandler: (data: DynamoData) => DynamoData = transformerFunction
      ? (data) => transformerFunction(data)
      : (data) => data;

    core.info('Scanning: ' + tableName);
    let exclusiveLastKey: Record<string, string> | undefined = undefined;

    const data: DynamoData = [];

    const attributesInput: Pick<ScanCommandInput, 'ProjectionExpression' | 'ExpressionAttributeNames' | 'Limit'> = {
      Limit: maxNumberOfRecords,
    };

    if (attributes?.length) {
      attributesInput.ExpressionAttributeNames = {};
      attributesInput.ProjectionExpression = attributes
        .map((attr, i) => {
          attributesInput.ExpressionAttributeNames![`#attr${i}`] = attr;
          return `#attr${i}`;
        })
        .join(', ');
    }

    do {
      console.log('scanTable.DO');
      const input: ScanCommandInput = {
        TableName: tableName,
        ExclusiveStartKey: exclusiveLastKey,
        ...attributesInput,
      };
      const scanCommand = new ScanCommand(input);

      console.log('scanTable.SEND');
      const result = await client.send(scanCommand);

      if (!result.Items) throw new Error('Something has gone terribly wrong');
      console.log('scanTable.RESULT', JSON.stringify(result, null, 2));

      data.push(...dataHandler(result.Items));

      console.log('scanTable.PUSH');
      if (maxNumberOfRecords !== undefined && data.length >= maxNumberOfRecords)
        return data.slice(0, maxNumberOfRecords);

      exclusiveLastKey = result.LastEvaluatedKey;
      console.log('scanTable.EXCLUSIVE-LAST-KEY', exclusiveLastKey);
    } while (exclusiveLastKey);

    return data;
  } catch (error) {
    core.error('scanTable: ' + getErrorMessage(error));
    throw error;
  }
};

export const getTablePrimaryKey = async (
  client: DynamoDBDocumentClient,
  dynamoTableName: string,
  tablePrimaryKey?: TargetDynamoParameters['tablePrimaryKey'],
): Promise<DynamoTablePrimaryKey> => {
  if (tablePrimaryKey) return tablePrimaryKey;

  core.info('Running DescribeTableCommand on table: ' + dynamoTableName);
  const describeCommand = new DescribeTableCommand({
    TableName: dynamoTableName,
  });
  try {
    const describeResult = await client.send(describeCommand);

    if (!describeResult.Table) {
      throw new Error('Table attribute not defined');
    }

    const tablePK = describeResult.Table.KeySchema?.find((ks) => ks.KeyType === 'HASH')?.AttributeName;
    const tableSK = describeResult.Table.KeySchema?.find((ks) => ks.KeyType === 'RANGE')?.AttributeName;

    if (!tablePK) throw new Error('No PK found for table ' + dynamoTableName);

    return { pk: tablePK, sk: tableSK };
  } catch (err) {
    core.error('Error in DescribeTableCommand. ' + getErrorMessage(err));
    throw err;
  }
};

export const doPurgeTable = async (
  client: DynamoDBDocumentClient,
  dynamoTableName: string,
  tablePrimaryKey: DynamoTablePrimaryKey,
  data: DynamoData,
) => {
  const { pk: tablePK, sk: tableSK } = tablePrimaryKey;
  const scanResult = await scanTable(client, dynamoTableName, {
    attributes: [tablePK, tableSK].filter(Boolean) as string[],
  });

  const deletable = tableSK
    ? (record: DynamoData[number]) =>
        data.every((e) => !(e[tablePK] === record[tablePK] && e[tableSK] === record[tableSK]))
    : (record: DynamoData[number]) => data.every((e) => !(e[tablePK] === record[tablePK]));

  // only delete items that do not exist in data (PutRequest will overwrite these, no need to delete)
  const toDelete = scanResult.filter(deletable);

  core.info(`table.length=${scanResult.length}; toDelete.length=${toDelete.length}`);

  const batches = chunk(toDelete, 25);

  core.info('Deleting elements from table: ' + dynamoTableName);
  for (const [, batch] of batches.entries()) {
    try {
      const command = new BatchWriteCommand({
        RequestItems: {
          [dynamoTableName]: batch.map((item) => ({
            DeleteRequest: {
              Key: {
                [tablePK]: item[tablePK],
                ...(tableSK ? { [tableSK]: item[tableSK] } : {}),
              },
            },
          })),
        },
      });
      // TODO: handle UnprocessedItems
      await client.send(command);
    } catch (error) {
      const message = getErrorMessage(error);
      core.error('Failed purge of target table: ' + message);
      throw error;
    }
  }
};

export const populateTable = async (client: DynamoDBDocumentClient, dynamoTableName: string, data: DynamoData) => {
  const batches = chunk(data, 25);

  for (const batch of batches) {
    try {
      const command = new BatchWriteCommand({
        RequestItems: {
          [dynamoTableName]: batch.map((item) => ({
            PutRequest: {
              Item: item,
            },
          })),
        },
      });
      // TODO: handle UnprocessedItems
      await client.send(command);
    } catch (error) {
      core.error('populateTable: ' + getErrorMessage(error));
      throw error;
    }
  }
};
