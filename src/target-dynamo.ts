import * as core from "@actions/core";
import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { mapDynamoItemsToPkSk, scanTable } from "./utils/dynamo.js";
import { getErrorMessage } from "./utils/errors.js";
import { chunk } from "./utils/nodash.js";
import type {
  DynamoData,
  DynamoTablePrimaryKey,
  TargetDynamoParameters,
} from "./utils/type.js";

const getTablePrimaryKey = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  tablePrimaryKey: TargetDynamoParameters["tablePrimaryKey"]
): Promise<DynamoTablePrimaryKey> => {
  if (tablePrimaryKey) return tablePrimaryKey;

  core.info("Running DescribeTableCommand on table: " + tableName);
  const describeCommand = new DescribeTableCommand({
    TableName: tableName,
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

    if (!tablePK) throw new Error("No PK found for table " + tableName);

    return { pk: tablePK, sk: tableSK };
  } catch (err) {
    core.error("Error in DescribeTableCommand. " + getErrorMessage(err));
    throw err;
  }
};

const doPurgeTable = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  tablePrimaryKey: DynamoTablePrimaryKey
) => {
  const scanResult = await scanTable(client, tableName);

  const { pk: tablePK, sk: tableSK } = tablePrimaryKey;
  const batches = chunk(scanResult, 25);

  for (const [index, batch] of batches.entries()) {
    try {
      const command = new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map((item) => ({
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
  tableName: string,
  data: DynamoData
) => {
  const batches = chunk(data, 25);

  for (const batch of batches) {
    try {
      const command = new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map((item) => ({
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

export default async function ({
  accessKeyId,
  region,
  secretAccessKey,
  tableName,
  sessionToken,
  purgeTable,
  tablePrimaryKey,
  data,
}: {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  tableName: string;
  sessionToken: string;
  purgeTable?: boolean;
  tablePrimaryKey: TargetDynamoParameters["tablePrimaryKey"];
  data: DynamoData;
}) {
  try {
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
      core.info("Purging Table: " + tableName);
      const definedPrimaryKey = await getTablePrimaryKey(
        client,
        tableName,
        tablePrimaryKey
      );

      core.info(
        "definedPrimaryKey: " + JSON.stringify(definedPrimaryKey, null, 2)
      );

      await doPurgeTable(client, tableName, definedPrimaryKey);
    }

    await populateTable(client, tableName, data);
  } catch (error) {
    core.error("target-dynamo: " + getErrorMessage(error));
    throw error;
  }
}
