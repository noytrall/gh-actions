import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  ScanCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { resultFail, resultSuccess } from "./utils/result";
import { scanTable } from "./utils/dynamo";

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
