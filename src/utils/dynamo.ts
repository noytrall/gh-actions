import * as core from "@actions/core";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  type ScanCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { resultFail, resultSuccess } from "./result.js";

export const scanTable = async (
  client: DynamoDBDocumentClient,
  tableName: string
) => {
  try {
    let exclusiveLastKey: Record<string, string> | undefined = undefined;

    const data: Array<Record<string, unknown>> = [];

    do {
      const input: ScanCommandInput = {
        TableName: tableName,
        ExclusiveStartKey: exclusiveLastKey,
      };

      const scanCommand = new ScanCommand(input);

      const result = await client.send(scanCommand);

      if (!result.Items)
        return resultFail(500, "Something has gone terribly wrong");

      data.push(...result.Items);

      exclusiveLastKey = result.LastEvaluatedKey;
      core.info("LastEvaludatedKey: " + result.LastEvaluatedKey);
    } while (exclusiveLastKey);

    return resultSuccess(data);
  } catch (err) {
    return resultFail("500", err);
  }
};

export function mapDynamoItemsToPkSk(
  data: Array<Record<string, unknown>>,
  pk: string,
  sk?: string
) {
  const fn = sk
    ? (item: Record<string, unknown>) => ({ [pk]: item[pk], [sk]: item[sk] })
    : (item: Record<string, unknown>) => ({ [pk]: item[pk] });
  return data.map(fn);
}
