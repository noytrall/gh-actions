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

export async function* scanTableIterator(
  client: DynamoDBDocumentClient,
  tableName: string,
  inputProps?: Omit<ScanCommandInput, 'TableName' | 'ExclusiveStartKey'>,
) {
  let lastKey: Record<string, string> | undefined = undefined;

  try {
    do {
      const input: ScanCommandInput = {
        TableName: tableName,
        ExclusiveStartKey: lastKey,
        ...inputProps,
      };
      const command = new ScanCommand(input);

      const result = await client.send(command);

      yield result.Items ?? [];

      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return;
  } catch (error) {
    core.error('scanTableIterator: ' + getErrorMessage(error));
    throw error;
  }
}

export const getTablePrimaryKey = async (
  client: DynamoDBDocumentClient,
  dynamoTableName: string,
): Promise<{ pk: string; sk: string | undefined }> => {
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
    core.error('getTablePrimaryKey. ' + getErrorMessage(err));
    throw err;
  }
};

export const populateTable = async (
  client: DynamoDBDocumentClient,
  dynamoTableName: string,
  data: Record<string, unknown>[],
) => {
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
