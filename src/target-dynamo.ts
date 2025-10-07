import * as core from "@actions/core";
import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { mapDynamoItemsToPkSk, scanTable } from "./utils/dynamo.js";
import { chunk } from "./utils/nodash.js";
import { resultFail, resultSuccess } from "./utils/result.js";
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

  const describeCommand = new DescribeTableCommand({
    TableName: tableName,
  });
  const describeResult = await client.send(describeCommand);

  core.info("describeResult: " + JSON.stringify(describeResult, null, 2));

  if (!describeResult.Table) {
    throw new Error(
      "Error in DescribeTableCommand. Table attribute not defined"
    );
  }

  const tablePK = describeResult.Table.KeySchema?.find(
    (ks) => ks.KeyType === "HASH"
  )?.AttributeName;
  const tableSK = describeResult.Table.KeySchema?.find(
    (ks) => ks.KeyType === "RANGE"
  )?.AttributeName;

  if (!tablePK) throw new Error("No PK found for table " + tableName);

  return { pk: tablePK, sk: tableSK };
};

const doPurgeTable = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  tablePrimaryKey: DynamoTablePrimaryKey
) => {
  const scanResult = await scanTable(client, tableName);

  if (!scanResult.success) return scanResult;

  const { pk: tablePK, sk: tableSK } = tablePrimaryKey;
  const batches = chunk(scanResult.value, 25);

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
    } catch (err) {
      core.info(
        `Failed purge of target table at ${index + 1}/${
          batches.length
        }: ${mapDynamoItemsToPkSk(batch, tablePK, tableSK).join(", ")}`
      );
      return resultFail(500, err);
    }
  }
};

const populateTable = async (client: DynamoDBDocumentClient) => {};

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

    core.info("DATA.length: " + data.length);
    const batches = chunk(data, 25);

    core.info("BATCHES.length: " + batches.length);

    for (const [index, batch] of batches.entries()) {
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
      } catch (err) {
        core.info(
          `Failed batchWrite of target table at ${index + 1}/${
            batches.length
          }: ${batch.join(", ")}`
        );
        return resultFail(500, err);
      }
    }
    return resultSuccess(null);
  } catch (err) {
    return resultFail("500", err);
  }
}
