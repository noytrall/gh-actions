import type { DynamoData, TargetDynamoParameters } from "./utils/type.js";
export default function ({ accessKeyId, region, secretAccessKey, dynamoTableName, sessionToken, purgeTable, tablePrimaryKey, data, }: Omit<TargetDynamoParameters, "type"> & {
    data: DynamoData;
}): Promise<void>;
