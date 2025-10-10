import * as core from "@actions/core";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  type ScanCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { getErrorMessage } from "./errors.js";
import type { DynamoData } from "./types.js";

export const scanTable = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  attributes?: string[]
) => {
  try {
    core.info("Scanning: " + tableName);
    let exclusiveLastKey: Record<string, string> | undefined = undefined;

    const data: DynamoData = [];

    const attributesInput: Pick<
      ScanCommandInput,
      "ProjectionExpression" | "ExpressionAttributeNames"
    > = {};

    if (attributes?.length) {
      attributesInput.ExpressionAttributeNames = {};
      attributesInput.ProjectionExpression = attributes
        .map((attr, i) => {
          attributesInput.ExpressionAttributeNames![`#attr${i}`] = attr;
          return `#attr${i}`;
        })
        .join(", ");
    }

    do {
      const input: ScanCommandInput = {
        TableName: tableName,
        ExclusiveStartKey: exclusiveLastKey,
        ...attributesInput,
      };

      const scanCommand = new ScanCommand(input);

      const result = await client.send(scanCommand);

      if (!result.Items) throw new Error("Something has gone terribly wrong");

      data.push(...result.Items);

      exclusiveLastKey = result.LastEvaluatedKey;
    } while (exclusiveLastKey);

    return data;
  } catch (error) {
    core.error("scanTable: " + getErrorMessage(error));
    throw error;
  }
};
