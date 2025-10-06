import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { resultFail } from "./utils/result.js";
import { scanTable } from "./utils/dynamo.js";

export default async function ({
  accessKeyId,
  region,
  secretAccessKey,
  sessionToken,
  tableName,
}: {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  tableName: string;
}) {
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

    return await scanTable(client, tableName);
  } catch (err) {
    return resultFail(
      "500",
      err instanceof Error ? err.message : (err as string)
    );
  }
}
