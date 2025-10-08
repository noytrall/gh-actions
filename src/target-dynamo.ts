import * as core from "@actions/core";
import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { isUint8Array } from "util/types";
import { scanTable } from "./utils/dynamo.js";
import { getErrorMessage } from "./utils/errors.js";
import { chunk, isArrayOfRecords } from "./utils/nodash.js";
import type {
  AWSConfig,
  DynamoData,
  DynamoTablePrimaryKey,
  SourceData,
  SourceType,
  TargetDynamoParameters,
} from "./utils/type.js";

const getTablePrimaryKey = async (
  client: DynamoDBDocumentClient,
  dynamoTableName: string,
  tablePrimaryKey: TargetDynamoParameters["tablePrimaryKey"]
): Promise<DynamoTablePrimaryKey> => {
  if (tablePrimaryKey) return tablePrimaryKey;

  core.info("Running DescribeTableCommand on table: " + dynamoTableName);
  const describeCommand = new DescribeTableCommand({
    TableName: dynamoTableName,
  });
  try {
    const describeResult = await client.send(describeCommand);

    if (!describeResult.Table) {
      throw new Error("Table attribute not defined");
    }

    const tablePK = describeResult.Table.KeySchema?.find(
      (ks) => ks.KeyType === "HASH"
    )?.AttributeName;
    const tableSK = describeResult.Table.KeySchema?.find(
      (ks) => ks.KeyType === "RANGE"
    )?.AttributeName;

    if (!tablePK) throw new Error("No PK found for table " + dynamoTableName);

    return { pk: tablePK, sk: tableSK };
  } catch (err) {
    core.error("Error in DescribeTableCommand. " + getErrorMessage(err));
    throw err;
  }
};

const doPurgeTable = async (
  client: DynamoDBDocumentClient,
  dynamoTableName: string,
  tablePrimaryKey: DynamoTablePrimaryKey
) => {
  const scanResult = await scanTable(client, dynamoTableName);

  const { pk: tablePK, sk: tableSK } = tablePrimaryKey;
  const batches = chunk(scanResult, 25);

  core.info("Deleting elements from table: " + dynamoTableName);
  for (const [index, batch] of batches.entries()) {
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
      core.error(
        `Failed purge of target table at ${index + 1}/${
          batches.length
        }: ${message};${
          message === "The provided key element does not match the schema"
            ? ` key provided: ${JSON.stringify({
                pk: tablePK,
                ...(tableSK ? { sk: tableSK } : {}),
              })}`
            : ""
        }`
      );
      throw error;
    }
  }
};

const populateTable = async (
  client: DynamoDBDocumentClient,
  dynamoTableName: string,
  data: DynamoData
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
      core.error("populateTable: " + getErrorMessage(error));
      throw error;
    }
  }
};

export default async function (
  sourceData: SourceData,
  sourceType: SourceType,
  { accessKeyId, region, secretAccessKey, sessionToken }: AWSConfig,
  {
    dynamoTableName,
    purgeTable,
    tablePrimaryKey,
  }: Omit<TargetDynamoParameters, "type">
) {
  let data = sourceData;
  try {
    if (sourceType === "s3" && isUint8Array(data)) {
      try {
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(data);

        data = JSON.parse(jsonString);
      } catch (error) {
        core.error(
          "Failure converting s3 Uint8Array to json to insert data in dynamoTable"
        );
        throw error;
      }
    }
    if (
      !isArrayOfRecords(
        data,
        // If source of data is "dynamo", than data is already an array of records, unless it has been altered by some middleware (functionality yet to be implemented)
        sourceType === "dynamo" || undefined
      )
    )
      throw new Error(
        "Data to insert into dynamoDB table is malformed. Requires an array of records"
      );

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

    // TODO: only delete items that do not exist in data (PutRequest will overwrite these, no need to delete)
    if (purgeTable) {
      core.info("Purging Table: " + dynamoTableName);
      const definedPrimaryKey = await getTablePrimaryKey(
        client,
        dynamoTableName,
        tablePrimaryKey
      );

      core.info(
        "definedPrimaryKey: " + JSON.stringify(definedPrimaryKey, null, 2)
      );

      await doPurgeTable(client, dynamoTableName, definedPrimaryKey);
    }

    core.info("Populating table: " + dynamoTableName);
    await populateTable(client, dynamoTableName, data);
  } catch (error) {
    core.error("target-dynamo: " + getErrorMessage(error));
    throw error;
  }
}
