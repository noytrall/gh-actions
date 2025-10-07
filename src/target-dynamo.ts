import * as core from "@actions/core";
import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { mapDynamoItemsToPkSk, scanTable } from "./utils/dynamo.js";
import { chunk, isString } from "./utils/nodash.js";
import { resultFail, resultSuccess } from "./utils/result.js";

export default async function ({
  accessKeyId,
  region,
  secretAccessKey,
  tableName,
  sessionToken,
  purgeTable,
  tablePK,
  tableSK,
  data,
}: {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  tableName: string;
  sessionToken: string;
  purgeTable?: boolean;
  tablePK?: string;
  tableSK?: string;
  data: Array<Record<string, unknown>>;
}) {
  let _tablePK = tablePK;
  let _tableSK = tableSK;

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
      if (!_tablePK) {
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

        _tablePK = describeResult.Table.KeySchema?.find(
          (ks) => ks.KeyType === "HASH"
        )?.AttributeName;
        _tableSK = describeResult.Table.KeySchema?.find(
          (ks) => ks.KeyType === "RANGE"
        )?.AttributeName;
      }

      if (!isString(_tablePK)) {
        throw new Error(
          `PK for table ${tableName} not found. Either pass it in the configuration file, or find out why the describeTableCommand failed`
        );
      }

      const scanResult = await scanTable(client, tableName);

      if (!scanResult.success) return scanResult;

      const batches = chunk(scanResult.value, 25);

      for (const [index, batch] of batches.entries()) {
        try {
          const command = new BatchWriteCommand({
            RequestItems: {
              [tableName]: batch.map((item) => ({
                DeleteRequest: {
                  Key: {
                    [_tablePK as string]: item[_tablePK as string],
                    ...(_tableSK ? { [_tableSK]: item[_tableSK] } : {}),
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
            }: ${mapDynamoItemsToPkSk(batch, _tablePK, _tableSK).join(", ")}`
          );
          return resultFail(500, err);
        }
      }
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
          }: ${(tablePK
            ? mapDynamoItemsToPkSk(batch, tablePK, tableSK)
            : batch
          ).join(", ")}`
        );
        return resultFail(500, err);
      }
    }
    return resultSuccess(null);
  } catch (err) {
    return resultFail("500", err);
  }
}
