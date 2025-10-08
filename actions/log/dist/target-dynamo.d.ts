import type { DynamoData, TargetDynamoParameters } from "./utils/type.js";
export default function (data: DynamoData, { accessKeyId, region, secretAccessKey, dynamoTableName, sessionToken, purgeTable, tablePrimaryKey, }: Omit<TargetDynamoParameters, "type">): Promise<void>;
