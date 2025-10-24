import * as core from '@actions/core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { isUint8Array } from 'util/types';
import { doPurgeTable, getTablePrimaryKey, populateTable } from './utils/dynamo.js';
import { getErrorMessage } from './utils/errors.js';
import { isArrayOfRecords, isUint8ArrayStringifiedAndParsed } from './utils/nodash.js';
import type { AWSConfig, SourceData, TargetDynamoParameters } from './utils/types.js';

export async function targetDynamo(
  sourceData: SourceData,
  { accessKeyId, region, secretAccessKey, sessionToken }: AWSConfig,
  { dynamoTableName, purgeTable, tablePrimaryKey, maxNumberOfRecordsToInsert }: Omit<TargetDynamoParameters, 'type'>,
) {
  let data = sourceData;
  try {
    console.log('DATA', data);
    if (isUint8ArrayStringifiedAndParsed(data)) {
      core.info('IS Uint8Array Stringified and Parsed');
      data = new Uint8Array(Object.values(data));
    }
    if (isUint8Array(data)) {
      core.info('Data is Uint8Array');
      try {
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(data);
        console.log('jsonString :>> ', jsonString);

        data = JSON.parse(jsonString);
      } catch (error) {
        core.error('Failure converting s3 Uint8Array to json to insert data in dynamoTable');
        throw error;
      }
    }
    if (!isArrayOfRecords(data))
      throw new Error('Data to insert into dynamoDB table is malformed. Requires an array of records');

    const dynamodbClient = new DynamoDBClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken,
      },
    });
    const client = DynamoDBDocumentClient.from(dynamodbClient, {
      marshallOptions: { removeUndefinedValues: true },
    });

    const slicedData = data.slice(0, maxNumberOfRecordsToInsert);

    if (purgeTable) {
      core.info('Purging Table: ' + dynamoTableName);
      const definedPrimaryKey = await getTablePrimaryKey(client, dynamoTableName, tablePrimaryKey);

      core.info('definedPrimaryKey: ' + JSON.stringify(definedPrimaryKey, null, 2));

      await doPurgeTable(client, dynamoTableName, definedPrimaryKey, slicedData);
    }

    core.info('Populating table: ' + dynamoTableName);
    await populateTable(client, dynamoTableName, slicedData);
  } catch (error) {
    core.error('target-dynamo: ' + getErrorMessage(error));
    throw error;
  }
}
