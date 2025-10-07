import * as core from "@actions/core";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { scanTable } from "./utils/dynamo.js";
import { getErrorMessage } from "./utils/errors.js";
import type { BaseDynamoParameters } from "./utils/type.js";

export default async function ({
  accessKeyId,
  region,
  secretAccessKey,
  sessionToken,
  dynamoTableName,
}: Omit<BaseDynamoParameters, "type">) {
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

    return await scanTable(client, dynamoTableName);
  } catch (error) {
    core.error("source-dynamo: " + getErrorMessage(error));
    throw error;
  }
}
