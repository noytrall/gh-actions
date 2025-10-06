import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { resultFail, resultSuccess } from "./utils/result.js";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { mapDynamoItemsToPkSk, scanTable } from "./utils/dynamo.js";
import { chunk } from "./utils/nodash.js";

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
    if (purgeTable && tablePK) {
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
          console.log(
            `Failed purge of target table at ${index + 1}/${
              batches.length
            }: ${mapDynamoItemsToPkSk(batch, tablePK, tableSK).join(", ")}`
          );
          return resultFail(500, err);
        }
      }
    }

    console.log("DATA.length", data.length);
    const batches = chunk(data, 25);

    console.log("BATCHES.length", batches.length);

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
        console.log(
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
